import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  extra?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, extra, actions }: PageHeaderProps) {
  return (
    <div className="mb-md flex flex-wrap items-center justify-between gap-md">
      <div className="flex min-w-0 flex-wrap items-center gap-md">
        <h1 className="shrink-0 text-2xl font-bold text-on-surface">{title}</h1>
        {extra}
        {subtitle ? (
          <p className="w-full text-sm text-on-surface-variant">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-xs">{actions}</div> : null}
    </div>
  )
}
