import { CHART_COLORS, formatArNumber } from '../../lib/chartColors'

export interface LineSeries {
  key: string
  label: string
  color?: string
}

export interface LineChartPanelProps {
  data: Record<string, string | number>[]
  xKey: string
  series: LineSeries[]
  height?: number
  /** Soft gradient fill under the first series line */
  fillArea?: boolean
  /** Hollow white-centered points (mock style) */
  ringPoints?: boolean
}

export function LineChartPanel({
  data,
  xKey,
  series,
  height = 220,
  fillArea = false,
  ringPoints = false,
}: LineChartPanelProps) {
  if (data.length === 0) {
    return (
      <p className="flex h-full min-h-[180px] items-center justify-center text-sm text-on-surface-variant">
        لا توجد بيانات
      </p>
    )
  }

  const maxVal = Math.max(
    ...data.flatMap((row) => series.map((s) => Number(row[s.key]) || 0)),
    0,
  )

  if (maxVal === 0) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center gap-sm text-center">
        <p className="text-sm text-on-surface-variant">لا توجد مبيعات مسجّلة بعد</p>
        <div className="flex flex-wrap justify-center gap-md">
          {series.map((s, i) => (
            <div key={s.key} className="flex items-center gap-xs text-xs text-on-surface-variant">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
              />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const paddingLeft = 12
  const paddingRight = 12
  const paddingTop = 32
  const paddingBottom = 52
  // Wider viewBox for fillArea so fontSize user-units stay readable when SVG stretches to card width
  const chartWidth = fillArea
    ? Math.max(600, data.length * 72 + paddingLeft + paddingRight)
    : Math.max(300, data.length * 48 + paddingLeft + paddingRight)
  const chartHeight = height - paddingTop - paddingBottom
  const plotWidth = chartWidth - paddingLeft - paddingRight

  const xAt = (index: number) => {
    if (data.length === 1) return paddingLeft + plotWidth / 2
    return paddingLeft + (index / (data.length - 1)) * plotWidth
  }

  const yAt = (value: number) => paddingTop + chartHeight - (value / maxVal) * chartHeight

  const baselineY = paddingTop + chartHeight
  const gradientId = 'lineChartAreaFill'

  return (
    <div className={`w-full ${fillArea ? '' : 'overflow-x-auto'}`} dir="ltr">
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="h-auto w-full"
        style={fillArea ? undefined : { minWidth: chartWidth }}
        role="img"
        aria-label="مخطط خطي"
      >
        {fillArea && series[0] && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0"
                stopColor={series[0].color ?? CHART_COLORS[0]}
                stopOpacity="0.18"
              />
              <stop
                offset="1"
                stopColor={series[0].color ?? CHART_COLORS[0]}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
        )}

        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingTop + chartHeight * (1 - ratio)
          return (
            <line
              key={ratio}
              x1={paddingLeft}
              x2={chartWidth - paddingRight}
              y1={y}
              y2={y}
              className="stroke-outline-variant"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )
        })}

        {series.map((s, si) => {
          const color = s.color ?? CHART_COLORS[si % CHART_COLORS.length]
          const points = data
            .map((row, i) => `${xAt(i)},${yAt(Number(row[s.key]) || 0)}`)
            .join(' ')

          const areaPath =
            fillArea && si === 0 && data.length > 0
              ? `M ${xAt(0)} ${baselineY} L ${data
                  .map((row, i) => `${xAt(i)} ${yAt(Number(row[s.key]) || 0)}`)
                  .join(' L ')} L ${xAt(data.length - 1)} ${baselineY} Z`
              : null

          return (
            <g key={s.key}>
              {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
              <polyline
                fill="none"
                stroke={color}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
              {data.map((row, i) => {
                const val = Number(row[s.key]) || 0
                const cx = xAt(i)
                const cy = yAt(val)
                const label = String(row[xKey])

                return (
                  <g key={`${s.key}-${label}-${i}`}>
                    {ringPoints ? (
                      <circle cx={cx} cy={cy} r={5} fill="#fff" stroke={color} strokeWidth={3}>
                        <title>{`${label} — ${s.label}: ${formatArNumber(val)}`}</title>
                      </circle>
                    ) : (
                      <circle cx={cx} cy={cy} r={4} fill={color}>
                        <title>{`${label} — ${s.label}: ${formatArNumber(val)}`}</title>
                      </circle>
                    )}
                    {val > 0 && (
                      <text
                        x={cx}
                        y={cy - 10}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={700}
                        fill="var(--color-on-surface, #141821)"
                      >
                        {formatArNumber(val)}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        {data.map((row, i) => {
          const label = String(row[xKey])
          return (
            <text
              key={`x-${label}-${i}`}
              x={xAt(i)}
              y={height - 10}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="var(--color-on-surface-variant, #8890a0)"
            >
              {label.length > 12 ? `${label.slice(0, 11)}…` : label}
            </text>
          )
        })}
      </svg>
      {!fillArea && (
        <div className="mt-xs flex flex-wrap justify-center gap-md">
          {series.map((s, i) => (
            <div key={s.key} className="flex items-center gap-xs text-xs text-on-surface-variant">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: s.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
              />
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
