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

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function HrmAllowancesPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [toast, setToast] = useState('')
  const crudConfig = getEntityCrudConfig('hrmAllowances')
  const [form, setForm] = useState({
    description: '',
    type: 'allowance' as 'allowance' | 'deduction',
    amount: '',
    amount_type: 'fixed',
    employee_ids: [] as number[],
  })

  const query = useQuery({
    queryKey: ['hrm', 'allowances'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmAllowance>>('/hrm/allowances', { params: { per_page: 50, include: 'employees' } })
      return data.data
    },
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'allowances'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params: { per_page: 100 } })
      return data.data
    },
    enabled: panelOpen,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<HrmAllowance>('/hrm/allowances', {
        description: form.description,
        type: form.type,
        amount: Number(form.amount),
        amount_type: form.amount_type,
        employee_ids: form.employee_ids.length ? form.employee_ids : undefined,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'allowances'] })
      setPanelOpen(false)
      setToast('تم حفظ البند')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const toggleEmployee = (id: number) => {
    setForm((prev) => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(id) ? prev.employee_ids.filter((x) => x !== id) : [...prev.employee_ids, id],
    }))
  }

  return (
    <div>
      <PageHeader title="البدلات والخصومات" subtitle="إدارة البدلات المرتبطة بالموظفين" actions={
        <button type="button" onClick={() => setPanelOpen(true)} className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary">
          <Icon name="add" size={18} /> بند جديد
        </button>
      } />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<HrmAllowance & Record<string, unknown>>
          data={(query.data ?? []) as (HrmAllowance & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          columns={[
            { key: 'description', header: 'الوصف' },
            { key: 'type', header: 'النوع', render: (row) => row.type === 'allowance' ? 'بدل' : 'خصم' },
            { key: 'amount', header: 'القيمة', className: 'tabular-nums', render: (row) => Number(row.amount).toLocaleString('ar-EG') },
            { key: 'employees', header: 'الموظفون', render: (row) => row.employees?.map((e) => e.name).join('، ') ?? '—' },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <EntityRowActions
                  row={row as HrmAllowance}
                  config={crudConfig}
                  queryKeys={[['hrm', 'allowances']]}
                  showView={false}
                />
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal open={panelOpen} onClose={() => setPanelOpen(false)} title="بدل / خصم جديد">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="space-y-sm">
          <input placeholder="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className={inputClass} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'allowance' | 'deduction' })} className={inputClass}>
            <option value="allowance">بدل</option>
            <option value="deduction">خصم</option>
          </select>
          <input type="number" placeholder="المبلغ" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className={inputClass} dir="ltr" />
          <div className="max-h-40 overflow-y-auto rounded border border-outline-variant p-sm">
            {(employeesQuery.data ?? []).map((emp) => (
              <label key={emp.id} className="flex cursor-pointer items-center gap-xs py-0.5 text-sm">
                <input type="checkbox" checked={form.employee_ids.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} />
                {emp.name}
              </label>
            ))}
          </div>
          <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">حفظ</button>
        </form>
      </Modal>
    </div>
  )
}
