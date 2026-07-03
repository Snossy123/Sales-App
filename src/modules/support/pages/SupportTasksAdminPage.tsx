import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Employee, PaginatedResponse, SupportTask, SupportTaskStatus } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { formatDate } from '../../../lib/accounting'
import {
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_TRANSITIONS,
  assignSupportTask,
  listSupportTasks,
  updateSupportTaskStatus,
} from '../api'
import { CompleteTaskModal } from '../components/CompleteTaskModal'

const STATUS_OPTIONS = Object.entries(SUPPORT_STATUS_LABELS) as [SupportTaskStatus, string][]

export function SupportTasksAdminPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<SupportTaskStatus | ''>('')
  const [employeeFilter, setEmployeeFilter] = useState<number | ''>('')
  const [completeTaskId, setCompleteTaskId] = useState<number | null>(null)

  const queryKey = ['support-tasks', 'admin', statusFilter, employeeFilter] as const

  const query = useQuery({
    queryKey,
    queryFn: () => listSupportTasks({ status: statusFilter, employee_id: employeeFilter }),
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'support'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['support-tasks', 'admin'] })

  const assignMutation = useMutation({
    mutationFn: ({ id, employeeId }: { id: number; employeeId: number }) =>
      assignSupportTask(id, employeeId),
    onSuccess: invalidate,
  })

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      executedAt,
    }: {
      id: number
      status: SupportTaskStatus
      executedAt?: string
    }) => updateSupportTaskStatus(id, status, executedAt),
    onSuccess: () => {
      invalidate()
      setCompleteTaskId(null)
    },
  })

  const handleStatusClick = (taskId: number, status: SupportTaskStatus) => {
    if (status === 'completed') {
      setCompleteTaskId(taskId)
      return
    }
    statusMutation.mutate({ id: taskId, status })
  }

  const employees = employeesQuery.data ?? []
  const rows = query.data?.data ?? []
  const mutationError = assignMutation.error ?? statusMutation.error

  return (
    <div>
      <PageHeader title="إدارة مهام الدعم" subtitle="إسناد ومتابعة مهام تركيب أجهزة التتبع" />

      <div className="mb-md flex flex-wrap gap-sm">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SupportTaskStatus | '')}
          className="rounded border border-outline-variant px-sm py-2 text-sm"
        >
          <option value="">كل الحالات</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value ? Number(e.target.value) : '')}
          className="rounded border border-outline-variant px-sm py-2 text-sm"
        >
          <option value="">كل الفنيين</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </div>

      {mutationError && <p className="mb-sm text-sm text-error">{getErrorMessage(mutationError)}</p>}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<SupportTask & Record<string, unknown>>
          data={rows as (SupportTask & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={15}
          columns={[
            { key: 'invoice_number', header: 'العقد', render: (row) => row.invoice_number ?? '—' },
            { key: 'customer_name', header: 'العميل', render: (row) => row.customer_name ?? '—' },
            { key: 'serial_number', header: 'السيريال', render: (row) => row.serial_number ?? '—' },
            { key: 'vehicle_info', header: 'المركبة', render: (row) => row.vehicle_info ?? row.vehicle_type ?? '—' },
            {
              key: 'executed_at',
              header: 'تاريخ التنفيذ',
              render: (row) => (row.executed_at ? formatDate(row.executed_at) : '—'),
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => <StatusBadge status={row.status} label={SUPPORT_STATUS_LABELS[row.status]} />,
            },
            {
              key: 'employee_id',
              header: 'الفني',
              render: (row) => (
                <select
                  value={row.employee_id ?? ''}
                  onChange={(e) =>
                    e.target.value && assignMutation.mutate({ id: row.id, employeeId: Number(e.target.value) })
                  }
                  disabled={assignMutation.isPending}
                  className="rounded border border-outline-variant px-sm py-1.5 text-sm"
                >
                  <option value="">— إسناد —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              key: 'actions',
              header: 'تغيير الحالة',
              render: (row) => {
                const next = SUPPORT_STATUS_TRANSITIONS[row.status]
                if (next.length === 0) return <span className="text-on-surface-variant">—</span>
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    {next.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusClick(row.id, status)}
                        disabled={statusMutation.isPending}
                        className="rounded-lg border border-outline-variant px-sm py-1.5 text-sm hover:bg-surface-container"
                      >
                        {SUPPORT_STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                )
              },
            },
          ]}
        />
      </AsyncState>

      <CompleteTaskModal
        open={completeTaskId !== null}
        onClose={() => setCompleteTaskId(null)}
        isPending={statusMutation.isPending}
        onConfirm={(executedAt) => {
          if (completeTaskId === null) return
          statusMutation.mutate({ id: completeTaskId, status: 'completed', executedAt })
        }}
      />
    </div>
  )
}
