import { Icon } from '../../../components/Icon'
import type { HrmUserSalesTarget } from '../../../api/types'

interface SalesTargetProgressCardProps {
  target: HrmUserSalesTarget
  compact?: boolean
}

export function SalesTargetProgressCard({ target, compact = false }: SalesTargetProgressCardProps) {
  const goal = Number(target.target_count ?? 0)
  const achieved = Number(target.achieved_count ?? 0)
  const percent = goal > 0 ? Math.min(100, Math.round((achieved / goal) * 100)) : 0

  return (
    <div
      className={`rounded-xl border border-outline-variant bg-surface-container-lowest ${
        compact ? 'p-sm' : 'p-md'
      }`}
    >
      <div className={`mb-sm flex items-center gap-sm ${compact ? '' : 'mb-sm'}`}>
        <Icon name="track_changes" size={compact ? 18 : 22} className="text-primary" />
        <h2 className={compact ? 'text-sm font-semibold' : 'text-lg font-semibold'}>
          {compact ? 'التارجت' : 'هدف المبيعات'}
        </h2>
      </div>
      {!compact && (
        <p className="mb-sm text-sm text-on-surface-variant">
          من {target.target_start} إلى {target.target_end}
        </p>
      )}
      <div className="mb-xs flex items-end justify-between gap-sm">
        <span className={`font-bold tabular-nums text-on-surface ${compact ? 'text-lg' : 'text-2xl'}`}>
          {achieved}/{goal}
        </span>
        <span className="text-sm text-on-surface-variant">تعاقد</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-container">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      {target.commission_percent != null && !compact && (
        <p className="mt-sm text-sm text-on-surface-variant">عمولة: {target.commission_percent}%</p>
      )}
    </div>
  )
}
