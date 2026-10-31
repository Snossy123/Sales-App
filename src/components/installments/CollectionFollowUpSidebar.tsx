import { useEffect, useMemo } from 'react'
import { Icon } from '../Icon'
import { InstallmentCollectionGroupedList } from './InstallmentCollectionGroupedList'
import type { InstallmentCollectionRow } from '../../lib/collectionHelpers'
import { normalizeInstallmentItem } from '../../lib/sales'
import { useInstallmentPages } from '../../lib/installmentPages'

interface CollectionFollowUpSidebarProps {
  open: boolean
  onClose: () => void
  branchId?: number | null
  search?: string
  selectedId?: number | null
  onSelect: (row: InstallmentCollectionRow) => void
  onReconcile: (row: InstallmentCollectionRow) => void
  pageKey?: string | number
}

export function CollectionFollowUpSidebar({
  open,
  onClose,
  branchId,
  search,
  selectedId,
  onSelect,
  onReconcile,
  pageKey,
}: CollectionFollowUpSidebarProps) {
  const query = useInstallmentPages(
    {
      'filter[branch_id]': branchId ?? undefined,
      'filter[search]': search || undefined,
      'filter[parked_follow_up]': 1,
      sort: 'reminder',
    },
    open && Boolean(branchId),
  )

  const rows = useMemo(
    () =>
      (query.data?.pages ?? []).flatMap((page) =>
        page.data.map((item) => normalizeInstallmentItem(item) as InstallmentCollectionRow),
      ),
    [query.data],
  )

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
        className="absolute inset-0 bg-black/45"
        aria-label="إغلاق المتابعات"
        onClick={onClose}
      />
      <aside
        dir="rtl"
        className="absolute inset-y-0 left-0 flex w-[min(100%,36rem)] max-w-xl flex-col rounded-e-2xl border-e border-outline-variant bg-surface shadow-[0_16px_48px_rgba(15,23,42,0.28)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-up-sidebar-title"
      >
        <div className="flex items-center justify-between gap-sm border-b border-outline-variant px-md py-sm">
          <div className="flex min-w-0 items-center gap-sm">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name="schedule" size={20} />
            </span>
            <div className="min-w-0">
              <h2 id="follow-up-sidebar-title" className="text-base font-semibold text-on-surface">
                المتابعات القادمة
              </h2>
              <p className="text-xs text-on-surface-variant">
                {contractCount} عقد · {rows.length} قسط
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            aria-label="إغلاق"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-sm overflow-y-auto p-md">
          {query.isLoading ? (
            <p className="text-sm text-on-surface-variant">جاري التحميل…</p>
          ) : query.isError ? (
            <p className="text-sm text-error">تعذر تحميل المتابعات</p>
          ) : (
            <InstallmentCollectionGroupedList
              rows={rows}
              sortMode="reminder"
              selectedId={selectedId}
              onSelect={onSelect}
              onReconcile={onReconcile}
              emptyMessage="لا توجد متابعات قادمة لهذا الفرع"
              compact
              pageKey={pageKey}
              hasNextPage={query.hasNextPage}
              isFetchingNextPage={query.isFetchingNextPage}
              onLoadMore={() => {
                if (!query.isFetchingNextPage) void query.fetchNextPage()
              }}
            />
          )}
        </div>
      </aside>
    </div>
  )
}
