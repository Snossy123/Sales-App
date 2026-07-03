import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ServiceEvaluationRequest, ServiceEvaluationRequestStatus } from '../../api/types'
import { AsyncState } from '../../components/AsyncState'
import { DataTable } from '../../components/DataTable'
import { FilterBar } from '../../components/FilterBar'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDate } from '../../lib/accounting'
import { EVALUATION_STATUS_LABELS, listEvaluationRequests } from '../api'

const STATUS_OPTIONS = [
  { value: 'pending', label: EVALUATION_STATUS_LABELS.pending },
  { value: 'completed', label: EVALUATION_STATUS_LABELS.completed },
  { value: 'unreachable', label: EVALUATION_STATUS_LABELS.unreachable },
  { value: '', label: 'الكل' },
]

export function EvaluationQueuePage() {
  const [statusFilter, setStatusFilter] = useState<ServiceEvaluationRequestStatus | ''>('pending')

  const query = useQuery({
    queryKey: ['review', 'evaluation-requests', statusFilter],
    queryFn: () => listEvaluationRequests({ status: statusFilter }),
  })

  const rows = query.data?.data ?? []

  return (
    <div>
      <PageHeader
        title="تقييم العملاء"
        subtitle="العملاء الذين يحتاجون أخذ رأيهم بعد تركيب الجهاز"
      />

      <FilterBar
        selects={[
          {
            id: 'status',
            label: 'الحالة',
            value: statusFilter,
            options: STATUS_OPTIONS,
            onChange: (value) => setStatusFilter(value as ServiceEvaluationRequestStatus | ''),
          },
        ]}
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<ServiceEvaluationRequest & Record<string, unknown>>
          data={rows as (ServiceEvaluationRequest & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={15}
          emptyMessage="لا يوجد عملاء بانتظار التقييم"
          columns={[
            { key: 'customer_name', header: 'العميل', render: (row) => row.customer_name ?? '—' },
            {
              key: 'customer_phone',
              header: 'الهاتف',
              className: 'tabular-nums',
              render: (row) => row.customer_phone ?? '—',
            },
            { key: 'invoice_number', header: 'العقد', render: (row) => row.invoice_number ?? '—' },
            {
              key: 'executed_at',
              header: 'تاريخ التنفيذ',
              render: (row) => (row.executed_at ? formatDate(row.executed_at) : '—'),
            },
            { key: 'technician_name', header: 'الفني', render: (row) => row.technician_name ?? '—' },
            {
              key: 'vehicle_info',
              header: 'المركبة',
              render: (row) => row.vehicle_info ?? row.serial_number ?? '—',
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge status={row.status} label={EVALUATION_STATUS_LABELS[row.status]} />
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row) =>
                row.status === 'pending' ? (
                  <Link
                    to={`/review/evaluation-queue/${row.id}`}
                    className="rounded-lg bg-primary px-md py-1.5 text-sm font-bold text-on-primary"
                  >
                    تسجيل التقييم
                  </Link>
                ) : (
                  <Link
                    to={`/review/evaluation-queue/${row.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    عرض
                  </Link>
                ),
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
