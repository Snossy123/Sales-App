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
  in_progress: '#2a5bd7',
  not_contacted: '#64748b',
  contracted: '#16a34a',
  not_interested: '#dc2626',
}

const FALLBACK = ['#2a5bd7', '#64748b', '#16a34a', '#dc2626']

export function CeoFunnelBars({ stages }: CeoFunnelBarsProps) {
  if (stages.length === 0 || stages.every((s) => s.count === 0)) {
    return (
      <p className="flex flex-1 items-center justify-center text-sm text-[#8890a0]">
        لا توجد بيانات
      </p>
    )
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      {stages.map((stage, index) => {
        const color =
          stage.color ?? DEFAULT_COLORS[stage.key] ?? FALLBACK[index % FALLBACK.length]
        return (
          <div key={stage.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2 font-semibold text-[#374151]">
                <span
                  className="inline-block h-[9px] w-[9px] rounded-[3px]"
                  style={{ backgroundColor: color }}
                />
                {stage.label}
              </span>
              <span className="font-semibold text-[#8890a0]">
                {stage.count} · {stage.percent}%
              </span>
            </div>
            <div className="h-[9px] overflow-hidden rounded-full bg-[#eef1f6]">
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
