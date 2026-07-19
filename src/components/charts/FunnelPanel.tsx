interface FunnelStage {
  key: string
  label: string
  count: number
  percent: number
  color?: string
}

interface FunnelPanelProps {
  stages: FunnelStage[]
}

const DEFAULT_COLORS = ['#1565C0', '#42A5F5', '#2E7D32', '#C62828']

/** Simple trapezoid-style funnel without extra chart libraries. */
export function FunnelPanel({ stages }: FunnelPanelProps) {
  if (stages.length === 0 || stages.every((s) => s.count === 0)) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-on-surface-variant">
        لا توجد بيانات
      </p>
    )
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  return (
    <div className="flex flex-col items-center gap-xs py-sm">
      {stages.map((stage, index) => {
        const widthPct = 45 + (stage.count / maxCount) * 55
        const color = stage.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
        return (
          <div key={stage.key} className="w-full max-w-sm">
            <div
              className="mx-auto flex min-h-10 items-center justify-between gap-sm rounded-md px-md py-sm text-sm text-white shadow-sm transition-all"
              style={{
                width: `${widthPct}%`,
                backgroundColor: color,
              }}
            >
              <span className="truncate font-medium">{stage.label}</span>
              <span className="shrink-0 tabular-nums text-xs opacity-90">
                {stage.count} ({stage.percent}%)
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
