import { Icon } from '../Icon'
import type { BranchViewModel } from '../../lib/branchDashboard'

interface BranchOperationsPanelProps {
  branch: BranchViewModel
}

export function BranchOperationsPanel({ branch }: BranchOperationsPanelProps) {
  return (
    <section className="elevation-l1 overflow-hidden rounded-lg bg-white">
      <div className="border-b border-outline-variant bg-surface-container-low px-md py-sm">
        <h4 className="font-title-lg text-title-lg text-on-surface">تفاصيل الفرع</h4>
      </div>
      <div className="space-y-md p-md">
        <div className="flex items-center gap-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
            <Icon name="domain" className="text-secondary no-flip" />
          </div>
          <div>
            <p className="font-label-sm uppercase text-secondary">الإدارة</p>
            <p className="font-body-md font-semibold text-on-surface">{branch.administrationName}</p>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
            <Icon name="location_on" className="text-secondary no-flip" />
          </div>
          <div>
            <p className="font-label-sm uppercase text-secondary">العنوان</p>
            <p className="font-body-md text-on-surface">{branch.address}</p>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
            <Icon name="phone" className="text-secondary no-flip" />
          </div>
          <div>
            <p className="font-label-sm uppercase text-secondary">رقم الهاتف</p>
            <p className="font-body-md text-on-surface no-flip">{branch.phone}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
