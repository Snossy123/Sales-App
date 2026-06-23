import { Icon } from './Icon'

interface KpiCardProps {
  label: string
  value: string | number
  icon: string
  trend?: string
  trendUp?: boolean
  alert?: boolean
}

export function KpiCard({ label, value, icon, trend, trendUp, alert }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <div className="mb-sm flex items-start justify-between gap-sm">
        <p className="text-sm font-medium text-on-surface-variant">{label}</p>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            alert ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon name={icon} size={20} />
        </div>
      </div>
      <p className="tabular-nums text-2xl font-bold text-on-surface">{value}</p>
      {trend && (
        <p
          className={`mt-xs text-xs font-medium ${trendUp ? 'text-secondary' : 'text-error'}`}
        >
          {trend}
        </p>
      )}
    </div>
  )
}
