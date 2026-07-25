import type { ReactNode } from 'react'

interface CeoCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  headerClassName?: string
  icon?: ReactNode
}

export function CeoCard({
  title,
  subtitle,
  action,
  children,
  className = '',
  headerClassName = '',
  icon,
}: CeoCardProps) {
  return (
    <div
      className={`flex flex-col p-[18px] ${className}`}
      style={{
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border)',
        borderRadius: 'var(--crm-radius-md)',
        boxShadow: 'var(--crm-shadow)',
      }}
    >
      <div className={`mb-3.5 flex items-start justify-between gap-2.5 ${headerClassName}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          {icon}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[14.5px] font-bold" style={{ color: 'var(--crm-text)' }}>
              {title}
            </span>
            {subtitle && (
              <span className="text-xs font-medium" style={{ color: 'var(--crm-text-faint)' }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
