import { formatArNumber } from '../../lib/chartColors'

interface GaugeChartPanelProps {
  /** Progress percent 0–100+ */
  percent: number
  achieved: number
  target: number
  achievedLabel?: string
  targetLabel?: string
  size?: number
}

export function GaugeChartPanel({
  percent,
  achieved,
  target,
  achievedLabel = 'المحقق',
  targetLabel = 'الهدف',
  size = 200,
}: GaugeChartPanelProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  const cx = size / 2
  const cy = size * 0.58
  const radius = size * 0.38
  const stroke = Math.max(12, size * 0.08)

  const startAngle = -180
  const endAngle = 0
  const sweep = (clamped / 100) * 180

  const polar = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  const arcPath = (from: number, to: number, r: number) => {
    const start = polar(from, r)
    const end = polar(to, r)
    const largeArc = to - from > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
  }

  const trackPath = arcPath(startAngle, endAngle, radius)
  const valuePath = clamped > 0 ? arcPath(startAngle, startAngle + sweep, radius) : ''

  const tone =
    clamped >= 70 ? 'var(--color-secondary, #2E7D32)' : clamped >= 40 ? 'var(--color-chart-3, #F9A825)' : 'var(--color-error, #C62828)'

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size * 0.72}
        viewBox={`0 0 ${size} ${size * 0.72}`}
        role="img"
        aria-label={`إنجاز الهدف ${formatArNumber(percent)}٪`}
      >
        <path
          d={trackPath}
          fill="none"
          stroke="var(--color-surface-container, #e8e8e8)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {valuePath && (
          <path
            d={valuePath}
            fill="none"
            stroke={tone}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        )}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          className="fill-on-surface text-2xl font-bold"
          style={{ fontSize: size * 0.14 }}
        >
          {formatArNumber(Math.round(percent * 10) / 10)}٪
        </text>
        <text
          x={cx}
          y={cy + size * 0.08}
          textAnchor="middle"
          className="fill-on-surface-variant"
          style={{ fontSize: size * 0.055 }}
        >
          {formatArNumber(achieved)} / {formatArNumber(target)}
        </text>
      </svg>
      <div className="mt-xs flex w-full max-w-[220px] flex-col gap-xs">
        <div className="h-2 overflow-hidden rounded-full bg-surface-container">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${clamped}%`, backgroundColor: tone }}
          />
        </div>
        <div className="flex justify-between text-xs text-on-surface-variant">
          <span>
            {achievedLabel}: <span className="font-semibold tabular-nums text-on-surface">{formatArNumber(achieved)}</span>
          </span>
          <span>
            {targetLabel}: <span className="font-semibold tabular-nums text-on-surface">{formatArNumber(target)}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
