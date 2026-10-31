import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { CollectionFollowUpLog } from '../../api/types'
import { collectionStatusLabels } from '../../lib/collectionHelpers'
import { formatDatetime12hDisplay } from '../../lib/datetime12h'
import { Modal } from '../Modal'

interface CollectionFollowUpHistoryModalProps {
  salesInvoiceId: number | null | undefined
  invoiceNumber?: string | null
  open: boolean
  onClose: () => void
}

function installmentGroupKey(log: CollectionFollowUpLog): string {
  return log.installment_item_id != null
    ? `installment:${log.installment_item_id}`
    : 'contract'
}

function installmentGroupLabel(log: CollectionFollowUpLog): string {
  if (log.installment_item_id == null) return 'متابعة على مستوى العقد'
  const sequence = log.installment_sequence
  return sequence != null ? `القسط #${sequence}` : 'قسط'
}

export function CollectionFollowUpHistoryModal({
  salesInvoiceId,
  invoiceNumber,
  open,
  onClose,
}: CollectionFollowUpHistoryModalProps) {
  const query = useQuery({
    queryKey: ['collection-follow-ups', salesInvoiceId],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectionFollowUpLog[] }>(
        `/sales-invoices/${salesInvoiceId}/collection-follow-ups`,
      )
      return data.data
    },
    enabled: open && Boolean(salesInvoiceId),
  })

  const logs = query.data ?? []
  const groups: { key: string, label: string, logs: CollectionFollowUpLog[] }[] = []
  const indexByKey = new Map<string, number>()
  for (const log of logs) {
    const key = installmentGroupKey(log)
    const existing = indexByKey.get(key)
    if (existing != null) {
      groups[existing].logs.push(log)
      continue
    }
    indexByKey.set(key, groups.length)
    groups.push({ key, label: installmentGroupLabel(log), logs: [log] })
  }

  return (
    <Modal open={open} onClose={onClose} title="سجل متابعة العقد" size="md">
      {!salesInvoiceId ? (
        <p className="text-sm text-on-surface-variant">لا يوجد عقد محدد</p>
      ) : query.isLoading ? (
        <p className="py-md text-center text-sm text-on-surface-variant">جاري التحميل...</p>
      ) : query.isError ? (
        <p className="text-sm text-error">تعذر تحميل سجل المتابعة</p>
      ) : (
        <>
          <p className="mb-sm text-sm font-medium text-on-surface">
            العقد {invoiceNumber || '—'}
          </p>
          {logs.length === 0 ? (
            <p className="text-sm text-on-surface-variant">لا يوجد سجل متابعة بعد</p>
          ) : (
            <div className="max-h-[24rem] space-y-sm overflow-y-auto">
              {groups.map((group) => (
                <section key={group.key}>
                  <h3 className="mb-xs text-xs font-semibold text-on-surface-variant">{group.label}</h3>
                  <ul className="space-y-sm">
                    {group.logs.map((log) => (
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
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
