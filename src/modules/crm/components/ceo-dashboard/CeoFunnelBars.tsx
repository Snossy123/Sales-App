interface FunnelStage {
  key: string
  label: string
  count: number
  percent: number
  color?: string
}

interface CeoFunnelBarsProps {
  stages: FunnelStage[]
}

const DEFAULT_COLORS: Record<string, string> = {
  in_progress: 'var(--crm-primary)',
  not_contacted: '#64748b',
  contracted: 'var(--crm-success)',
  not_interested: 'var(--crm-danger)',
}

const FALLBACK = ['#2563eb', '#64748b', '#15803d', '#dc2626']

export function CeoFunnelBars({ stages }: CeoFunnelBarsProps) {
  if (stages.length === 0 || stages.every((s) => s.count === 0)) {
    return (
      <p
        className="flex flex-1 items-center justify-center text-[13px]"
        style={{ color: 'var(--crm-text-faint)' }}
      >
        لا توجد بيانات
      </p>
    )
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-3.5">
      {stages.map((stage, index) => {
        const color =
          stage.color ?? DEFAULT_COLORS[stage.key] ?? FALLBACK[index % FALLBACK.length]
        return (
          <div key={stage.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[13px]">
              <span
                className="flex items-center gap-2 font-semibold"
                style={{ color: 'var(--crm-text-secondary)' }}
              >
                <span
                  className="inline-block h-[9px] w-[9px] rounded-[3px]"
                  style={{ backgroundColor: color }}
                />
                {stage.label}
              </span>
              <span className="font-semibold" style={{ color: 'var(--crm-text-muted)' }}>
                {stage.count} · {stage.percent}%
              </span>
            </div>
            <div
              className="h-[9px] overflow-hidden rounded-full"
              style={{ background: 'var(--crm-neutral-soft)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(0, Math.min(100, stage.percent))}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
