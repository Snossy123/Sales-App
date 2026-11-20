import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

type SyncStatus = {
  mode: 'cloud' | 'branch'
  status?: 'ONLINE / SYNCED' | 'OFFLINE' | 'SYNCING' | 'SYNC ERROR'
  last_successful_sync?: string | null
  pending_operations?: number
  failed_operations?: number
  cloud_reachable?: boolean
}

export function SyncStatusIndicator() {
  const query = useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => (await api.get<SyncStatus>('/sync/status')).data,
    refetchInterval: 15000,
    retry: false,
  })

  const status = query.data
  if (!status || status.mode !== 'branch' || !status.status) {
    return null
  }

  const tone =
    status.status === 'ONLINE / SYNCED'
      ? 'bg-primary-container text-on-primary-container'
      : status.status === 'SYNCING'
        ? 'bg-secondary-container text-on-secondary-container'
        : status.status === 'OFFLINE'
          ? 'bg-surface-container-high text-on-surface-variant'
          : 'bg-error-container text-on-error-container'

  const last = status.last_successful_sync
    ? new Date(status.last_successful_sync).toLocaleString('ar-EG')
    : 'لا توجد مزامنة ناجحة بعد'

  return (
    <div className={`hidden items-center gap-2 rounded-full px-3 py-1 text-xs sm:flex ${tone}`} title={status.status}>
      <span className="font-bold">{status.status}</span>
      <span>آخر نجاح: {last}</span>
      <span>معلّق {status.pending_operations ?? 0}</span>
      <span>فاشل {status.failed_operations ?? 0}</span>
    </div>
  )
}
