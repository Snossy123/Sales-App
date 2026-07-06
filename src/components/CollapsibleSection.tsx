import { useState, type ReactNode } from 'react'
import { Icon } from './Icon'

interface CollapsibleSectionProps {
  title: string
  summary?: string
  icon?: string
  defaultOpen?: boolean
  isLoading?: boolean
  className?: string
  children: ReactNode
}

export function CollapsibleSection({
  title,
  summary,
  icon = 'analytics',
  defaultOpen = false,
  isLoading = false,
  className = '',
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={`overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest ${className || 'mb-md'}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-sm px-md py-sm text-right transition-colors hover:bg-surface-container-low"
      >
        <div className="flex items-center gap-sm">
          <Icon name={icon} size={20} className="text-primary" />
          <span className="text-sm font-bold text-on-surface">{title}</span>
          {!open && summary && (
            <span className="text-xs text-on-surface-variant">· {summary}</span>
          )}
        </div>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={22} className="text-on-surface-variant" />
      </button>

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
