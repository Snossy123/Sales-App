import type { ReactNode } from 'react'
import { PageHeader } from './PageHeader'

interface SalesPageShellProps {
  title: string
  subtitle?: string
  headerExtra?: ReactNode
  actions?: ReactNode
  filters?: ReactNode
  children: ReactNode
}

export function SalesPageShell({
  title,
  subtitle,
  headerExtra,
  actions,
  filters,
  children,
}: SalesPageShellProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} extra={headerExtra} actions={actions} />
      {filters}
      {children}
    </div>
  )
}
