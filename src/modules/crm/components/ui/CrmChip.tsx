interface CrmChipProps {
  label: string
  active?: boolean
  count?: number | string
  dot?: string
  onClick?: () => void
}

export function CrmChip({ label, active = false, count, dot, onClick }: CrmChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-[30px] cursor-pointer items-center gap-2.5 px-2.5 text-xs font-medium transition-colors"
      style={{
        borderRadius: 'var(--crm-radius-sm)',
        border: `1px solid ${active ? 'var(--crm-ink)' : 'var(--crm-border)'}`,
        background: active ? 'var(--crm-ink)' : 'var(--crm-surface)',
        color: active ? '#ffffff' : 'var(--crm-text-secondary)',
      }}
    >
      {dot ? <span className="crm-status-dot" style={{ background: dot, width: 7, height: 7 }} /> : null}
      <span>{label}</span>
      {count !== undefined ? (
        <span style={{ fontSize: 11, color: active ? 'rgba(255,255,255,.7)' : 'var(--crm-text-disabled)' }}>
          {count}
        </span>
      ) : null}
    </button>
  )
}

interface CrmStatusPillProps {
  label: string
  color: string
  tint: string
}

export function CrmStatusPill({ label, color, tint }: CrmStatusPillProps) {
  return (
    <span className="crm-status-pill" style={{ background: tint, color }}>
      <span className="crm-status-dot" style={{ background: color, width: 6, height: 6 }} />
      {label}
    </span>
  )
}
