import { useState, type ReactNode } from 'react'
import { Icon } from './Icon'

interface CollapsibleSectionProps {
  title: string
  summary?: string
  icon?: string
  defaultOpen?: boolean
  isLoading?: boolean
  className?: string
  /** Extra controls in the header (e.g. profile link). Clicks do not toggle open/close. */
  actions?: ReactNode
  children: ReactNode
}

export function CollapsibleSection({
  title,
  summary,
  icon = 'analytics',
  defaultOpen = false,
  isLoading = false,
  className = '',
  actions,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={`overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest ${className || 'mb-md'}`}
    >
      <div className="flex w-full items-center gap-sm px-md py-sm transition-colors hover:bg-surface-container-low">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center justify-between gap-sm text-right"
        >
          <div className="flex min-w-0 items-center gap-sm">
            <Icon name={icon} size={20} className="shrink-0 text-primary" />
            <span className="truncate text-sm font-bold text-on-surface">{title}</span>
            {!open && summary && (
              <span className="truncate text-xs text-on-surface-variant">· {summary}</span>
            )}
          </div>
          <Icon name={open ? 'expand_less' : 'expand_more'} size={22} className="shrink-0 text-on-surface-variant" />
        </button>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>

      {open && (
        <div className="border-t border-outline-variant p-md">
          {isLoading ? (
            <p className="py-md text-center text-sm text-on-surface-variant">جاري التحميل...</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}
