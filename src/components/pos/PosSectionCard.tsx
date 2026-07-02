import type { ReactNode } from 'react'
import { posSectionTitleClass } from './posFormStyles'

interface PosSectionCardProps {
  number: number
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function PosSectionCard({
  number,
  title,
  subtitle,
  children,
  className = '',
  contentClassName = 'p-sm sm:p-md',
}: PosSectionCardProps) {
  return (
    <section
      className={`rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm ${className}`}
    >
      <div className="flex items-start gap-sm border-b border-outline-variant/60 px-sm py-sm sm:px-md">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
          {number}
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className={posSectionTitleClass}>{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  )
}
