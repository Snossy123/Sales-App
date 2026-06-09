import { Icon } from '../Icon'
import type { BranchDetail } from '../../data/branchDetailMock'

interface BranchOperationsPanelProps {
  branch: BranchDetail
}

export function BranchOperationsPanel({ branch }: BranchOperationsPanelProps) {
  return (
    <section className="elevation-l1 flex flex-col overflow-hidden rounded-lg">
      <div className="relative h-48 w-full bg-[#E1E4E8]">
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url('${branch.mapImage}')` }}
        />
        <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded bg-white px-2 py-1 shadow-md">
          <Icon name="location_on" size={16} className="text-primary no-flip" />
          <span className="font-label-sm text-on-surface">{branch.mapLabel}</span>
        </div>
      </div>
      <div className="bg-white p-md">
        <h4 className="mb-md font-title-lg text-title-lg text-on-surface">تفاصيل التشغيل</h4>
        <div className="space-y-md">
          <div className="flex items-center gap-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
              <Icon name="person" className="text-secondary no-flip" />
            </div>
            <div>
              <p className="font-label-sm uppercase text-secondary">مدير الفرع</p>
              <p className="font-body-md font-semibold text-on-surface">{branch.manager}</p>
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
          <div className="flex items-center gap-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
              <Icon name="mail" className="text-secondary no-flip" />
            </div>
            <div>
              <p className="font-label-sm uppercase text-secondary">البريد الإلكتروني</p>
              <p className="font-body-md text-on-surface">{branch.email}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
