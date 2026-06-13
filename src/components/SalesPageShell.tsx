import type { ReactNode } from 'react'
import { PageHeader } from './PageHeader'

interface SalesPageShellProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  filters?: ReactNode
  children: ReactNode
}

export function SalesPageShell({
  title,
  subtitle,
  actions,
  filters,
  children,
}: SalesPageShellProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {filters}
      {children}
    </div>
  )
}
