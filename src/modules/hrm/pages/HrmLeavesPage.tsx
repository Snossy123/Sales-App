import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { HrmLeave, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { FilterBar } from '../../../components/FilterBar'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'

type LeaveRow = HrmLeave & Record<string, unknown>

function leaveDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
}

export function HrmLeavesPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [successToast, setSuccessToast] = useState('')
  const [actionError, setActionError] = useState('')

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

  const rows = query.data ?? []

  return (
    <div>
      <PageHeader
        title="الإجازات"
        subtitle="مراجعة طلبات الإجازة واعتمادها أو رفضها"
      />

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      {actionError && (
        <p className="mb-md text-sm text-error">{actionError}</p>
      )}

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
            {
              key: 'employee',
              header: 'الموظف',
              render: (row) => row.employee?.name ?? '—',
            },
            {
              key: 'leaveType',
              header: 'النوع',
              render: (row) => row.leaveType?.name ?? '—',
            },
            { key: 'start_date', header: 'من' },
            { key: 'end_date', header: 'إلى' },
            {
              key: 'days',
              header: 'الأيام',
              render: (row) => leaveDays(String(row.start_date), String(row.end_date)),
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge
                  status={String(row.status)}
                  label={
                    row.status === 'approved'
                      ? 'معتمدة'
                      : row.status === 'rejected'
                        ? 'مرفوضة'
                        : 'معلقة'
                  }
                />
              ),
            },
            {
              key: 'actions',
              header: 'إجراءات',
              render: (row) =>
                row.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ id: row.id, action: 'approve' })}
                      className="text-sm text-secondary hover:underline disabled:opacity-50"
                    >
                      اعتماد
                    </button>
                    <button
                      type="button"
                      disabled={actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ id: row.id, action: 'reject' })}
                      className="text-sm text-error hover:underline disabled:opacity-50"
                    >
                      رفض
                    </button>
                  </div>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
