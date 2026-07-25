import type { CSSProperties, ReactNode } from 'react'

interface CrmKpiCardProps {
  label: string
  value: ReactNode
  hint?: string
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'warning'
  dot?: string
}

const VARIANT_STYLES: Record<
  NonNullable<CrmKpiCardProps['variant']>,
  { card: CSSProperties; label: string; value: string; hint: string; iconBg: string }
> = {
  primary: {
    card: {
      background: 'var(--crm-primary)',
      border: '1px solid var(--crm-primary)',
      boxShadow: 'var(--crm-shadow-primary)',
    },
    label: '#dbe6fd',
    value: '#ffffff',
    hint: '#c9dcfc',
    iconBg: 'rgba(255,255,255,.18)',
  },
  default: {
    card: {
      background: 'var(--crm-surface)',
      border: '1px solid var(--crm-border)',
      boxShadow: 'var(--crm-shadow)',
    },
    label: 'var(--crm-text-muted)',
    value: 'var(--crm-text)',
    hint: 'var(--crm-text-faint)',
    iconBg: 'var(--crm-neutral-soft)',
  },
  danger: {
    card: {
      background: 'var(--crm-surface)',
      border: '1px solid var(--crm-border)',
      boxShadow: 'var(--crm-shadow)',
    },
    label: 'var(--crm-text-muted)',
    value: 'var(--crm-danger)',
    hint: 'var(--crm-text-faint)',
    iconBg: 'var(--crm-danger-soft)',
  },
  success: {
    card: {
      background: 'var(--crm-surface)',
      border: '1px solid var(--crm-border)',
      boxShadow: 'var(--crm-shadow)',
    },
    label: 'var(--crm-text-muted)',
    value: 'var(--crm-success)',
    hint: 'var(--crm-text-faint)',
    iconBg: 'var(--crm-success-soft)',
  },
  warning: {
    card: {
      background: 'var(--crm-surface)',
      border: '1px solid var(--crm-border)',
      boxShadow: 'var(--crm-shadow)',
    },
    label: 'var(--crm-text-muted)',
    value: 'var(--crm-text)',
    hint: 'var(--crm-text-faint)',
    iconBg: 'var(--crm-warning-soft)',
  },
}

export function CrmKpiCard({
  label,
  value,
  hint,
  variant = 'default',
  dot,
}: CrmKpiCardProps) {
  const styles = VARIANT_STYLES[variant]
  const dotColor =
    dot ??
    (variant === 'primary'
      ? '#ffffff'
      : variant === 'danger'
        ? 'var(--crm-danger)'
        : variant === 'success'
          ? 'var(--crm-success)'
          : variant === 'warning'
            ? 'var(--crm-warning)'
            : 'var(--crm-text-muted)')

  return (
    <div
      className="flex min-w-[200px] flex-1 flex-col gap-2.5 px-[18px] py-3.5"
      style={{ ...styles.card, borderRadius: 'var(--crm-radius-md)' }}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-[12.5px] font-medium" style={{ color: styles.label }}>
          {label}
        </span>
        <span
          className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px]"
          style={{ background: styles.iconBg }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: dotColor }} />
        </span>
      </div>
      <span
        className="text-[29px] font-bold tracking-[-0.03em]"
        style={{ color: styles.value }}
      >
        {value}
      </span>
      {hint ? (
        <span className="text-[11.5px]" style={{ color: styles.hint }}>
          {hint}
        </span>
      ) : null}
    </div>
  )
}
