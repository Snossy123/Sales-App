import { formatArNumber } from '../../../../lib/chartColors'

interface CeoTargetGaugeProps {
  percent: number
  achieved: number
  target: number
}

export function CeoTargetGauge({ percent, achieved, target }: CeoTargetGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  const remaining = Math.max(0, target - achieved)

  // Semi-circle: M20 100 A80 80 0 0 1 180 100 — arc length ~251.3
  const circumference = Math.PI * 80
  const dashOffset = circumference * (1 - clamped / 100)

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center py-1.5">
        <div className="relative w-[230px]">
          <svg
            viewBox="0 0 200 120"
            className="h-auto w-full overflow-visible"
            role="img"
            aria-label={`إنجاز الهدف ${formatArNumber(percent)}٪`}
          >
            <path
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke="var(--crm-neutral-soft)"
              strokeWidth="16"
              strokeLinecap="round"
            />
            <path
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke="var(--crm-primary)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-x-0 bottom-2 flex flex-col items-center gap-0.5">
            <span
              className="text-[34px] font-bold tracking-tight"
              style={{ color: 'var(--crm-text)' }}
            >
              {formatArNumber(Math.round(percent * 10) / 10)}%
            </span>
            <span className="text-[12.5px] font-semibold" style={{ color: 'var(--crm-text-muted)' }}>
              {formatArNumber(achieved)} من {formatArNumber(target)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2.5">
        <div
          className="px-2 py-3 text-center"
          style={{
            borderRadius: 'var(--crm-radius-md)',
            background: 'var(--crm-surface-muted)',
          }}
        >
          <div className="text-lg font-bold" style={{ color: 'var(--crm-primary)' }}>
            {formatArNumber(achieved)}
          </div>
          <div className="text-[11.5px] font-medium" style={{ color: 'var(--crm-text-muted)' }}>
            محقق
          </div>
        </div>
        <div
          className="px-2 py-3 text-center"
          style={{
            borderRadius: 'var(--crm-radius-md)',
            background: 'var(--crm-surface-muted)',
          }}
        >
          <div className="text-lg font-bold" style={{ color: 'var(--crm-text)' }}>
            {formatArNumber(target)}
          </div>
          <div className="text-[11.5px] font-medium" style={{ color: 'var(--crm-text-muted)' }}>
            الهدف
          </div>
        </div>
        <div
          className="px-2 py-3 text-center"
          style={{
            borderRadius: 'var(--crm-radius-md)',
            background: 'var(--crm-warning-soft)',
          }}
        >
          <div className="text-lg font-bold" style={{ color: 'var(--crm-warning)' }}>
            {formatArNumber(remaining)}
          </div>
          <div className="text-[11.5px] font-medium" style={{ color: 'var(--crm-text-muted)' }}>
            متبقٍ
          </div>
        </div>
      </div>
    </div>
  )
}
