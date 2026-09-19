import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { CollectionFollowUpLog } from '../../api/types'
import { collectionStatusLabels } from '../../lib/collectionHelpers'
import { formatDatetime12hDisplay } from '../../lib/datetime12h'
import { Modal } from '../Modal'

interface CollectionFollowUpHistoryModalProps {
  installmentId: number | null | undefined
  invoiceNumber?: string | null
  installmentSequence?: number | null
  open: boolean
  onClose: () => void
}

export function CollectionFollowUpHistoryModal({
  installmentId,
  invoiceNumber,
  installmentSequence,
  open,
  onClose,
}: CollectionFollowUpHistoryModalProps) {
  const query = useQuery({
    queryKey: ['collection-follow-ups', 'installment', installmentId],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectionFollowUpLog[] }>(
        `/installments/${installmentId}/collection-follow-ups`,
      )
      return data.data
    },
    enabled: open && Boolean(installmentId),
  })

  const logs = query.data ?? []
  const contractLabel = invoiceNumber || '—'
  const installmentLabel = installmentSequence != null ? `#${installmentSequence}` : '—'

  return (
    <Modal open={open} onClose={onClose} title="سجل متابعة التحصيل" size="md">
      {!installmentId ? (
        <p className="text-sm text-on-surface-variant">لا يوجد قسط محدد</p>
      ) : query.isLoading ? (
        <p className="py-md text-center text-sm text-on-surface-variant">جاري التحميل...</p>
      ) : query.isError ? (
        <p className="text-sm text-error">تعذر تحميل سجل المتابعة</p>
      ) : (
        <>
          <p className="mb-sm text-sm font-medium text-on-surface">
            العقد {contractLabel} · القسط {installmentLabel}
          </p>
          {logs.length === 0 ? (
            <p className="text-sm text-on-surface-variant">لا يوجد سجل متابعة بعد</p>
          ) : (
            <ul className="max-h-[24rem] space-y-sm overflow-y-auto">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-lg border border-outline-variant bg-surface-container-low/50 px-sm py-sm"
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
          )}
        </>
      )}
    </Modal>
  )
}
