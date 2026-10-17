import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Branch, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable, type Column } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'

interface DailyLedgerRow {
  employee_id: number
  employee_name: string
  employee_code: string | null
  job_title: string | null
  payout_method: string
  payout_detail: string | null
  attendance_id: number | null
  date: string
  status: string
  check_in: string | null
  check_out: string | null
  daily_loan: number
  daily_bonus: number
  daily_deduction: number
  deduction_reason: string | null
  notes: string | null
}

interface MonthlySummaryRow {
  employee_id: number
  employee_name: string
  employee_code: string | null
  job_title: string | null
  basic_salary: number
  daily_rate: number
  working_days: number
  leave_days: number
  absent_days: number
  daily_loan_total: number
  daily_bonus_total: number
  daily_deduction_total: number
  earned_salary: number
  allowances: Array<{ description: string; calculated_amount: number }>
  deductions: Array<{ description: string; calculated_amount: number }>
  final_total: number
  payout_method: string
  payout_detail: string | null
}

const inputClass = 'w-full rounded-lg border border-outline-variant px-3 py-2 text-sm focus:outline-none focus:border-primary bg-surface-container-lowest text-right'

export function HrmReportsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily')
  const [toast, setToast] = useState('')
  const [errorText, setErrorErrorText] = useState('')

  // Filter States
  const [branchFilter, setBranchFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Tab 1: Daily Ledger States
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  // Tab 2: Monthly Summary States
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date()
    // Default to previous month 21st to current month 20th
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 21)
    return prev.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date()
    const curr = new Date(today.getFullYear(), today.getMonth(), 20)
    return curr.toISOString().split('T')[0]
  })

  // Modals
  const [editLedgerOpen, setEditLedgerOpen] = useState(false)
  const [generatePayrollOpen, setGeneratePayrollOpen] = useState(false)

  // Edit Ledger Form State
  const [ledgerForm, setLedgerForm] = useState({
    employee_id: 0,
    employee_name: '',
    date: '',
    status: 'present',
    check_in: '',
    check_out: '',
    daily_loan: '0',
    daily_bonus: '0',
    daily_deduction: '0',
    deduction_reason: '',
    notes: '',
    payout_method: 'cash',
    payout_detail: '',
  })

  // Generate Payroll Form State
  const [payrollForm, setPayrollForm] = useState({
    name: '',
    branch_id: '',
  })

  // Queries
  const branchesQuery = useQuery({
    queryKey: ['branches', 'reports-page'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const dailyLedgerQuery = useQuery({
    queryKey: ['hrm', 'reports', 'daily-ledger', selectedDate, branchFilter],
    queryFn: async () => {
      const { data } = await api.get<DailyLedgerRow[]>('/hrm/reports/daily-ledger', {
        params: {
          date: selectedDate,
          branch_id: branchFilter || undefined,
        },
      })
      return data
    },
    enabled: activeTab === 'daily',
  })

  const monthlySummaryQuery = useQuery({
    queryKey: ['hrm', 'reports', 'monthly-summary', startDate, endDate, branchFilter],
    queryFn: async () => {
      const { data } = await api.get<{ data: MonthlySummaryRow[] }>('/hrm/reports/monthly-summary', {
        params: {
          start_date: startDate,
          end_date: endDate,
          branch_id: branchFilter || undefined,
        },
      })
      return data.data
    },
    enabled: activeTab === 'monthly',
  })

  // Mutations
  const upsertLedgerMutation = useMutation({
    mutationFn: async (payload: typeof ledgerForm) => {
      const { data } = await api.post('/hrm/reports/daily-ledger/upsert', {
        employee_id: payload.employee_id,
        date: payload.date,
        status: payload.status,
        check_in: payload.check_in || null,
        check_out: payload.check_out || null,
        daily_loan: Number(payload.daily_loan),
        daily_bonus: Number(payload.daily_bonus),
        daily_deduction: Number(payload.daily_deduction),
        deduction_reason: payload.deduction_reason || null,
        notes: payload.notes || null,
        payout_method: payload.payout_method,
        payout_detail: payload.payout_detail || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'reports'] })
      setEditLedgerOpen(false)
      setToast('تم حفظ حركة الحضور والبيانات المالية بنجاح')
      setErrorErrorText('')
    },
    onError: (err) => {
      setErrorErrorText(getErrorMessage(err))
    },
  })

  const generatePayrollMutation = useMutation({
    mutationFn: async (payload: { name: string; start_date: string; end_date: string; branch_id?: number | null }) => {
      const { data } = await api.post('/hrm/reports/generate-payroll-group', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] })
      setGeneratePayrollOpen(false)
      setToast('تم توليد وحفظ مسير الرواتب المعتمد بنجاح')
      setErrorErrorText('')
      // Redirect to payroll groups
      window.location.hash = '#/hrm/payroll-groups'
    },
    onError: (err) => {
      setErrorErrorText(getErrorMessage(err))
    },
  })

  // Computations & Search filtering
  const filteredDailyLedger = useMemo(() => {
    const list = dailyLedgerQuery.data ?? []
    if (!searchQuery) return list
    return list.filter(
      (row) =>
        row.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.employee_code?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [dailyLedgerQuery.data, searchQuery])

  const filteredMonthlySummary = useMemo(() => {
    const list = monthlySummaryQuery.data ?? []
    if (!searchQuery) return list
    return list.filter(
      (row) =>
        row.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.employee_code?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [monthlySummaryQuery.data, searchQuery])

  // Daily Totals Summary
  const dailyTotals = useMemo(() => {
    const list = dailyLedgerQuery.data ?? []
    let present = 0
    let absent = 0
    let leave = 0
    let totalLoans = 0
    let totalBonuses = 0
    let totalDeductions = 0

    list.forEach((row) => {
      if (row.status === 'present' || row.status === 'late') present++
      else if (row.status === 'absent') absent++
      else if (row.status === 'leave') leave++

      totalLoans += Number(row.daily_loan || 0)
      totalBonuses += Number(row.daily_bonus || 0)
      totalDeductions += Number(row.daily_deduction || 0)
    })

    return { present, absent, leave, totalLoans, totalBonuses, totalDeductions }
  }, [dailyLedgerQuery.data])

  // Monthly Totals Summary
  const monthlyTotals = useMemo(() => {
    const list = monthlySummaryQuery.data ?? []
    let totalBasic = 0
    let totalEarned = 0
    let totalDailyLoans = 0
    let totalDailyBonuses = 0
    let totalDailyDeductions = 0
    let totalNet = 0

    list.forEach((row) => {
      totalBasic += Number(row.basic_salary || 0)
      totalEarned += Number(row.earned_salary || 0)
      totalDailyLoans += Number(row.daily_loan_total || 0)
      totalDailyBonuses += Number(row.daily_bonus_total || 0)
      totalDailyDeductions += Number(row.daily_deduction_total || 0)
      totalNet += Number(row.final_total || 0)
    })

    return { totalBasic, totalEarned, totalDailyLoans, totalDailyBonuses, totalDailyDeductions, totalNet }
  }, [monthlySummaryQuery.data])

  // Export to CSV Function
  const handleExportCSV = () => {
    const list = monthlySummaryQuery.data ?? []
    if (list.length === 0) return

    const headers = [
      'كود الموظف',
      'اسم الموظف',
      'الوظيفة',
      'طريقة الدفع',
      'بيانات الدفع',
      'الراتب الأساسي',
      'أجر اليوم الافتراضي',
      'أيام الحضور',
      'أيام الإجازة',
      'أيام الغياب',
      'الراتب المستحق الفعلي',
      'إجمالي السلف اليومية',
      'إجمالي البونص اليومي',
      'إجمالي الخصومات اليومية',
      'الصافي المستحق',
    ]

    const csvRows = [
      '\uFEFF' + headers.join(','), // Include UTF-8 BOM
      ...list.map((row) => {
        const payoutMethodLabel =
          row.payout_method === 'wallet'
            ? 'محفظة إلكترونية'
            : row.payout_method === 'bank'
            ? 'تحويل بنكي'
            : row.payout_method === 'cash'
            ? 'كاش'
            : row.payout_method

        return [
          `"${row.employee_code || ''}"`,
          `"${row.employee_name}"`,
          `"${row.job_title || ''}"`,
          `"${payoutMethodLabel}"`,
          `"${row.payout_detail || ''}"`,
          row.basic_salary,
          row.daily_rate,
          row.working_days,
          row.leave_days,
          row.absent_days,
          row.earned_salary,
          row.daily_loan_total,
          row.daily_bonus_total,
          row.daily_deduction_total,
          row.final_total,
        ].join(',')
      }),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `التقرير_المالي_للرواتب_${startDate}_إلى_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print PDF Function
  const handlePrint = () => {
    window.print()
  }

  const handleEditClick = (row: DailyLedgerRow) => {
    setLedgerForm({
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      date: row.date,
      status: row.status,
      check_in: row.check_in || '',
      check_out: row.check_out || '',
      daily_loan: String(row.daily_loan || 0),
      daily_bonus: String(row.daily_bonus || 0),
      daily_deduction: String(row.daily_deduction || 0),
      deduction_reason: row.deduction_reason || '',
      notes: row.notes || '',
      payout_method: row.payout_method || 'cash',
      payout_detail: row.payout_detail || '',
    })
    setEditLedgerOpen(true)
  }

  // DataTable typed columns for Daily Ledger
  const dailyColumns: Column<DailyLedgerRow>[] = [
    {
      key: 'employee_code',
      header: 'كود الموظف',
      render: (row) => <span className="font-mono text-xs">{row.employee_code || '—'}</span>,
    },
    {
      key: 'employee_name',
      header: 'الاسم',
      render: (row) => <span className="font-bold text-sm">{row.employee_name}</span>,
    },
    {
      key: 'job_title',
      header: 'الوظيفة',
      render: (row) => <span className="text-xs text-on-surface-variant">{row.job_title || '—'}</span>,
    },
    {
      key: 'payout_method',
      header: 'طريقة الدفع والبيانات',
      render: (row) => (
        <div className="flex flex-col gap-0.5 text-xs text-right">
          <span className="font-medium text-primary">
            {row.payout_method === 'wallet'
              ? 'محفظة إلكترونية'
              : row.payout_method === 'bank'
              ? 'تحويل بنكي'
              : row.payout_method === 'cash'
              ? 'كاش'
              : 'أخرى'}
          </span>
          {row.payout_detail && (
            <span className="text-on-surface-variant font-mono">{row.payout_detail}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (row) => {
        const labels: Record<string, string> = {
          present: 'حاضر',
          absent: 'غائب',
          leave: 'إجازة',
          late: 'متأخر',
        }
        const classes: Record<string, string> = {
          present: 'bg-success-container text-on-success-container',
          absent: 'bg-error-container text-on-error-container',
          leave: 'bg-primary-container text-on-primary-container',
          late: 'bg-warning-container text-on-warning-container',
        }
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${classes[row.status] || 'bg-surface-container text-on-surface'}`}>
            {labels[row.status] || row.status}
          </span>
        )
      },
    },
    {
      key: 'check_in',
      header: 'الحضور / الانصراف',
      render: (row) => (
        <div className="flex flex-col text-xs font-mono text-on-surface-variant">
          <span>ح: {row.check_in ? row.check_in.substring(0, 5) : '—'}</span>
          <span>ص: {row.check_out ? row.check_out.substring(0, 5) : '—'}</span>
        </div>
      ),
    },
    {
      key: 'daily_loan',
      header: 'السلفة اليومية',
      render: (row) =>
        row.daily_loan > 0 ? (
          <span className="font-bold text-error text-sm">{row.daily_loan} ج.م</span>
        ) : (
          <span className="text-xs text-outline">—</span>
        ),
    },
    {
      key: 'daily_bonus',
      header: 'البونص اليومي',
      render: (row) =>
        row.daily_bonus > 0 ? (
          <span className="font-bold text-success text-sm">{row.daily_bonus} ج.م</span>
        ) : (
          <span className="text-xs text-outline">—</span>
        ),
    },
    {
      key: 'daily_deduction',
      header: 'الخصم اليومي والسبب',
      render: (row) => (
        <div className="flex flex-col">
          {row.daily_deduction > 0 ? (
            <span className="font-bold text-error text-sm">{row.daily_deduction} ج.م</span>
          ) : (
            <span className="text-xs text-outline">—</span>
          )}
          {row.deduction_reason && (
            <span className="text-[10px] text-on-surface-variant mt-0.5 max-w-[120px] truncate" title={row.deduction_reason}>
              {row.deduction_reason}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'notes',
      header: 'ملاحظات',
      render: (row) => <span className="text-xs text-on-surface-variant max-w-[100px] truncate block text-right" title={row.notes || ''}>{row.notes || '—'}</span>,
    },
    {
      key: 'employee_id',
      header: 'الإجراءات',
      render: (row) => (
        <button
          onClick={() => handleEditClick(row)}
          className="flex items-center gap-1 text-primary hover:bg-primary/5 px-2 py-1 rounded border border-primary text-xs font-bold transition-all ml-auto"
        >
          <Icon name="edit" size={14} />
          <span>تسجيل / تعديل</span>
        </button>
      ),
    },
  ]

  // DataTable typed columns for Monthly Summary
  const monthlyColumns: Column<MonthlySummaryRow>[] = [
    {
      key: 'employee_code',
      header: 'كود الموظف',
      render: (row) => <span className="font-mono text-xs">{row.employee_code || '—'}</span>,
    },
    {
      key: 'employee_name',
      header: 'الاسم والوظيفة',
      render: (row) => (
        <div className="flex flex-col text-right">
          <span className="font-bold text-sm">{row.employee_name}</span>
          <span className="text-[10px] text-on-surface-variant">{row.job_title || '—'}</span>
        </div>
      ),
    },
    {
      key: 'payout_method',
      header: 'طريقة الدفع ورقمه',
      render: (row) => (
        <div className="flex flex-col text-xs text-right">
          <span className="font-medium text-primary">
            {row.payout_method === 'wallet'
              ? 'محفظة إلكترونية'
              : row.payout_method === 'bank'
              ? 'تحويل بنكي'
              : row.payout_method === 'cash'
              ? 'كاش'
              : 'أخرى'}
          </span>
          {row.payout_detail && (
            <span className="text-on-surface-variant font-mono text-[11px]">{row.payout_detail}</span>
          )}
        </div>
      ),
    },
    {
      key: 'basic_salary',
      header: 'الأساسي / اليومي',
      render: (row) => (
        <div className="flex flex-col text-xs font-mono text-right">
          <span>أساسي: {row.basic_salary}</span>
          <span className="text-on-surface-variant text-[11px]">يومي: {row.daily_rate}</span>
        </div>
      ),
    },
    {
      key: 'working_days',
      header: 'أيام عمل / إجازة',
      render: (row) => (
        <div className="flex flex-col text-xs font-medium text-center">
          <span className="text-success">عمل: {row.working_days}</span>
          <span className="text-primary">إجازة: {row.leave_days}</span>
          <span className="text-error">غياب: {row.absent_days}</span>
        </div>
      ),
    },
    {
      key: 'earned_salary',
      header: 'المستحق الفعلي',
      render: (row) => <span className="font-bold text-sm text-primary">{row.earned_salary} ج.م</span>,
    },
    {
      key: 'daily_loan_total',
      header: 'سلف تراكمية',
      render: (row) =>
        row.daily_loan_total > 0 ? (
          <span className="font-bold text-error text-sm">{row.daily_loan_total} ج.م</span>
        ) : (
          <span className="text-xs text-outline">—</span>
        ),
    },
    {
      key: 'daily_bonus_total',
      header: 'بونص تراكمي',
      render: (row) =>
        row.daily_bonus_total > 0 ? (
          <span className="font-bold text-success text-sm">{row.daily_bonus_total} ج.م</span>
        ) : (
          <span className="text-xs text-outline">—</span>
        ),
    },
    {
      key: 'daily_deduction_total',
      header: 'خصومات تراكمية',
      render: (row) =>
        row.daily_deduction_total > 0 ? (
          <span className="font-bold text-error text-sm">{row.daily_deduction_total} ج.م</span>
        ) : (
          <span className="text-xs text-outline">—</span>
        ),
    },
    {
      key: 'final_total',
      header: 'الصافي المستحق',
      render: (row) => <span className="font-black text-sm text-success">{row.final_total} ج.م</span>,
    },
  ]

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="التقارير والبيانات المالية للموظفين"
        subtitle="دفاتر الحضور والانصراف والمسيرات المالية والرواتب المعتمدة"
      />

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}
      {errorText && (
        <div className="bg-error-container text-on-error-container p-3 rounded-lg flex justify-between items-center text-sm">
          <span>{errorText}</span>
          <button onClick={() => setErrorErrorText('')} className="font-bold">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-outline-variant no-print">
        <button
          onClick={() => {
            setActiveTab('daily')
            setErrorErrorText('')
          }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'daily'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant'
          }`}
        >
          تقرير الحركة والمالية اليومي (دفتر اليومية)
        </button>
        <button
          onClick={() => {
            setActiveTab('monthly')
            setErrorErrorText('')
          }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'monthly'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant'
          }`}
        >
          التقرير المالي الشهري للرواتب (مسير الخلاصة)
        </button>
      </div>

      {/* Main Filter Bar */}
      <div className="bg-surface-container p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between no-print">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Branch Filter */}
          <div className="flex flex-col gap-1 text-right">
            <span className="text-xs text-on-surface-variant font-medium">الفرع</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm bg-surface-container-lowest focus:outline-none"
            >
              <option value="">كل الفروع</option>
              {branchesQuery.data?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name_ar || branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="flex flex-col gap-1 text-right">
            <span className="text-xs text-on-surface-variant font-medium">بحث باسم أو كود الموظف</span>
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث هنا..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-outline-variant pl-8 pr-3 py-1.5 text-sm bg-surface-container-lowest focus:outline-none w-64 text-right"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <Icon name="search" size={16} />
              </span>
            </div>
          </div>

          {/* Date Picker Tab 1 */}
          {activeTab === 'daily' && (
            <div className="flex flex-col gap-1 text-right">
              <span className="text-xs text-on-surface-variant font-medium">التاريخ اليومي</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm bg-surface-container-lowest focus:outline-none text-right"
              />
            </div>
          )}

          {/* Date Range Picker Tab 2 */}
          {activeTab === 'monthly' && (
            <>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-xs text-on-surface-variant font-medium">من تاريخ</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm bg-surface-container-lowest focus:outline-none text-right"
                />
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-xs text-on-surface-variant font-medium">إلى تاريخ</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm bg-surface-container-lowest focus:outline-none text-right"
                />
              </div>
            </>
          )}
        </div>

        {/* Action Buttons Tab 2 */}
        {activeTab === 'monthly' && (
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredMonthlySummary.length === 0}
              className="flex items-center gap-1 bg-secondary text-on-secondary px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Icon name="download" size={16} />
              <span>تصدير إكسيل</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={filteredMonthlySummary.length === 0}
              className="flex items-center gap-1 bg-outline-variant text-on-surface px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Icon name="print" size={16} />
              <span>طباعة التقرير</span>
            </button>
            <button
              onClick={() => {
                setPayrollForm({
                  name: `مسير رواتب الموظفين من ${startDate} إلى ${endDate}`,
                  branch_id: branchFilter || '',
                })
                setGeneratePayrollOpen(true)
              }}
              disabled={filteredMonthlySummary.length === 0}
              className="flex items-center gap-1 bg-primary text-on-primary px-3 py-2 rounded-lg text-sm font-medium hover:opacity-95 transition-all disabled:opacity-50"
            >
              <Icon name="folder_shared" size={16} />
              <span>توليد مسير رواتب معتمد</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab 1 content: Daily Ledger */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Daily Summary Stats Card */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 no-print">
            <div className="bg-surface-container p-3 rounded-xl flex flex-col justify-center text-right">
              <span className="text-xs text-on-surface-variant font-medium">المتواجدون اليوم</span>
              <span className="text-xl font-bold text-success mt-1">{dailyTotals.present}</span>
            </div>
            <div className="bg-surface-container p-3 rounded-xl flex flex-col justify-center text-right">
              <span className="text-xs text-on-surface-variant font-medium">الغائبون</span>
              <span className="text-xl font-bold text-error mt-1">{dailyTotals.absent}</span>
            </div>
            <div className="bg-surface-container p-3 rounded-xl flex flex-col justify-center text-right">
              <span className="text-xs text-on-surface-variant font-medium">الإجازات</span>
              <span className="text-xl font-bold text-primary mt-1">{dailyTotals.leave}</span>
            </div>
            <div className="bg-surface-container p-3 rounded-xl flex flex-col justify-center text-right">
              <span className="text-xs text-on-surface-variant font-medium">إجمالي السلف اليومية</span>
              <span className="text-xl font-bold text-error mt-1">{dailyTotals.totalLoans.toLocaleString()} ج.م</span>
            </div>
            <div className="bg-surface-container p-3 rounded-xl flex flex-col justify-center text-right">
              <span className="text-xs text-on-surface-variant font-medium">إجمالي البونص</span>
              <span className="text-xl font-bold text-success mt-1">{dailyTotals.totalBonuses.toLocaleString()} ج.م</span>
            </div>
            <div className="bg-surface-container p-3 rounded-xl flex flex-col justify-center text-right">
              <span className="text-xs text-on-surface-variant font-medium">إجمالي الخصومات اليومية</span>
              <span className="text-xl font-bold text-error mt-1">{dailyTotals.totalDeductions.toLocaleString()} ج.م</span>
            </div>
          </div>

          <AsyncState
            isLoading={dailyLedgerQuery.isLoading}
            isError={dailyLedgerQuery.isError}
            error={dailyLedgerQuery.error}
          >
            <DataTable<DailyLedgerRow>
              columns={dailyColumns}
              data={filteredDailyLedger}
              keyExtractor={(row) => row.employee_id}
              emptyMessage="لا يوجد حركات مسجلة لهذا التاريخ اليومي"
            />
          </AsyncState>
        </div>
      )}

      {/* Tab 2 content: Monthly Summary */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          {/* Print Only Header (hidden in screen) */}
          <div className="only-print text-center space-y-2 pb-4 border-b border-outline-variant">
            <h1 className="text-2xl font-bold">تقرير الرواتب ومسير المستحقات الشهرية</h1>
            <p className="text-sm text-on-surface-variant">
              الفترة من: {startDate} إلى: {endDate}
            </p>
          </div>

          {/* Monthly Summary Stats Card */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-surface-container p-3 rounded-xl flex flex-col justify-center text-right">
              <span className="text-xs text-on-surface-variant font-medium">الرواتب الأساسية</span>
              <span className="text-lg font-bold text-on-surface mt-1">{monthlyTotals.totalBasic.toLocaleString()} ج.م</span>
            </div>
            <div className="bg-surface-container p-3 rounded-xl flex flex-col justify-center text-right">
              <span className="text-xs text-on-surface-variant font-medium">المستحق الفعلي</span>
              <span className="text-lg font-bold text-primary mt-1">{monthlyTotals.totalEarned.toLocaleString()} ج.م</span>
            </div>
            <div className="bg-surface-container p-3 rounded-xl flex flex-col justify-center text-right">
              <span className="text-xs text-on-surface-variant font-medium">إجمالي السلف</span>
              <span className="text-lg font-bold text-error mt-1">{monthlyTotals.totalDailyLoans.toLocaleString()} ج.م</span>
            </div>
            <div className="bg-surface-container p-3 rounded-xl flex flex-col justify-center text-right">
              <span className="text-xs text-on-surface-variant font-medium">إجمالي البونص</span>
              <span className="text-lg font-bold text-success mt-1">{monthlyTotals.totalDailyBonuses.toLocaleString()} ج.م</span>
            </div>
            <div className="bg-surface-container p-3 rounded-xl flex flex-col justify-center text-right">
              <span className="text-xs text-on-surface-variant font-medium">إجمالي الخصومات</span>
              <span className="text-lg font-bold text-error mt-1">{monthlyTotals.totalDailyDeductions.toLocaleString()} ج.م</span>
            </div>
            <div className="bg-surface-container p-3 rounded-xl flex flex-col justify-center text-right border-2 border-primary">
              <span className="text-xs text-primary font-bold">صافي المستحق للمسير</span>
              <span className="text-xl font-black text-primary mt-1">{monthlyTotals.totalNet.toLocaleString()} ج.م</span>
            </div>
          </div>

          <AsyncState
            isLoading={monthlySummaryQuery.isLoading}
            isError={monthlySummaryQuery.isError}
            error={monthlySummaryQuery.error}
          >
            <DataTable<MonthlySummaryRow>
              columns={monthlyColumns}
              data={filteredMonthlySummary}
              keyExtractor={(row) => row.employee_id}
              emptyMessage="لا يوجد حركات مجمعة لمسير الرواتب في هذه الفترة"
            />
          </AsyncState>
        </div>
      )}

      {/* Modal 1: Edit Daily Attendance Ledger & Financials */}
      <Modal
        open={editLedgerOpen}
        onClose={() => setEditLedgerOpen(false)}
        title={`تسجيل اليومية والحركات المالية لـ: ${ledgerForm.employee_name}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            upsertLedgerMutation.mutate(ledgerForm)
          }}
          className="space-y-4 text-right"
        >
          {/* Payout Details */}
          <div className="bg-primary-container/10 p-3 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-primary">تفاصيل التحويل والدفع للموظف (ثابتة في ملفه)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">طريقة الدفع</label>
                <select
                  value={ledgerForm.payout_method}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, payout_method: e.target.value })}
                  className={inputClass}
                >
                  <option value="cash">كاش</option>
                  <option value="wallet">محفظة إلكترونية (فودافون كاش، إلخ)</option>
                  <option value="bank">تحويل بنكي</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">رقم المحفظة / حساب التحويل</label>
                <input
                  type="text"
                  placeholder="مثال: 01012345678"
                  value={ledgerForm.payout_detail}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, payout_detail: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Attendance Status */}
            <div>
              <label className="block text-xs font-medium text-on-surface mb-1">حالة الحضور</label>
              <select
                value={ledgerForm.status}
                onChange={(e) => setLedgerForm({ ...ledgerForm, status: e.target.value })}
                className={inputClass}
              >
                <option value="present">حاضر</option>
                <option value="absent">غائب</option>
                <option value="leave">إجازة</option>
                <option value="late">متأخر</option>
              </select>
            </div>

            {/* Check-in check-out */}
            <div>
              <label className="block text-xs font-medium text-on-surface mb-1">وقت الحضور</label>
              <input
                type="time"
                value={ledgerForm.check_in}
                onChange={(e) => setLedgerForm({ ...ledgerForm, check_in: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface mb-1">وقت الانصراف</label>
              <input
                type="time"
                value={ledgerForm.check_out}
                onChange={(e) => setLedgerForm({ ...ledgerForm, check_out: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {/* Daily Financial Adjustments */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-on-surface mb-1">السلفة اليومية (ج.م)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={ledgerForm.daily_loan}
                onChange={(e) => setLedgerForm({ ...ledgerForm, daily_loan: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface mb-1">البونص اليومي (ج.م)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={ledgerForm.daily_bonus}
                onChange={(e) => setLedgerForm({ ...ledgerForm, daily_bonus: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface mb-1">الخصم اليومي (ج.م)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={ledgerForm.daily_deduction}
                onChange={(e) => setLedgerForm({ ...ledgerForm, daily_deduction: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface mb-1">سبب الخصم اليومي</label>
            <input
              type="text"
              placeholder="مثال: خصم التأخر، عدم إكمال المهمة، إلخ"
              value={ledgerForm.deduction_reason}
              onChange={(e) => setLedgerForm({ ...ledgerForm, deduction_reason: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface mb-1">ملاحظات عامة</label>
            <textarea
              rows={2}
              placeholder="أي ملاحظات إضافية على حضور الموظف اليوم"
              value={ledgerForm.notes}
              onChange={(e) => setLedgerForm({ ...ledgerForm, notes: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2 justify-start pt-3 border-t border-outline-variant">
            <button
              type="submit"
              disabled={upsertLedgerMutation.isPending}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold hover:opacity-95 transition-all disabled:opacity-50"
            >
              {upsertLedgerMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
            <button
              type="button"
              onClick={() => setEditLedgerOpen(false)}
              className="bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Generate Official Payroll Group */}
      <Modal
        open={generatePayrollOpen}
        onClose={() => setGeneratePayrollOpen(false)}
        title="توليد مسير رواتب معتمد"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            generatePayrollMutation.mutate({
              name: payrollForm.name,
              start_date: startDate,
              end_date: endDate,
              branch_id: payrollForm.branch_id ? Number(payrollForm.branch_id) : null,
            })
          }}
          className="space-y-4 text-right"
        >
          <div className="bg-primary-container/10 p-4 rounded-xl text-sm leading-relaxed text-on-surface space-y-2">
            <p className="font-bold text-primary">تنبيه تأكيد المسير المالي:</p>
            <p>
              سيقوم النظام بترحيل وتوليد قيود <span className="font-bold">سجل الرواتب (Payroll Records)</span> لكل موظف نشط تلقائياً للفترة من <span className="font-bold">{startDate}</span> إلى <span className="font-bold">{endDate}</span>.
            </p>
            <p>
              جميع السلف والخصومات والبونص المسجلة في حركة الحضور اليومية سيتم دمجها وخصمها بالكامل وإغلاق المسير في مسير رواتب مجمع ومغلق (HrmPayrollGroup) بحالة <span className="font-bold text-primary">مسودة (Draft)</span>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface mb-1">اسم مسير الرواتب</label>
            <input
              type="text"
              required
              value={payrollForm.name}
              onChange={(e) => setPayrollForm({ ...payrollForm, name: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface mb-1">الفرع المعتمد للمسير</label>
            <select
              value={payrollForm.branch_id}
              onChange={(e) => setPayrollForm({ ...payrollForm, branch_id: e.target.value })}
              className={inputClass}
            >
              <option value="">كل الفروع</option>
              {branchesQuery.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_ar || b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-start pt-3 border-t border-outline-variant">
            <button
              type="submit"
              disabled={generatePayrollMutation.isPending}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold hover:opacity-95 transition-all disabled:opacity-50"
            >
              {generatePayrollMutation.isPending ? 'جاري التوليد والترحيل...' : 'توليد وترحيل المسير'}
            </button>
            <button
              type="button"
              onClick={() => setGeneratePayrollOpen(false)}
              className="bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* Print custom stylesheet (only injected during active document) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .only-print, .only-print * {
            visibility: visible;
          }
          .only-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: right;
          }
        }
      `}</style>
    </div>
  )
}
