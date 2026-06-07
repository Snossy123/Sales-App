import { CHART_COLORS, formatArNumber } from '../../lib/chartColors'

export interface DonutSlice {
  label: string
  value: number
  color?: string
}

interface DonutChartPanelProps {
  data: DonutSlice[]
  size?: number
}

export function DonutChartPanel({ data, size = 180 }: DonutChartPanelProps) {
  const total = data.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-on-surface-variant">
        لا توجد بيانات
      </p>
    )
  }

  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 8
  const innerR = outerR * 0.55
  type RenderedSlice = DonutSlice & { path: string; color: string; pct: number; endAngle: number }

  const slices = data.reduce<RenderedSlice[]>((acc, d, i) => {
    const pct = d.value / total
    const sweep = pct * 360
    const startAngle = acc.length === 0 ? -90 : acc[acc.length - 1].endAngle
    const endAngle = startAngle + sweep

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = cx + outerR * Math.cos(startRad)
    const y1 = cy + outerR * Math.sin(startRad)
    const x2 = cx + outerR * Math.cos(endRad)
    const y2 = cy + outerR * Math.sin(endRad)
    const x3 = cx + innerR * Math.cos(endRad)
    const y3 = cy + innerR * Math.sin(endRad)
    const x4 = cx + innerR * Math.cos(startRad)
    const y4 = cy + innerR * Math.sin(startRad)

    const largeArc = sweep > 180 ? 1 : 0
    const color = d.color ?? CHART_COLORS[i % CHART_COLORS.length]

    const path = [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ')

    acc.push({ ...d, path, color, pct, endAngle })
    return acc
  }, [])

  return (
    <div className="flex flex-col items-center gap-sm sm:flex-row sm:items-start sm:gap-md">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="مخطط دائري"
        className="shrink-0"
      >
        {slices.map((s) => (
          <path key={s.label} d={s.path} fill={s.color}>
            <title>{`${s.label}: ${formatArNumber(s.value)} (${Math.round(s.pct * 100)}%)`}</title>
          </path>
        ))}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-on-surface text-sm font-bold"
          style={{ fontSize: 14 }}
        >
          {formatArNumber(total)}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          className="fill-on-surface-variant"
          style={{ fontSize: 10 }}
        >
          الإجمالي
        </text>
      </svg>
      <div className="flex flex-col gap-xs">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-xs text-xs text-on-surface-variant">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-on-surface">{s.label}</span>
            <span className="tabular-nums">
              {formatArNumber(s.value)} ({Math.round(s.pct * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
