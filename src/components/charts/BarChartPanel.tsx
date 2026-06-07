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
  height = 200,
}: BarChartPanelProps) {
  if (data.length === 0) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-on-surface-variant">
        لا توجد بيانات
      </p>
    )
  }

  const maxVal = Math.max(
    ...data.flatMap((row) =>
      series.map((s) => Number(row[s.key]) || 0),
    ),
    1,
  )

  const barWidth = Math.min(32, Math.floor(280 / (data.length * series.length + 1)))
  const groupWidth = data.length * (barWidth * series.length + 8) + 16
  const chartWidth = Math.max(groupWidth, 280)
  const paddingBottom = 48
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
          const groupX = 16 + i * (barWidth * series.length + 8)
          const label = String(row[xKey])

          return (
            <g key={label}>
              {series.map((s, si) => {
                const val = Number(row[s.key]) || 0
                const barH = (val / maxVal) * chartHeight
                const x = groupX + si * barWidth
                const y = chartHeight - barH
                const color = s.color ?? CHART_COLORS[si % CHART_COLORS.length]

                return (
                  <g key={s.key}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth - 2}
                      height={barH}
                      rx={3}
                      fill={color}
                    >
                      <title>{`${label} — ${s.label}: ${formatArNumber(val)}`}</title>
                    </rect>
                  </g>
                )
              })}
              <text
                x={groupX + (barWidth * series.length) / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-on-surface-variant text-[10px]"
              >
                {label.length > 10 ? `${label.slice(0, 9)}…` : label}
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
