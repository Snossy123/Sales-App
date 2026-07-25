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

const ICON_TONES: Record<
  NonNullable<CeoKpiCardProps['iconTone']>,
  { bg: string; color: string }
> = {
  primary: { bg: 'var(--crm-primary-soft)', color: 'var(--crm-primary)' },
  purple: { bg: '#f1ecfe', color: '#7c5cfc' },
  green: { bg: 'var(--crm-success-soft)', color: 'var(--crm-success)' },
  default: { bg: 'var(--crm-primary-soft)', color: 'var(--crm-primary)' },
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
      <div
        className="flex flex-col gap-3.5 px-[18px] py-3.5 text-white"
        style={{
          background: 'var(--crm-primary)',
          border: '1px solid var(--crm-primary)',
          borderRadius: 'var(--crm-radius-md)',
          boxShadow: 'var(--crm-shadow-primary)',
        }}
      >
        <div className="flex items-start justify-between">
          <span className="text-[12.5px] font-medium" style={{ color: '#dbe6fd' }}>
            {label}
          </span>
          <div
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px]"
            style={{ background: 'rgba(255,255,255,.18)' }}
          >
            <Icon name={icon} size={18} className="text-white" />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="text-[29px] font-bold leading-none tracking-[-0.03em]">{value}</div>
          {changePercent != null && (
            <div
              className="inline-flex items-center gap-1.5 self-start rounded-[9px] px-2.5 py-1 text-[11.5px] font-semibold"
              style={{ background: 'rgba(255,255,255,.15)' }}
            >
              <Icon name="trending_up" size={14} className="text-white" />
              {changePercent > 0 ? '+' : ''}
              {changePercent}% {changeLabel ?? 'عن الفترة السابقة'}
            </div>
          )}
        </div>
      </div>
    )
  }

  const tone = ICON_TONES[iconTone]

  return (
    <div
      className="flex flex-col gap-3.5 px-[18px] py-3.5"
      style={{
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border)',
        borderRadius: 'var(--crm-radius-md)',
        boxShadow: 'var(--crm-shadow)',
      }}
    >
      <div className="flex items-start justify-between">
        <span className="text-[12.5px] font-medium" style={{ color: 'var(--crm-text-muted)' }}>
          {label}
        </span>
        <div
          className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px]"
          style={{ background: tone.bg, color: tone.color }}
        >
          <Icon name={icon} size={18} />
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <div
          className="text-[29px] font-bold leading-none tracking-[-0.03em]"
          style={{ color: 'var(--crm-text)' }}
        >
          {value}
        </div>
        {progress != null && (
          <div
            className="h-1.5 overflow-hidden rounded-full"
            style={{ background: 'var(--crm-neutral-soft)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, progress))}%`,
                background: 'var(--crm-primary)',
              }}
            />
          </div>
        )}
        {subtitle && (
          <div className="text-[11.5px] font-medium" style={{ color: 'var(--crm-text-faint)' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}
