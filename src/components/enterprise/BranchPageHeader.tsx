import { Icon } from '../Icon'
import type { BranchDetail } from '../../data/branchDetailMock'

interface BranchPageHeaderProps {
  branch: BranchDetail
}

export function BranchPageHeader({ branch }: BranchPageHeaderProps) {
  return (
    <header className="mb-xl flex flex-col justify-between gap-md md:flex-row md:items-end">
      <div>
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
      </div>
      <div className="flex gap-sm">
        <button
          type="button"
          className="flex h-10 items-center gap-sm rounded border border-primary px-md font-label-md text-primary transition-colors hover:bg-primary-fixed"
        >
          <Icon name="edit" size={20} className="no-flip" />
          تعديل الفرع
        </button>
        <button
          type="button"
          className="flex h-10 items-center gap-sm rounded bg-primary px-md font-label-md text-on-primary shadow-sm transition-opacity hover:opacity-90"
        >
          <Icon name="add" size={20} className="no-flip" />
          إعادة تزويد المخزون
        </button>
      </div>
    </header>
  )
}
