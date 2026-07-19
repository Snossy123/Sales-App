import type { ReactNode } from 'react'
import { Icon } from '../../../../components/Icon'

interface CeoKpiCardProps {
  label: string
  value: ReactNode
  icon: string
  variant?: 'primary' | 'default'
  iconTone?: 'primary' | 'purple' | 'green' | 'default'
  subtitle?: ReactNode
  progress?: number
  changePercent?: number | null
  changeLabel?: string
}

const ICON_TONES: Record<NonNullable<CeoKpiCardProps['iconTone']>, string> = {
  primary: 'bg-[#eef3ff] text-primary',
  purple: 'bg-[#f1ecfe] text-[#7c5cfc]',
  green: 'bg-[#e9f7ef] text-[#16a34a]',
  default: 'bg-[#eef3ff] text-primary',
}

export function CeoKpiCard({
  label,
  value,
  icon,
  variant = 'default',
  iconTone = 'default',
  subtitle,
  progress,
  changePercent,
  changeLabel,
}: CeoKpiCardProps) {
  if (variant === 'primary') {
    return (
      <div className="flex flex-col gap-4 rounded-[18px] bg-primary p-5 text-on-primary shadow-[0_12px_26px_rgba(42,91,215,0.24)]">
        <div className="flex items-start justify-between">
          <span className="text-[13.5px] font-semibold text-[#d5e0fb]">{label}</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-white/16">
            <Icon name={icon} size={20} className="text-white" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[30px] font-bold leading-none tracking-tight">{value}</div>
          {changePercent != null && (
            <div className="inline-flex items-center gap-1.5 self-start rounded-lg bg-white/16 px-2.5 py-1 text-xs font-semibold">
              <Icon name="trending_up" size={14} className="text-white" />
              {changePercent > 0 ? '+' : ''}
              {changePercent}% {changeLabel ?? 'عن الفترة السابقة'}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-[18px] border border-[#edeff4] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between">
        <span className="text-[13.5px] font-semibold text-[#7a8194]">{label}</span>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-[11px] ${ICON_TONES[iconTone]}`}
        >
          <Icon name={icon} size={20} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-[30px] font-bold leading-none tracking-tight text-[#141821]">{value}</div>
        {progress != null && (
          <div className="h-[7px] overflow-hidden rounded-full bg-[#eef1f6]">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        )}
        {subtitle && (
          <div className="text-[12.5px] font-medium text-[#8890a0]">{subtitle}</div>
        )}
      </div>
    </div>
  )
}
