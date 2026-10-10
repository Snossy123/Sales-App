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
import { TextArea } from '../../../components/ui/TextArea'
import { hrmLeaveTypeLabel } from '../lib/labels'
import { userCanPerform } from '../../../lib/access'
import { useAuthStore } from '../../../stores/authStore'

type LeaveRow = HrmLeave & Record<string, unknown>

function leaveDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
}

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function HrmLeavesPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canApproveLeave = userCanPerform(user, 'hrm.leave.approve')
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

  const selectedEmployee = (employeesQuery.data ?? []).find((e) => e.id === Number(form.employee_id))
  const overlappingLeaves = (query.data ?? []).filter((leave) => {
    if (!selectedEmployee?.department_id || !form.start_date || !form.end_date) return false
    if (leave.employee_id === selectedEmployee.id) return false
    if (leave.status === 'rejected') return false
    const emp = leave.employee as Employee | undefined
    if (!emp || emp.department_id !== selectedEmployee.department_id) return false

    const lStart = String(leave.start_date).slice(0, 10)
    const lEnd = String(leave.end_date).slice(0, 10)
    return form.start_date <= lEnd && form.end_date >= lStart
  })

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
          pageSize={10}
          emptyMessage="لا توجد طلبات إجازة"
          columns={[
            { key: 'ref_no', header: 'المرجع', render: (row) => row.ref_no || `#${row.id}` },
            {
              key: 'employee',
              header: 'الموظف',
              render: (row) => {
                const emp = row.employee as Employee | undefined
                const rStart = String(row.start_date).slice(0, 10)
                const rEnd = String(row.end_date).slice(0, 10)
                const hasDeptOverlap = rows.some((other) => {
                  if (other.id === row.id || other.status === 'rejected') return false
                  const otherEmp = other.employee as Employee | undefined
                  if (!emp?.department_id || otherEmp?.department_id !== emp.department_id) return false
                  const oStart = String(other.start_date).slice(0, 10)
                  const oEnd = String(other.end_date).slice(0, 10)
                  return rStart <= oEnd && rEnd >= oStart
                })

                return (
                  <div className="flex flex-wrap items-center gap-1">
                    <span>{emp?.name ?? '—'}</span>
                    {hasDeptOverlap && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400"
                        title="يوجد أكثر من موظف في نفس القسم في إجازة في نفس اليوم"
                      >
                        <Icon name="warning" size={13} />
                        تزامن بالقسم
                      </span>
                    )}
                  </div>
                )
              },
            },
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
                row.status === 'pending' && canApproveLeave ? (
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
          <input type="date" min={form.start_date || undefined} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required className={inputClass} dir="ltr" />

          {overlappingLeaves.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-sm text-xs text-amber-800 dark:text-amber-200">
              <Icon name="warning" size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-bold">تنبيه: يوجد موظف آخر في نفس القسم في إجازة بنفس اليوم / الفترة:</p>
                <ul className="mt-1 list-disc pe-4">
                  {overlappingLeaves.map((l) => (
                    <li key={l.id}>
                      {l.employee?.name} (من {l.start_date} إلى {l.end_date})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <TextArea mode="arabic" placeholder="السبب" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputClass} rows={2} />
          <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">تقديم</button>
        </form>
      </Modal>
    </div>
  )
}
