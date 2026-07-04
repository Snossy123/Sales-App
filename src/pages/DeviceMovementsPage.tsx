import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { DeviceMovement, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { useAuthStore } from '../stores/authStore'

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'pending', label: 'بانتظار التأكيد' },
  { value: 'confirmed', label: 'مؤكّدة' },
  { value: 'rejected', label: 'مرفوضة' },
  { value: 'cancelled', label: 'ملغاة' },
]

const DIRECTION_OPTIONS = [
  { value: '', label: 'كل الحركات' },
  { value: 'incoming', label: 'واردة إليّ' },
  { value: 'outgoing', label: 'صادرة مني' },
]

const STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار التأكيد',
  confirmed: 'مؤكّدة',
  rejected: 'مرفوضة',
  cancelled: 'ملغاة',
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function warehouseLabel(warehouse?: DeviceMovement['from_warehouse']): string {
  if (!warehouse) return '—'
  const branch = warehouse.branch?.name_ar || warehouse.branch?.name
  const name = warehouse.name_ar || warehouse.name
  return branch ? `${name} (${branch})` : name
}

export function DeviceMovementsPage() {
  const userId = useAuthStore((s) => s.user?.id)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [directionFilter, setDirectionFilter] = useState('')

  const query = useQuery({
    queryKey: ['device-movements', statusFilter, directionFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 50 }
      if (statusFilter) params['filter[status]'] = statusFilter
      if (directionFilter) params.direction = directionFilter
      const { data } = await api.get<PaginatedResponse<DeviceMovement>>('/device-movements', { params })
      return data.data ?? []
    },
  })

  const pendingIncomingCount = useMemo(() => {
    if (!userId) return 0
    return (query.data ?? []).filter((row) => row.status === 'pending' && row.recipient_user_id === userId).length
  }, [query.data, userId])

  const columns = useMemo(
    () => [
      {
        key: 'movement_number',
        header: 'رقم الحركة',
        render: (row: DeviceMovement) => (
          <Link to={`/inventory/movements/${row.id}`} className="font-medium text-primary hover:underline">
            {row.movement_number}
          </Link>
        ),
      },
      {
        key: 'devices',
        header: 'الأجهزة',
        render: (row: DeviceMovement) => row.lines_count ?? row.lines?.length ?? '—',
      },
      {
        key: 'from',
        header: 'من',
        render: (row: DeviceMovement) => warehouseLabel(row.from_warehouse),
      },
      {
        key: 'to',
        header: 'إلى',
        render: (row: DeviceMovement) => warehouseLabel(row.to_warehouse),
      },
      {
        key: 'sender',
        header: 'المرسل',
        render: (row: DeviceMovement) => row.sender?.name ?? '—',
      },
      {
        key: 'recipient',
        header: 'المستلم',
        render: (row: DeviceMovement) => row.recipient?.name ?? '—',
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (row: DeviceMovement) => (
          <StatusBadge
            status={row.status === 'pending' ? 'pending' : row.status === 'confirmed' ? 'paid' : 'overdue'}
            label={STATUS_LABELS[row.status] ?? row.status}
          />
        ),
      },
      {
        key: 'created_at',
        header: 'التاريخ',
        render: (row: DeviceMovement) => formatDateTime(row.created_at),
      },
    ],
    [],
  )

  return (
    <SalesPageShell
      title="حركات الأجهزة"
      subtitle="نقل الأجهزة بين المخازن مع تأكيد من المستلم"
      actions={
        <Link
          to="/inventory/movements/new"
          className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary hover:bg-primary/90"
        >
          حركة جديدة
        </Link>
      }
      filters={
        <FilterBar
          selects={[
            {
              id: 'direction',
              label: 'الاتجاه',
              value: directionFilter,
              options: DIRECTION_OPTIONS,
              onChange: setDirectionFilter,
            },
            {
              id: 'status',
              label: 'الحالة',
              value: statusFilter,
              options: STATUS_OPTIONS,
              onChange: setStatusFilter,
            },
          ]}
          showClear={Boolean(directionFilter || statusFilter !== 'pending')}
          onClear={() => {
            setDirectionFilter('')
            setStatusFilter('pending')
          }}
        />
      }
    >
      {pendingIncomingCount > 0 && (
        <p className="mb-md rounded-lg border border-orange-300/50 bg-orange-50 px-md py-sm text-sm text-orange-900">
          لديك {pendingIncomingCount} حركة بانتظار تأكيد الاستلام.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
          <DataTable<DeviceMovement & Record<string, unknown>>
            data={(query.data ?? []) as (DeviceMovement & Record<string, unknown>)[]}
            keyExtractor={(row) => row.id}
            pageSize={15}
            emptyMessage="لا توجد حركات أجهزة"
            columns={columns}
          />
        </AsyncState>
      </div>
    </SalesPageShell>
  )
}
