import type { HrmLeave } from '../../../../api/types'
import { Icon } from '../../../../components/Icon'
import { StatusBadge } from '../../../../components/StatusBadge'
import { hrmLeaveTypeLabel } from '../../lib/labels'

function initials(name?: string | null): string {
  if (!name) return '؟'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).trim() || '؟'
}

interface UpcomingLeavesListProps {
  leaves: HrmLeave[]
}

export function UpcomingLeavesList({ leaves }: UpcomingLeavesListProps) {
  if (leaves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-sm rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-xl text-center">
        <Icon name="event_available" size={32} className="text-on-surface-variant" />
        <p className="text-sm text-on-surface-variant">لا توجد إجازات قادمة</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-sm">
      {leaves.map((leave) => (
        <li
          key={leave.id}
          className="flex items-center gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-sm transition-colors hover:bg-surface-container-low"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {initials(leave.employee?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-on-surface">{leave.employee?.name ?? '—'}</p>
            <p className="flex items-center gap-xs text-xs text-on-surface-variant">
              <Icon name="category" size={14} />
              {hrmLeaveTypeLabel(leave.leaveType)}
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-xs text-xs text-on-surface-variant sm:flex">
            <Icon name="calendar_month" size={14} />
            <span className="tabular-nums">{leave.start_date}</span>
            <Icon name="arrow_back" size={14} className="text-outline" />
            <span className="tabular-nums">{leave.end_date}</span>
          </div>
          <StatusBadge status={leave.status} label={leave.status === 'approved' ? 'معتمدة' : undefined} />
        </li>
      ))}
    </ul>
  )
}
