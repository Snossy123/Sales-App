import { Icon } from '../Icon'
import type { BranchViewModel } from '../../lib/branchDashboard'

interface BranchPageHeaderProps {
  branch: BranchViewModel
}

export function BranchPageHeader({ branch }: BranchPageHeaderProps) {
  return (
    <header className="mb-xl">
      <div className="mb-xs flex items-center gap-sm">
        <span className={`rounded-full px-2 py-0.5 font-label-sm uppercase tracking-wider ${branch.statusColor}`}>
          {branch.status}
        </span>
        <span className="flex items-center gap-1 font-mono text-body-sm text-secondary">
          رمز الفرع: <span className="no-flip">{branch.code}</span>
        </span>
      </div>
      <h1 className="font-display-lg text-display-lg text-on-surface">{branch.name}</h1>
      <div className="mt-1 flex items-center gap-xs text-on-surface-variant">
        <Icon name="location_on" size={18} className="no-flip" />
        <span className="font-body-md">{branch.address}</span>
      </div>
    </header>
  )
}
