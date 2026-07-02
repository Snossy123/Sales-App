import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  extra?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, extra, actions }: PageHeaderProps) {
  return (
    <div className="mb-md flex flex-col gap-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-md">
      <div className="flex min-w-0 flex-col gap-sm sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-md">
        <h1 className="shrink-0 text-xl font-bold text-on-surface sm:text-2xl">{title}</h1>
        {extra ? <div className="min-w-0 w-full sm:w-auto">{extra}</div> : null}
        {subtitle ? (
          <p className="w-full text-sm text-on-surface-variant sm:order-last sm:basis-full">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-xs self-start sm:self-center">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
