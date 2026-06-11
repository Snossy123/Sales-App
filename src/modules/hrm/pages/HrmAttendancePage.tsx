import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { HrmAttendance, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { FilterBar } from '../../../components/FilterBar'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'

type AttendanceRow = HrmAttendance & Record<string, unknown>

function formatTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

export function HrmAttendancePage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [successToast, setSuccessToast] = useState('')

  const query = useQuery({
    queryKey: ['hrm', 'attendance', statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 50,
        include: 'employee,shift',
      }
      if (statusFilter) params['filter[status]'] = statusFilter

      const { data } = await api.get<PaginatedResponse<HrmAttendance>>('/hrm/attendance', { params })
      return data.data
    },
  })

  const openSession = useMemo(
    () => (query.data ?? []).find((row) => row.clock_in_time && !row.clock_out_time),
    [query.data],
  )

  const clockMutation = useMutation({
    mutationFn: async (type: 'clock_in' | 'clock_out') => {
      const { data } = await api.post<HrmAttendance>('/hrm/clock-in-out', { type })
      return data
    },
    onSuccess: (_, type) => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] })
      setSuccessToast(type === 'clock_in' ? 'تم تسجيل الحضور' : 'تم تسجيل الانصراف')
    },
  })

  const rows = query.data ?? []

  return (
    <div>
      <PageHeader
        title="الحضور والانصراف"
        subtitle="متابعة سجلات الحضور وتسجيل الدخول والخروج"
        actions={
          <div className="flex gap-xs">
            <button
              type="button"
              disabled={clockMutation.isPending || Boolean(openSession)}
              onClick={() => clockMutation.mutate('clock_in')}
              className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary disabled:opacity-50"
            >
              <Icon name="login" size={18} />
              تسجيل حضور
            </button>
            <button
              type="button"
              disabled={clockMutation.isPending || !openSession}
              onClick={() => clockMutation.mutate('clock_out')}
              className="flex items-center gap-xs rounded-lg bg-secondary px-md py-sm text-sm font-bold text-on-secondary disabled:opacity-50"
            >
              <Icon name="logout" size={18} />
              تسجيل انصراف
            </button>
          </div>
        }
      />

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      {clockMutation.isError && (
        <p className="mb-md text-sm text-error">{getErrorMessage(clockMutation.error)}</p>
      )}

      {openSession && (
        <div className="mb-md rounded-lg border border-secondary/30 bg-secondary/5 px-md py-sm text-sm text-on-surface">
          جلسة حضور مفتوحة منذ {formatTime(openSession.clock_in_time)}
        </div>
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
              { value: 'present', label: 'حاضر' },
              { value: 'absent', label: 'غائب' },
              { value: 'late', label: 'متأخر' },
            ],
          },
        ]}
        showClear={Boolean(statusFilter)}
        onClear={() => setStatusFilter('')}
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<AttendanceRow>
          data={rows as AttendanceRow[]}
          keyExtractor={(row) => row.id}
          emptyMessage="لا توجد سجلات حضور"
          columns={[
            { key: 'date', header: 'التاريخ' },
            {
              key: 'employee',
              header: 'الموظف',
              render: (row) => row.employee?.name ?? '—',
            },
            {
              key: 'shift',
              header: 'الوردية',
              render: (row) => row.shift?.name ?? '—',
            },
            {
              key: 'clock_in_time',
              header: 'دخول',
              render: (row) => formatTime(row.clock_in_time),
            },
            {
              key: 'clock_out_time',
              header: 'خروج',
              render: (row) => formatTime(row.clock_out_time),
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge
                  status={String(row.status ?? 'default')}
                  label={
                    row.status === 'present'
                      ? 'حاضر'
                      : row.status === 'absent'
                        ? 'غائب'
                        : row.status === 'late'
                          ? 'متأخر'
                          : String(row.status ?? '—')
                  }
                />
              ),
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
