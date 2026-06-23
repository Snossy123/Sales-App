import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Employee, HrmPayrollRecord, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { FilterBar } from '../../../components/FilterBar'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'
import { getListScopeQueryKey, mergeScopedListParams } from '../../../lib/dataScope'
import { useAuthStore } from '../../../stores/authStore'

type PayrollRow = HrmPayrollRecord & Record<string, unknown>
type Panel = 'create' | null

const emptyForm = {
  employee_id: '' as number | '',
  duration: '1',
  duration_unit: 'month',
  rate: '',
  payment_status: 'due',
}

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function HrmPayrollPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const listScopeKey = getListScopeQueryKey(user)
  const [panel, setPanel] = useState<Panel>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [successToast, setSuccessToast] = useState('')

  const payrollQuery = useQuery({
    queryKey: ['hrm', 'payroll', statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 50,
        include: 'employee,branch',
      }
      if (statusFilter) params['filter[payment_status]'] = statusFilter

      const { data } = await api.get<PaginatedResponse<HrmPayrollRecord>>('/hrm/payroll', { params })
      return data.data
    },
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'payroll', listScopeKey],
    queryFn: async () => {
      const params = mergeScopedListParams(user, { per_page: 100 })
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params })
      return data.data
    },
    enabled: panel === 'create',
  })

  const closePanel = () => {
    setPanel(null)
    setForm(emptyForm)
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_id: Number(form.employee_id),
        branch_id: branchId ?? undefined,
        duration: Number(form.duration),
        duration_unit: form.duration_unit,
        rate: form.rate ? Number(form.rate) : undefined,
        payment_status: form.payment_status,
      }
      const { data } = await api.post<HrmPayrollRecord>('/hrm/payroll', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'payroll'] })
      closePanel()
      setSuccessToast('تم إنشاء كشف الراتب')
    },
  })

  const rows = payrollQuery.data ?? []

  return (
    <div>
      <PageHeader
        title="الرواتب"
        subtitle="عرض وإنشاء سجلات الرواتب"
        actions={
          <button
            type="button"
            onClick={() => setPanel('create')}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            إنشاء راتب
          </button>
        }
      />


      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      <FilterBar
        selects={[
          {
            id: 'payment_status',
            label: 'حالة الدفع',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: '', label: 'الكل' },
              { value: 'due', label: 'مستحق' },
              { value: 'paid', label: 'مدفوع' },
            ],
          },
        ]}
        showClear={Boolean(statusFilter)}
        onClear={() => setStatusFilter('')}
      />

      <AsyncState
        isLoading={payrollQuery.isLoading}
        isError={payrollQuery.isError}
        error={payrollQuery.error}
      >
        <DataTable<PayrollRow>
          data={rows as PayrollRow[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          emptyMessage="لا توجد سجلات رواتب"
          columns={[
            { key: 'ref_no', header: 'المرجع', render: (row) => row.ref_no || `#${row.id}` },
            {
              key: 'employee',
              header: 'الموظف',
              render: (row) => row.employee?.name ?? '—',
            },
            {
              key: 'duration',
              header: 'المدة',
              render: (row) => `${row.duration} ${row.duration_unit ?? ''}`,
            },
            {
              key: 'rate',
              header: 'المعدل',
              className: 'tabular-nums',
              render: (row) => Number(row.rate).toLocaleString('ar-EG'),
            },
            {
              key: 'gross_total',
              header: 'الإجمالي',
              className: 'tabular-nums',
              render: (row) => Number(row.gross_total).toLocaleString('ar-EG'),
            },
            {
              key: 'final_total',
              header: 'الصافي',
              className: 'tabular-nums',
              render: (row) => Number(row.final_total).toLocaleString('ar-EG'),
            },
            {
              key: 'payment_status',
              header: 'الدفع',
              render: (row) => (
                <StatusBadge
                  status={String(row.payment_status)}
                  label={row.payment_status === 'paid' ? 'مدفوع' : 'مستحق'}
                />
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal open={panel === 'create'} onClose={closePanel} title="إنشاء راتب">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate()
          }}
          className="grid gap-sm sm:grid-cols-2"
        >
          <select
            value={form.employee_id}
            onChange={(e) => {
              const id = Number(e.target.value)
              const emp = employeesQuery.data?.find((item) => item.id === id)
              setForm({
                ...form,
                employee_id: id,
                rate: emp?.salary != null ? String(emp.salary) : form.rate,
              })
            }}
            required
            className={`${inputClass} sm:col-span-2`}
          >
            <option value="">اختر الموظف</option>
            {employeesQuery.data?.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employee_code})
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="المدة"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            required
            className={inputClass}
            dir="ltr"
          />
          <select
            value={form.duration_unit}
            onChange={(e) => setForm({ ...form, duration_unit: e.target.value })}
            className={inputClass}
          >
            <option value="month">شهر</option>
            <option value="week">أسبوع</option>
            <option value="day">يوم</option>
            <option value="hour">ساعة</option>
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="المعدل (اختياري)"
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
            className={`${inputClass} sm:col-span-2`}
            dir="ltr"
          />
          <select
            value={form.payment_status}
            onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
            className={`${inputClass} sm:col-span-2`}
          >
            <option value="due">مستحق</option>
            <option value="paid">مدفوع</option>
          </select>
          {createMutation.isError && (
            <p className="text-sm text-error sm:col-span-2">{getErrorMessage(createMutation.error)}</p>
          )}
          <div className="flex gap-sm sm:col-span-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary"
            >
              إنشاء
            </button>
            <button type="button" onClick={closePanel} className="rounded-lg border px-md py-2 text-sm">
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
