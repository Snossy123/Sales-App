import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '../../../api/client'
import type { SupportTask, SupportTaskStatus } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import {
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_TRANSITIONS,
  listSupportTasks,
  updateSupportTaskStatus,
} from '../api'

const QUERY_KEY = ['support-tasks', 'mine']

// Support employees advance their own work forward; cancelling/reopening is an admin action.
function forwardStatuses(status: SupportTaskStatus): SupportTaskStatus[] {
  return SUPPORT_STATUS_TRANSITIONS[status].filter((s) => s !== 'cancelled' && s !== 'pending')
}

export function MyTasksPage() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listSupportTasks(),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: SupportTaskStatus }) =>
      updateSupportTaskStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const rows = query.data?.data ?? []

  return (
    <div>
      <PageHeader title="مهامي" subtitle="مهام تركيب أجهزة التتبع المسندة إليك" />

      {statusMutation.isError && (
        <p className="mb-sm text-sm text-error">{getErrorMessage(statusMutation.error)}</p>
      )}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<SupportTask & Record<string, unknown>>
          data={rows as (SupportTask & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          columns={[
            { key: 'invoice_number', header: 'العقد', render: (row) => row.invoice_number ?? '—' },
            { key: 'customer_name', header: 'العميل', render: (row) => row.customer_name ?? '—' },
            { key: 'customer_phone', header: 'الهاتف', className: 'tabular-nums', render: (row) => row.customer_phone ?? '—' },
            { key: 'serial_number', header: 'السيريال', render: (row) => row.serial_number ?? '—' },
            { key: 'vehicle_info', header: 'المركبة', render: (row) => row.vehicle_info ?? row.vehicle_type ?? '—' },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => <StatusBadge status={row.status} label={SUPPORT_STATUS_LABELS[row.status]} />,
            },
            {
              key: 'actions',
              header: '',
              render: (row) => {
                const next = forwardStatuses(row.status)
                if (next.length === 0) return <span className="text-on-surface-variant">—</span>
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    {next.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => statusMutation.mutate({ id: row.id, status })}
                        disabled={statusMutation.isPending}
                        className="rounded-lg bg-primary px-md py-1.5 text-sm font-bold text-on-primary"
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
    </div>
  )
}
