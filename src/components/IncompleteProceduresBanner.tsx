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

  if (items.length === 0) return null

  return (
    <div className="mb-md rounded-xl border border-primary/30 bg-primary/5 px-md py-sm print:hidden">
      <div className="mb-xs flex items-center gap-xs text-sm font-bold text-primary">
        <Icon name="history" size={18} className="no-flip" />
        <span>
          عندك {items.length} إجراء غير مكتمل
        </span>
      </div>
      <ul className="space-y-xs">
        {items.map((draft) => {
          return (
            <li
              key={draft.id}
              className="flex flex-wrap items-center justify-between gap-xs rounded-lg bg-surface-container-lowest px-sm py-xs"
            >
              <span className="text-sm text-on-surface">{draft.titleAr}</span>
              <div className="flex items-center gap-xs">
                <Link
                  to={draft.resumePath}
                  className="rounded-lg bg-primary px-sm py-1 text-xs font-bold text-on-primary hover:opacity-90"
                >
                  متابعة
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`تجاهل مسودة «${draft.titleAr}»؟`)) {
                      clearDraft(draft.id, draft.userId)
                    }
                  }}
                  className="rounded-lg border border-outline-variant px-sm py-1 text-xs font-bold text-on-surface-variant hover:bg-surface-container-low"
                >
                  تجاهل
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
