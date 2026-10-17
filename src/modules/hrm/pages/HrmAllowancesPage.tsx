import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Employee, HrmAllowance, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'
import { EntityRowActions } from '../../../components/crud/EntityRowActions'
import { getEntityCrudConfig } from '../../../lib/crud/entityCrudRegistry'
import { NumericInput } from '../../../components/ui/NumericInput'
import { TextInput } from '../../../components/ui/TextInput'

interface HrmDebt {
  id: number
  employee_id: number
  amount: string | number
  remaining_balance: string | number
  payroll_deduction_amount: string | number
  reason?: string | null
  status: string
  created_at?: string
  employee?: Employee
  creator?: { id: number; name: string }
}

type TabId = 'allowance' | 'deduction' | 'bonus' | 'advance'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm focus:outline-none focus:border-primary bg-surface-container-lowest'

export function HrmAllowancesPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<TabId>('allowance')
  const [toast, setToast] = useState('')
  const crudConfig = getEntityCrudConfig('hrmAllowances')

  // State for Allowance/Deduction/Bonus
  const [allowanceModalOpen, setAllowanceModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HrmAllowance | null>(null)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    amount_type: 'fixed',
    applicable_date: '',
    employee_ids: [] as number[],
  })

  // State for Advance (Loan)
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false)
  const [advanceForm, setAdvanceForm] = useState({
    employee_id: '' as number | '',
    amount: '',
    payroll_deduction_amount: '',
    reason: '',
  })

  const [empSearch, setEmpSearch] = useState('')

  // Queries
  const allowancesQuery = useQuery({
    queryKey: ['hrm', 'allowances'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmAllowance>>('/hrm/allowances', {
        params: { per_page: 200, include: 'employees' },
      })
      return data.data
    },
  })

  const debtsQuery = useQuery({
    queryKey: ['hrm', 'debts'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmDebt>>('/hrm/debts', {
        params: { per_page: 100 },
      })
      return data.data
    },
    enabled: tab === 'advance',
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'allowances-page'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data
    },
    enabled: allowanceModalOpen || advanceModalOpen,
  })

  // Mutations
  const saveAllowanceMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        description: form.description,
        type: tab !== 'advance' ? tab : 'allowance',
        amount: Number(form.amount),
        amount_type: form.amount_type,
        applicable_date: form.applicable_date || undefined,
        employee_ids: form.employee_ids,
      }

      if (editingItem) {
        const { data } = await api.put<HrmAllowance>(`/hrm/allowances/${editingItem.id}`, payload)
        return data
      } else {
        const { data } = await api.post<HrmAllowance>('/hrm/allowances', payload)
        return data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'allowances'] })
      setAllowanceModalOpen(false)
      setEditingItem(null)
      resetAllowanceForm()
      setToast(editingItem ? 'تم تحديث البند بنجاح' : 'تم إضافة البند بنجاح')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const saveAdvanceMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<HrmDebt>('/hrm/debts', {
        employee_id: Number(advanceForm.employee_id),
        amount: Number(advanceForm.amount),
        payroll_deduction_amount: Number(advanceForm.payroll_deduction_amount),
        reason: advanceForm.reason || undefined,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'debts'] })
      setAdvanceModalOpen(false)
      setAdvanceForm({ employee_id: '', amount: '', payroll_deduction_amount: '', reason: '' })
      setToast('تم تسجيل السلفة بنجاح')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  // Helpers
  const resetAllowanceForm = () => {
    setForm({
      description: '',
      amount: '',
      amount_type: 'fixed',
      applicable_date: '',
      employee_ids: [],
    })
    setEmpSearch('')
  }

  const openAddAllowance = () => {
    setEditingItem(null)
    resetAllowanceForm()
    setAllowanceModalOpen(true)
  }

  const openEditAllowance = (row: HrmAllowance) => {
    setEditingItem(row)
    setForm({
      description: row.description,
      amount: String(row.amount),
      amount_type: row.amount_type || 'fixed',
      applicable_date: row.applicable_date ? row.applicable_date.split('T')[0] : '',
      employee_ids: row.employees?.map((e) => e.id) ?? [],
    })
    setEmpSearch('')
    setAllowanceModalOpen(true)
  }

  const toggleEmployee = (id: number) => {
    setForm((prev) => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(id)
        ? prev.employee_ids.filter((x) => x !== id)
        : [...prev.employee_ids, id],
    }))
  }

  const tabsConfig = [
    {
      id: 'allowance' as TabId,
      label: 'البدلات (Allowances)',
      icon: 'add_card',
      description: 'البدلات هي مستحقات شهرية تضاف لراتب الموظف مثل بدل انتقال، بدل اتصال، أو طبيعة عمل.',
    },
    {
      id: 'deduction' as TabId,
      label: 'الخصومات (Deductions)',
      icon: 'remove_moderator',
      description: 'الخصومات هي استقطاعات شهرية تقلل مستحقات الموظف مثل التأمينات، الضرائب، أو الخصم الإداري.',
    },
    {
      id: 'bonus' as TabId,
      label: 'البونص والمكافآت (Bonuses)',
      icon: 'workspace_premium',
      description: 'البونص هو مكافآت ترتبط بالأداء أو قرار الإدارة بخصوص تحقيق مبيعات أو تميز وظيفي.',
    },
    {
      id: 'advance' as TabId,
      label: 'السلف والمديونيات (Advances)',
      icon: 'account_balance_wallet',
      description: 'السلف هي مبالغ يتم صرفها مقدماً للموظف من الخزينة ويتم تسويتها أو تقسيطها شهرياً من راتبه.',
    },
  ]

  const currentTabConfig = tabsConfig.find((t) => t.id === tab)!

  const filteredEmployees = (employeesQuery.data ?? []).filter(
    (emp) =>
      emp.name.toLowerCase().includes(empSearch.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(empSearch.toLowerCase())
  )

  const hrmAllowancesData = (allowancesQuery.data ?? []).filter((item) => item.type === tab)

  return (
    <div className="space-y-md">
      <PageHeader
        title="البدلات والخصومات والسلف"
        subtitle="الإدارة المالية للموظفين: بدلات، خصومات، مكافآت، وسلف شهرية"
        actions={
          tab === 'advance' ? (
            <button
              type="button"
              onClick={() => setAdvanceModalOpen(true)}
              className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary shadow"
            >
              <Icon name="add" size={18} />
              سلفة جديدة
            </button>
          ) : (
            <button
              type="button"
              onClick={openAddAllowance}
              className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary shadow"
            >
              <Icon name="add" size={18} />
              إضافة {tab === 'allowance' ? 'بدل' : tab === 'deduction' ? 'خصم' : 'بونص'}
            </button>
          )
        }
      />

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      {/* Tabs bar */}
      <div className="flex flex-wrap gap-xs border-b border-outline-variant pb-xs">
        {tabsConfig.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-xs rounded-lg px-md py-sm text-sm font-semibold transition ${
              tab === t.id
                ? 'bg-primary text-on-primary shadow-md'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <Icon name={t.icon} size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Description Info Card */}
      <div className="rounded-xl border border-primary/10 bg-primary-container/10 p-md flex gap-sm items-start">
        <Icon name="info" className="text-primary mt-0.5" size={20} />
        <div className="space-y-xs">
          <h4 className="font-bold text-sm text-on-surface">ملخص نوع البند</h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">{currentTabConfig.description}</p>
        </div>
      </div>

      {/* Render tables based on active Tab */}
      {tab !== 'advance' ? (
        <AsyncState
          isLoading={allowancesQuery.isLoading}
          isError={allowancesQuery.isError}
          error={allowancesQuery.error}
        >
          <DataTable<HrmAllowance & Record<string, unknown>>
            data={hrmAllowancesData as (HrmAllowance & Record<string, unknown>)[]}
            keyExtractor={(row) => row.id}
            pageSize={10}
            emptyMessage={`لا توجد سجلات حالياً`}
            columns={[
              { key: 'description', header: 'الوصف' },
              {
                key: 'amount',
                header: 'القيمة',
                className: 'tabular-nums font-semibold',
                render: (row) =>
                  row.amount_type === 'percent'
                    ? `${Number(row.amount).toLocaleString('ar-EG', { numberingSystem: 'latn' })}%`
                    : `${Number(row.amount).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م`,
              },
              {
                key: 'amount_type',
                header: 'نوع القيمة',
                render: (row) => (row.amount_type === 'percent' ? 'نسبة مئوية' : 'مبلغ ثابت'),
              },
              {
                key: 'employees',
                header: 'الموظفون المشمولون',
                render: (row) =>
                  row.employees && row.employees.length > 0 ? (
                    <div className="flex flex-wrap gap-xs">
                      {row.employees.map((emp) => (
                        <span
                          key={emp.id}
                          className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface"
                        >
                          {emp.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface-variant">كل الموظفين</span>
                  ),
              },
              {
                key: 'actions',
                header: '',
                render: (row) => (
                  <div className="flex items-center justify-end gap-sm">
                    <button
                      type="button"
                      onClick={() => openEditAllowance(row)}
                      className="inline-flex items-center gap-0.5 text-sm text-primary hover:underline"
                    >
                      <Icon name="edit" size={16} />
                      تعديل
                    </button>
                    <EntityRowActions
                      row={row as HrmAllowance}
                      config={crudConfig}
                      queryKeys={[['hrm', 'allowances']]}
                      showView={false}
                    />
                  </div>
                ),
              },
            ]}
          />
        </AsyncState>
      ) : (
        <AsyncState isLoading={debtsQuery.isLoading} isError={debtsQuery.isError} error={debtsQuery.error}>
          <DataTable<HrmDebt & Record<string, unknown>>
            data={(debtsQuery.data ?? []) as (HrmDebt & Record<string, unknown>)[]}
            keyExtractor={(row) => row.id}
            pageSize={10}
            emptyMessage="لا توجد سلف أو مديونيات مسجلة"
            columns={[
              {
                key: 'employee',
                header: 'الموظف',
                render: (row) => row.employee?.name ?? '—',
              },
              {
                key: 'amount',
                header: 'مبلغ السلفة الكلي',
                className: 'tabular-nums font-semibold text-primary',
                render: (row) => `${Number(row.amount).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م`,
              },
              {
                key: 'payroll_deduction_amount',
                header: 'قيمة القسط الشهري',
                className: 'tabular-nums text-error',
                render: (row) => `${Number(row.payroll_deduction_amount).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م`,
              },
              {
                key: 'remaining_balance',
                header: 'المتبقي ليدفع',
                className: 'tabular-nums font-semibold',
                render: (row) => `${Number(row.remaining_balance).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م`,
              },
              {
                key: 'status',
                header: 'الحالة',
                render: (row) => (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      row.status === 'settled'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-primary-container text-on-primary-container'
                    }`}
                  >
                    {row.status === 'settled' ? 'مسددة' : 'نشطة'}
                  </span>
                ),
              },
              {
                key: 'created_at',
                header: 'تاريخ الإنشاء',
                render: (row) => (row.created_at ? row.created_at.split('T')[0] : '—'),
              },
              {
                key: 'reason',
                header: 'السبب',
                render: (row) => row.reason || '—',
              },
            ]}
          />
        </AsyncState>
      )}

      {/* Modal for Allowance/Deduction/Bonus */}
      <Modal
        open={allowanceModalOpen}
        onClose={() => setAllowanceModalOpen(false)}
        title={
          editingItem
            ? `تعديل ${tab === 'allowance' ? 'البدل' : tab === 'deduction' ? 'الخصم' : 'البونص'}`
            : `إضافة ${tab === 'allowance' ? 'بدل' : tab === 'deduction' ? 'خصم' : 'بونص'} جديد`
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveAllowanceMutation.mutate()
          }}
          className="space-y-sm"
        >
          <label className="block text-sm">
            <span className="mb-xs block text-on-surface-variant font-medium">الوصف (الاسم)</span>
            <TextInput
              mode="arabic"
              placeholder="مثال: بدل انتقال فرع أكتوبر"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-2 gap-sm">
            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant font-medium">المبلغ / القيمة</span>
              <NumericInput
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                className={inputClass}
                dir="ltr"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant font-medium">نوع القيمة</span>
              <select
                value={form.amount_type}
                onChange={(e) => setForm({ ...form, amount_type: e.target.value })}
                className={inputClass}
              >
                <option value="fixed">مبلغ ثابت (ج.م)</option>
                <option value="percent">نسبة مئوية (%)</option>
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-xs block text-on-surface-variant font-medium">تاريخ البدء (اختياري)</span>
            <input
              type="date"
              value={form.applicable_date}
              onChange={(e) => setForm({ ...form, applicable_date: e.target.value })}
              className={inputClass}
              dir="ltr"
            />
          </label>

          {/* Search and select employees */}
          <div className="space-y-xs pt-xs">
            <span className="mb-xs block text-sm font-medium text-on-surface-variant">ربط بالموظفين (اترك فارغاً للتطبيق على الكل)</span>
            <TextInput
              placeholder="ابحث باسم الموظف أو الكود..."
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className={inputClass}
            />
            <div className="max-h-40 overflow-y-auto rounded-lg border border-outline-variant p-sm space-y-xs bg-surface-container-lowest shadow-inner">
              {filteredEmployees.map((emp) => (
                <label
                  key={emp.id}
                  className="flex cursor-pointer items-center gap-xs py-1 px-sm text-sm hover:bg-surface-container-low rounded-md transition"
                >
                  <input
                    type="checkbox"
                    checked={form.employee_ids.includes(emp.id)}
                    onChange={() => toggleEmployee(emp.id)}
                    className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>
                    {emp.name} <span className="text-xs text-on-surface-variant">({emp.employee_code})</span>
                  </span>
                </label>
              ))}
              {filteredEmployees.length === 0 && (
                <p className="text-xs text-on-surface-variant text-center py-sm">لا يوجد موظفون مطابقون</p>
              )}
            </div>
          </div>

          {saveAllowanceMutation.isError && (
            <p className="text-xs text-error">{getErrorMessage(saveAllowanceMutation.error)}</p>
          )}

          <div className="flex gap-sm justify-end pt-sm border-t border-outline-variant">
            <button
              type="button"
              onClick={() => setAllowanceModalOpen(false)}
              className="rounded-lg border px-md py-2 text-sm font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saveAllowanceMutation.isPending}
              className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary shadow"
            >
              {editingItem ? 'حفظ التعديلات' : 'إضافة'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal for Salary Advance */}
      <Modal
        open={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        title="تسجيل سلفة مالية جديدة"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveAdvanceMutation.mutate()
          }}
          className="space-y-sm"
        >
          <label className="block text-sm">
            <span className="mb-xs block text-on-surface-variant font-medium">الموظف المقترض</span>
            <select
              value={advanceForm.employee_id}
              onChange={(e) => setAdvanceForm({ ...advanceForm, employee_id: e.target.value ? Number(e.target.value) : '' })}
              required
              className={inputClass}
            >
              <option value="">اختر الموظف</option>
              {(employeesQuery.data ?? []).map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-sm">
            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant font-medium">مبلغ السلفة الكلي (ج.م)</span>
              <NumericInput
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                required
                className={inputClass}
                dir="ltr"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-xs block text-on-surface-variant font-medium">قيمة الخصم الشهري (ج.م)</span>
              <NumericInput
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={advanceForm.payroll_deduction_amount}
                onChange={(e) => setAdvanceForm({ ...advanceForm, payroll_deduction_amount: e.target.value })}
                required
                className={inputClass}
                dir="ltr"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-xs block text-on-surface-variant font-medium">سبب السلفة / ملاحظات</span>
            <TextInput
              mode="arabic"
              placeholder="مثال: سلفة شخصية للمرور بظروف طارئة"
              value={advanceForm.reason}
              onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
              className={inputClass}
            />
          </label>

          {saveAdvanceMutation.isError && (
            <p className="text-xs text-error">{getErrorMessage(saveAdvanceMutation.error)}</p>
          )}

          <div className="flex gap-sm justify-end pt-sm border-t border-outline-variant">
            <button
              type="button"
              onClick={() => setAdvanceModalOpen(false)}
              className="rounded-lg border px-md py-2 text-sm font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saveAdvanceMutation.isPending}
              className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary shadow"
            >
              تسجيل السلفة
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
