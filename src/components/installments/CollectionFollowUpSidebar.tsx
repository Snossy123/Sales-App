import { useEffect } from 'react'
import { Icon } from '../Icon'
import {
  InstallmentCollectionGroupedList,
} from './InstallmentCollectionGroupedList'
import type { CollectionSortMode, InstallmentCollectionRow } from '../../lib/collectionHelpers'

interface CollectionFollowUpSidebarProps {
  open: boolean
  onClose: () => void
  rows: InstallmentCollectionRow[]
  selectedId?: number | null
  onSelect: (row: InstallmentCollectionRow) => void
  onReconcile: (row: InstallmentCollectionRow) => void
  collectors?: Array<{ id: number; name: string }>
  canAssign?: boolean
  onAssignCollector?: (invoiceId: number, collectorUserId: number | null) => void
  assigningInvoiceId?: number | null
  sortMode?: CollectionSortMode
}

export function CollectionFollowUpSidebar({
  open,
  onClose,
  rows,
  selectedId,
  onSelect,
  onReconcile,
  collectors = [],
  canAssign = false,
  onAssignCollector,
  assigningInvoiceId = null,
  sortMode = 'reminder',
}: CollectionFollowUpSidebarProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const contractCount = new Set(rows.map((row) => row.sales_invoice_id)).size

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="إغلاق المتابعات"
        onClick={onClose}
      />
      <aside
        className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-surface-container-lowest shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-up-sidebar-title"
      >
        <div className="flex items-center justify-between gap-sm border-b border-outline-variant px-md py-sm">
          <div>
            <h2 id="follow-up-sidebar-title" className="text-base font-semibold text-on-surface">
              المتابعات القادمة
            </h2>
            <p className="text-xs text-on-surface-variant">
              {contractCount} عقد · {rows.length} قسط
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low"
            aria-label="إغلاق"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-md">
          <InstallmentCollectionGroupedList
            rows={rows}
            sortMode={sortMode}
            selectedId={selectedId}
            onSelect={onSelect}
            onReconcile={onReconcile}
            emptyMessage="لا توجد متابعات قادمة لهذا الفرع"
            collectors={collectors}
            canAssign={canAssign}
            onAssignCollector={onAssignCollector}
            assigningInvoiceId={assigningInvoiceId}
          />
        </div>
      </aside>
    </div>
  )
}
