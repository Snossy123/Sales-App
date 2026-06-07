import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export function ChartCard({ title, subtitle, children, className = '' }: ChartCardProps) {
  return (
    <div
      className={`rounded-xl border border-outline-variant bg-surface-container-lowest p-md ${className}`}
    >
      <div className="mb-sm">
        <h3 className="text-sm font-bold text-on-surface">{title}</h3>
        {subtitle && (
          <p className="mt-xs text-xs text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      <div className="min-h-[220px]">{children}</div>
    </div>
  )
}
