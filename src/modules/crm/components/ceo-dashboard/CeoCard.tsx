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
      className={`flex flex-col rounded-[18px] border border-[#edeff4] bg-white p-[22px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}
    >
      <div className={`mb-4 flex items-start justify-between gap-3 ${headerClassName}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          {icon}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-base font-bold text-[#171b24]">{title}</span>
            {subtitle && (
              <span className="text-[12.5px] font-medium text-[#8890a0]">{subtitle}</span>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
