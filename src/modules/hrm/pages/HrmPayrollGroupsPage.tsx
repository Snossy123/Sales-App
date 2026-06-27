import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { HrmPayrollGroup, HrmPayrollRecord, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'
import { EntityRowActions } from '../../../components/crud/EntityRowActions'
import { getEntityCrudConfig } from '../../../lib/crud/entityCrudRegistry'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function HrmPayrollGroupsPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ name: '', payroll_record_ids: [] as number[] })
  const crudConfig = getEntityCrudConfig('hrmPayrollGroups')

  const query = useQuery({
    queryKey: ['hrm', 'payroll-groups'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmPayrollGroup>>('/hrm/payroll-groups', {
        params: { per_page: 50, include: 'payrollRecords.employee,branch' },
      })
      return data.data
    },
  })

  const payrollQuery = useQuery({
    queryKey: ['hrm', 'payroll', 'for-groups'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmPayrollRecord>>('/hrm/payroll', {
        params: { per_page: 100, include: 'employee', 'filter[payment_status]': 'due' },
      })
      return data.data
    },
    enabled: panelOpen,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<HrmPayrollGroup>('/hrm/payroll-groups', form)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'payroll-groups'] })
      setPanelOpen(false)
      setForm({ name: '', payroll_record_ids: [] })
      setToast('تم إنشاء المسير')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const markPaidMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<HrmPayrollGroup>(`/hrm/payroll-groups/${id}/mark-paid`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] })
      setToast('تم تسجيل الدفع')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const toggleRecord = (id: number) => {
    setForm((prev) => ({
      ...prev,
      payroll_record_ids: prev.payroll_record_ids.includes(id)
        ? prev.payroll_record_ids.filter((x) => x !== id)
        : [...prev.payroll_record_ids, id],
    }))
  }

  return (
    <div>
      <PageHeader title="مسيرات الرواتب" subtitle="تجميع سجلات الرواتب وصرفها" actions={
        <button type="button" onClick={() => setPanelOpen(true)} className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary">
          <Icon name="add" size={18} /> مسير جديد
        </button>
      } />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<HrmPayrollGroup & Record<string, unknown>>
          data={(query.data ?? []) as (HrmPayrollGroup & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          columns={[
            { key: 'name', header: 'الاسم' },
            { key: 'gross_total', header: 'الإجمالي', className: 'tabular-nums', render: (row) => Number(row.gross_total ?? 0).toLocaleString('ar-EG') },
            { key: 'status', header: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
            { key: 'payment_status', header: 'الدفع', render: (row) => (
              <StatusBadge status={String(row.payment_status ?? 'due')} label={row.payment_status === 'paid' ? 'مدفوع' : 'مستحق'} />
            ) },
            { key: 'records', header: 'السجلات', render: (row) => row.payrollRecords?.length ?? 0 },
            { key: 'actions', header: '', render: (row) => (
              <div className="flex flex-wrap items-center gap-2">
                {row.payment_status !== 'paid' && (
                  <button type="button" onClick={() => markPaidMutation.mutate(row.id)} className="text-xs text-primary hover:underline">تسجيل الدفع</button>
                )}
                <EntityRowActions
                  row={row as HrmPayrollGroup}
                  config={crudConfig}
                  queryKeys={[['hrm', 'payroll-groups']]}
                  showView={false}
                />
              </div>
            ) },
          ]}
        />
      </AsyncState>

      <Modal open={panelOpen} onClose={() => setPanelOpen(false)} title="مسير رواتب جديد">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-sm">
          <input placeholder="اسم المسير" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
          <div className="max-h-48 overflow-y-auto rounded border border-outline-variant p-sm">
            <p className="mb-xs text-xs text-on-surface-variant">اختر سجلات الرواتب</p>
            {(payrollQuery.data ?? []).map((rec) => (
              <label key={rec.id} className="flex cursor-pointer items-center gap-xs py-0.5 text-sm">
                <input type="checkbox" checked={form.payroll_record_ids.includes(rec.id)} onChange={() => toggleRecord(rec.id)} />
                {rec.employee?.name ?? rec.ref_no} — {Number(rec.final_total).toLocaleString('ar-EG')}
              </label>
            ))}
          </div>
          <button type="submit" disabled={createMutation.isPending || !form.payroll_record_ids.length} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">إنشاء</button>
        </form>
      </Modal>
    </div>
  )
}
