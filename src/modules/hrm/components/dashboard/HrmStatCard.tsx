import { Icon } from '../../../../components/Icon'

export type StatAccent = 'primary' | 'tertiary' | 'secondary' | 'error'

const accentStyles: Record<StatAccent, { card: string; chip: string; blob: string }> = {
  primary: {
    card: 'from-primary/12 border-primary/20',
    chip: 'bg-primary text-on-primary',
    blob: 'bg-primary/25',
  },
  tertiary: {
    card: 'from-tertiary/12 border-tertiary/20',
    chip: 'bg-tertiary text-on-tertiary',
    blob: 'bg-tertiary/25',
  },
  secondary: {
    card: 'from-secondary/15 border-secondary/25',
    chip: 'bg-secondary text-on-secondary',
    blob: 'bg-secondary/25',
  },
  error: {
    card: 'from-error/12 border-error/20',
    chip: 'bg-error text-on-error',
    blob: 'bg-error/25',
  },
}

interface HrmStatCardProps {
  label: string
  value: string | number
  icon: string
  accent?: StatAccent
  caption?: string
  trend?: string
  trendUp?: boolean
}

export function HrmStatCard({
  label,
  value,
  icon,
  accent = 'primary',
  caption,
  trend,
  trendUp = true,
}: HrmStatCardProps) {
  const styles = accentStyles[accent]

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-bl to-surface-container-lowest p-md shadow-sm transition-shadow hover:shadow-md ${styles.card}`}
    >
      <div
        className={`pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full blur-2xl ${styles.blob}`}
      />
      <div className="relative flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="text-sm font-medium text-on-surface-variant">{label}</p>
          <p className="mt-xs text-3xl font-bold tabular-nums text-on-surface">{value}</p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${styles.chip}`}
        >
          <Icon name={icon} size={22} />
        </div>
      </div>
      {(trend || caption) && (
        <div className="relative mt-sm flex items-center gap-xs text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${
                trendUp ? 'text-secondary' : 'text-error'
              }`}
            >
              <Icon
                name={trendUp ? 'trending_up' : 'trending_down'}
                size={14}
                className="no-flip"
              />
              {trend}
            </span>
          )}
          {caption && <span className="text-on-surface-variant">{caption}</span>}
        </div>
      )}
    </div>
  )
}
