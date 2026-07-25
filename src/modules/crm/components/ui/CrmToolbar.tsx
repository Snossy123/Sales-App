import type { ReactNode } from 'react'

interface CrmToolbarProps {
  hint?: string
  children?: ReactNode
  end?: ReactNode
}

export function CrmToolbar({ hint, children, end }: CrmToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2.5 px-3.5 py-2.5"
      style={{
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border)',
        borderRadius: 'var(--crm-radius-md)',
        boxShadow: 'var(--crm-shadow)',
      }}
    >
      {hint ? (
        <span className="text-xs font-medium" style={{ color: 'var(--crm-text-faint)' }}>
          {hint}
        </span>
      ) : null}
      {children}
      <div className="flex-1" />
      {end}
    </div>
  )
}
