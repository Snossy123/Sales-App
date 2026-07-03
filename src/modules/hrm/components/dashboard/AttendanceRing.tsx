interface AttendanceRingProps {
  present: number
  total: number
  size?: number
}

/**
 * Radial progress ring showing present-today as a share of headcount.
 * Pure SVG (strokeDasharray) — the app's first ring gauge.
 */
export function AttendanceRing({ present, total, size = 200 }: AttendanceRingProps) {
  const pct = total > 0 ? Math.min(100, Math.round((present / total) * 100)) : 0
  const stroke = 16
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (pct / 100) * circumference
  const center = size / 2

  return (
    <div className="flex flex-col items-center justify-center gap-sm">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`نسبة الحضور ${pct}%`}>
          <defs>
            <linearGradient id="hrm-ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-primary-container)" />
            </linearGradient>
          </defs>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--color-surface-container-high)"
            strokeWidth={stroke}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#hrm-ring-grad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-[stroke-dasharray] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums text-on-surface">{pct}%</span>
          <span className="mt-xs text-xs font-medium text-on-surface-variant">حضور اليوم</span>
        </div>
      </div>
      <p className="text-sm text-on-surface-variant">
        <span className="font-bold tabular-nums text-on-surface">{present}</span> من{' '}
        <span className="tabular-nums">{total}</span> موظف
      </p>
    </div>
  )
}
