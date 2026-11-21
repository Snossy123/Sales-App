import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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

  const isBlinking = status.status !== 'ONLINE / SYNCED'

  const dotColor =
    status.status === 'ONLINE / SYNCED'
      ? 'bg-emerald-500'
      : status.status === 'SYNCING'
        ? 'bg-amber-500'
        : 'bg-error'

  const statusTextColor =
    status.status === 'ONLINE / SYNCED'
      ? 'text-emerald-600'
      : status.status === 'SYNCING'
        ? 'text-amber-600'
        : 'text-error'

  const last = status.last_successful_sync
    ? new Date(status.last_successful_sync).toLocaleString('ar-EG')
    : 'لا توجد مزامنة ناجحة بعد'

  return (
    <div className="group relative flex items-center" tabIndex={0}>
      <Link
        to="/sync-debug"
        className="relative flex h-3 w-3 cursor-pointer"
        aria-label={status.status}
      >
        {isBlinking && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColor}`}
          />
        )}
        <span className={`relative inline-flex h-3 w-3 rounded-full ${dotColor}`} />
      </Link>

      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-64 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-xs shadow-lg group-hover:block group-focus-within:block">
        <div className="mb-1.5 flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
          <span className={`font-bold ${statusTextColor}`}>{status.status}</span>
        </div>
        <p className="text-on-surface-variant">آخر نجاح: {last}</p>
        <div className="mt-2 flex items-center justify-between border-t border-outline-variant/60 pt-2 text-on-surface-variant">
          <span>معلّق: {status.pending_operations ?? 0}</span>
          <span>فاشل: {status.failed_operations ?? 0}</span>
        </div>
      </div>
    </div>
  )
}
