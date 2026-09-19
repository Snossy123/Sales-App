import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { CollectionFollowUpLog } from '../../api/types'
import { collectionStatusLabels } from '../../lib/collectionHelpers'
import { formatDatetime12hDisplay } from '../../lib/datetime12h'

interface ContractFollowUpTabProps {
  invoiceId: number
  active: boolean
}

export function ContractFollowUpTab({ invoiceId, active }: ContractFollowUpTabProps) {
  const query = useQuery({
    queryKey: ['collection-follow-ups', invoiceId],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectionFollowUpLog[] }>(
        `/sales-invoices/${invoiceId}/collection-follow-ups`,
      )
      return data.data
    },
    enabled: active && invoiceId > 0,
  })

  const logs = query.data ?? []

  if (query.isLoading) {
    return <p className="py-md text-center text-sm text-on-surface-variant">جاري التحميل...</p>
  }

  if (query.isError) {
    return <p className="text-sm text-error">تعذر تحميل سجل المتابعة</p>
  }

  if (logs.length === 0) {
    return (
      <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
        لا يوجد سجل متابعة بعد
      </p>
    )
  }

  return (
    <ul className="space-y-sm">
      {logs.map((log) => (
        <li
          key={log.id}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm"
        >
          <div className="mb-xs flex flex-wrap items-center justify-between gap-xs text-xs text-on-surface-variant">
            <span>{formatDatetime12hDisplay(log.created_at)}</span>
            <span>{log.user_name || '—'}</span>
          </div>
          <p className="text-sm font-medium text-on-surface">
            {log.collection_status_label
              || (log.collection_status
                ? collectionStatusLabels[log.collection_status] ?? log.collection_status
                : '—')}
          </p>
          <p className="mt-xs text-xs text-on-surface-variant">
            التذكير: {formatDatetime12hDisplay(log.collection_reminder_at)}
          </p>
          {log.collection_notes ? (
            <p className="mt-xs whitespace-pre-wrap text-sm text-on-surface">{log.collection_notes}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
