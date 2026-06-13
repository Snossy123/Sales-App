import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-md flex flex-wrap items-start justify-between gap-sm">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">{title}</h1>
        {subtitle && (
          <p className="mt-xs text-sm text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-xs">{actions}</div>}
    </div>
  )
}
