import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Employee, HrmLeave, HrmLeaveType, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { FilterBar } from '../../../components/FilterBar'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'
import { HrmSubNav } from '../components/HrmSubNav'
import { hrmLeaveTypeLabel } from '../lib/labels'

type LeaveRow = HrmLeave & Record<string, unknown>

function leaveDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
}

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function HrmLeavesPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [successToast, setSuccessToast] = useState('')
  const [actionError, setActionError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    employee_id: '' as number | '',
    hrm_leave_type_id: '' as number | '',
    start_date: '',
    end_date: '',
    reason: '',
  })

  const query = useQuery({
    queryKey: ['hrm', 'leaves', statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 50,
        include: 'employee,leaveType',
      }
      if (statusFilter) params['filter[status]'] = statusFilter
      const { data } = await api.get<PaginatedResponse<HrmLeave>>('/hrm/leaves', { params })
      return data.data
    },
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'leaves'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params: { per_page: 100 } })
      return data.data
    },
    enabled: createOpen,
  })

  const leaveTypesQuery = useQuery({
    queryKey: ['hrm', 'leave-types', 'leaves-form'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmLeaveType>>('/hrm/leave-types', { params: { per_page: 50 } })
      return data.data
    },
    enabled: createOpen,
  })

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'approve' | 'reject' }) => {
      const { data } = await api.post<HrmLeave>(`/hrm/leaves/${id}/${action}`)
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] })
      setActionError('')
      setSuccessToast(vars.action === 'approve' ? 'تم اعتماد الإجازة' : 'تم رفض الإجازة')
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<HrmLeave>('/hrm/leaves', {
        employee_id: Number(form.employee_id),
        hrm_leave_type_id: Number(form.hrm_leave_type_id),
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || undefined,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] })
      setCreateOpen(false)
      setForm({ employee_id: '', hrm_leave_type_id: '', start_date: '', end_date: '', reason: '' })
      setSuccessToast('تم تقديم طلب الإجازة')
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  })

  const rows = query.data ?? []

  return (
    <div>
      <PageHeader
        title="الإجازات"
        subtitle="مراجعة طلبات الإجازة واعتمادها أو رفضها"
        actions={
          <button type="button" onClick={() => setCreateOpen(true)} className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary">
            <Icon name="add" size={18} /> طلب إجازة
          </button>
        }
      />
      <HrmSubNav />

      {successToast && <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />}
      {actionError && <p className="mb-md text-sm text-error">{actionError}</p>}

      <FilterBar
        selects={[
          {
            id: 'status',
            label: 'الحالة',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: '', label: 'الكل' },
              { value: 'pending', label: 'معلقة' },
              { value: 'approved', label: 'معتمدة' },
              { value: 'rejected', label: 'مرفوضة' },
            ],
          },
        ]}
        showClear={Boolean(statusFilter)}
        onClear={() => setStatusFilter('')}
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<LeaveRow>
          data={rows as LeaveRow[]}
          keyExtractor={(row) => row.id}
          emptyMessage="لا توجد طلبات إجازة"
          columns={[
            { key: 'ref_no', header: 'المرجع', render: (row) => row.ref_no || `#${row.id}` },
            { key: 'employee', header: 'الموظف', render: (row) => row.employee?.name ?? '—' },
            { key: 'leaveType', header: 'النوع', render: (row) => hrmLeaveTypeLabel(row.leaveType) },
            { key: 'start_date', header: 'من' },
            { key: 'end_date', header: 'إلى' },
            { key: 'days', header: 'الأيام', render: (row) => leaveDays(String(row.start_date), String(row.end_date)) },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge
                  status={String(row.status)}
                  label={row.status === 'approved' ? 'معتمدة' : row.status === 'rejected' ? 'مرفوضة' : 'معلقة'}
                />
              ),
            },
            {
              key: 'actions',
              header: 'إجراءات',
              render: (row) =>
                row.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button type="button" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: row.id, action: 'approve' })} className="text-sm text-secondary hover:underline disabled:opacity-50">اعتماد</button>
                    <button type="button" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: row.id, action: 'reject' })} className="text-sm text-error hover:underline disabled:opacity-50">رفض</button>
                  </div>
                ) : '—',
            },
          ]}
        />
      </AsyncState>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="طلب إجازة جديد">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-sm">
          <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: Number(e.target.value) })} required className={inputClass}>
            <option value="">الموظف</option>
            {(employeesQuery.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={form.hrm_leave_type_id} onChange={(e) => setForm({ ...form, hrm_leave_type_id: Number(e.target.value) })} required className={inputClass}>
            <option value="">نوع الإجازة</option>
            {(leaveTypesQuery.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.leave_type}</option>)}
          </select>
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required className={inputClass} dir="ltr" />
          <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required className={inputClass} dir="ltr" />
          <textarea placeholder="السبب" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputClass} rows={2} />
          <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">تقديم</button>
        </form>
      </Modal>
    </div>
  )
}
