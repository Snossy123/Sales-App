import { CHART_COLORS, formatArNumber } from '../../lib/chartColors'

export interface StackedSeries {
  key: string
  label: string
  color?: string
}

interface StackedBarChartPanelProps {
  data: Record<string, string | number>[]
  xKey: string
  series: StackedSeries[]
  height?: number
}

export function StackedBarChartPanel({
  data,
  xKey,
  series,
  height = 200,
}: StackedBarChartPanelProps) {
  if (data.length === 0) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-on-surface-variant">
        لا توجد بيانات
      </p>
    )
  }

  const totals = data.map((row) =>
    series.reduce((s, ser) => s + (Number(row[ser.key]) || 0), 0),
  )
  const maxVal = Math.max(...totals, 1)

  const barWidth = Math.min(40, Math.floor(300 / (data.length + 1)))
  const chartWidth = Math.max(data.length * (barWidth + 12) + 24, 280)
  const paddingBottom = 48
  const chartHeight = height - paddingBottom

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full"
        style={{ minWidth: chartWidth }}
        role="img"
        aria-label="مخطط أعمدة مكدسة"
      >
        {data.map((row, i) => {
          const label = String(row[xKey])
          const x = 16 + i * (barWidth + 12)
          let yOffset = chartHeight

          return (
            <g key={label}>
              {series.map((s, si) => {
                const val = Number(row[s.key]) || 0
                const barH = (val / maxVal) * chartHeight
                yOffset -= barH
                const color = s.color ?? CHART_COLORS[si % CHART_COLORS.length]

                if (barH <= 0) return null

                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={yOffset}
                    width={barWidth}
                    height={barH}
                    fill={color}
                  >
                    <title>{`${label} — ${s.label}: ${formatArNumber(val)}`}</title>
                  </rect>
                )
              })}
              <text
                x={x + barWidth / 2}
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
