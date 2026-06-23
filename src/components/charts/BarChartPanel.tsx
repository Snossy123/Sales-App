import { CHART_COLORS, formatArNumber } from '../../lib/chartColors'

export interface BarSeries {
  key: string
  label: string
  color?: string
}

export interface BarChartPanelProps {
  data: Record<string, string | number>[]
  xKey: string
  series: BarSeries[]
  height?: number
}

export function BarChartPanel({
  data,
  xKey,
  series,
  height = 220,
}: BarChartPanelProps) {
  if (data.length === 0) {
    return (
      <p className="flex h-full min-h-[180px] items-center justify-center text-sm text-on-surface-variant">
        لا توجد بيانات
      </p>
    )
  }

  const maxVal = Math.max(
    ...data.flatMap((row) =>
      series.map((s) => Number(row[s.key]) || 0),
    ),
    0,
  )

  if (maxVal === 0) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center gap-sm text-center">
        <p className="text-sm text-on-surface-variant">لا توجد كميات مسجّلة بعد</p>
        <div className="flex flex-wrap justify-center gap-md">
          {series.map((s, i) => (
            <div key={s.key} className="flex items-center gap-xs text-xs text-on-surface-variant">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
              />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const barWidth = Math.min(36, Math.floor(320 / (data.length * series.length + 1)))
  const groupGap = 12
  const groupWidth = data.length * (barWidth * series.length + groupGap) + 24
  const chartWidth = Math.max(groupWidth, 300)
  const paddingBottom = 52
  const chartHeight = height - paddingBottom

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full"
        style={{ minWidth: chartWidth }}
        role="img"
        aria-label="مخطط أعمدة"
      >
        {data.map((row, i) => {
          const groupX = 16 + i * (barWidth * series.length + groupGap)
          const label = String(row[xKey])

          return (
            <g key={`${label}-${i}`}>
              {series.map((s, si) => {
                const val = Number(row[s.key]) || 0
                const barH = Math.max(val > 0 ? 4 : 0, (val / maxVal) * chartHeight)
                const x = groupX + si * barWidth
                const y = chartHeight - barH
                const color = s.color ?? CHART_COLORS[si % CHART_COLORS.length]

                return (
                  <g key={s.key}>
                    <rect
                      x={x}
                      y={y}
                      width={Math.max(barWidth - 4, 8)}
                      height={barH}
                      rx={4}
                      fill={color}
                    >
                      <title>{`${label} — ${s.label}: ${formatArNumber(val)}`}</title>
                    </rect>
                    {val > 0 && barH >= 18 && (
                      <text
                        x={x + (barWidth - 4) / 2}
                        y={y - 4}
                        textAnchor="middle"
                        className="fill-on-surface text-[9px] font-medium"
                      >
                        {formatArNumber(val)}
                      </text>
                    )}
                  </g>
                )
              })}
              <text
                x={groupX + (barWidth * series.length) / 2}
                y={height - 10}
                textAnchor="middle"
                className="fill-on-surface-variant text-[10px]"
              >
                {label.length > 12 ? `${label.slice(0, 11)}…` : label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-xs flex flex-wrap justify-center gap-md">
        {series.map((s, i) => (
          <div key={s.key} className="flex items-center gap-xs text-xs text-on-surface-variant">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
            />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}
