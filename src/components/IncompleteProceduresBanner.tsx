import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from './Icon'
import {
  selectUserDrafts,
  useProcedureDraftStore,
} from '../stores/procedureDraftStore'
import { useAuthStore } from '../stores/authStore'

export function IncompleteProceduresBanner() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const drafts = useProcedureDraftStore((s) => s.drafts)
  const clearDraft = useProcedureDraftStore((s) => s.clearDraft)
  const { pathname } = useLocation()
  const items = selectUserDrafts(drafts, userId).filter(
    (draft) => pathname !== draft.resumePath.split('?')[0],
  )

  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  return (
    <div className="relative print:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`إجراءات غير مكتملة: ${items.length}`}
        title={`عندك ${items.length} إجراء غير مكتمل`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container"
      >
        <Icon name="history" className="text-primary no-flip" />
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
          {items.length > 9 ? '9+' : items.length}
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
          <div className="border-b border-outline-variant px-sm py-xs">
            <span className="text-sm font-bold">إجراءات غير مكتملة</span>
          </div>
          <ul className="max-h-72 space-y-xs overflow-y-auto p-sm">
            {items.map((draft) => (
              <li
                key={draft.id}
                className="flex flex-wrap items-center justify-between gap-xs rounded-lg bg-surface-container-low px-sm py-xs"
              >
                <span className="text-sm text-on-surface">{draft.titleAr}</span>
                <div className="flex items-center gap-xs">
                  <Link
                    to={draft.resumePath}
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-primary px-sm py-1 text-xs font-bold text-on-primary hover:opacity-90"
                  >
                    متابعة
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const title = draft.titleAr
                      if (window.confirm('تجاهل مسودة ' + title + '؟')) {
                        clearDraft(draft.id, draft.userId)
                      }
                    }}
                    className="rounded-lg border border-outline-variant px-sm py-1 text-xs font-bold text-on-surface-variant hover:bg-surface-container-lowest"
                  >
                    تجاهل
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
