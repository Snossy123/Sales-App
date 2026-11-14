import type { ReactNode } from 'react'

export interface CrmTableProps {
  header: ReactNode
  footer?: ReactNode
  children: ReactNode
  /** Maximum height of the scrollable table body. Defaults to 'min(62vh, 480px)'. Pass `null` or `'none'` to disable capping. */
  maxBodyHeight?: string | number | null
  /** Minimum width for the table content to ensure columns don't compress. */
  minWidth?: string | number
  className?: string
  bodyClassName?: string
  /** Whether the table body is scrollable. Defaults to true. */
  scrollable?: boolean
  /** Remove border, radius, and shadow when nested inside an outer panel card */
  borderless?: boolean
}

export function CrmTable({
  header,
  footer,
  children,
  maxBodyHeight = 'min(62vh, 480px)',
  minWidth,
  className = '',
  bodyClassName = '',
  scrollable = true,
  borderless = false,
}: CrmTableProps) {
  const isCapped = scrollable && maxBodyHeight != null && maxBodyHeight !== 'none'

  const content = (
    <div className="flex flex-col" style={minWidth ? { minWidth } : undefined}>
      <div className="shrink-0">{header}</div>
      <div
        className={`min-h-0 ${scrollable ? 'overflow-y-auto overscroll-contain' : ''} ${bodyClassName}`}
        style={isCapped ? { maxHeight: maxBodyHeight } : undefined}
      >
        {children}
      </div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>
  )

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        background: 'var(--crm-surface)',
        border: borderless ? 'none' : '1px solid var(--crm-border)',
        borderRadius: borderless ? 0 : 'var(--crm-radius-md)',
        boxShadow: borderless ? 'none' : 'var(--crm-shadow)',
      }}
    >
      <div className="overflow-x-auto">
        {content}
      </div>
    </div>
  )
}

export function CrmTableHeader({
  columns,
  children,
}: {
  columns: string
  children: ReactNode
}) {
  return (
    <div
      className="grid items-center gap-2.5 px-3.5 py-2.5"
      style={{
        gridTemplateColumns: columns,
        background: 'var(--crm-surface-muted)',
        borderBottom: '1px solid var(--crm-border-soft)',
      }}
    >
      {children}
    </div>
  )
}

export function CrmTableHeaderCell({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11.5px] font-semibold" style={{ color: 'var(--crm-text-muted)' }}>
      {children}
    </span>
  )
}

export function CrmTableRow({
  columns,
  children,
  onClick,
  selected,
}: {
  columns: string
  children: ReactNode
  onClick?: () => void
  selected?: boolean
}) {
  return (
    <div
      className="grid items-center gap-2.5 px-3.5 py-3.5 transition-colors"
      onClick={onClick}
      style={{
        gridTemplateColumns: columns,
        borderBottom: '1px solid var(--crm-border-soft)',
        background: selected ? 'var(--crm-primary-soft)' : 'var(--crm-surface)',
        cursor: onClick ? 'pointer' : undefined,
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'var(--crm-surface-muted)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = selected
          ? 'var(--crm-primary-soft)'
          : 'var(--crm-surface)'
      }}
    >
      {children}
    </div>
  )
}

export function CrmTableFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-3.5">{children}</div>
  )
}

export function CrmCheckbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className="flex h-[18px] w-[18px] items-center justify-center text-[11px] text-white"
      style={{
        borderRadius: 'var(--crm-radius-sm)',
        border: `1.5px solid ${checked ? 'var(--crm-primary)' : 'var(--crm-text-disabled)'}`,
        background: checked ? 'var(--crm-primary)' : 'var(--crm-surface)',
      }}
    >
      {checked ? '✓' : ''}
    </button>
  )
}
