import { Icon } from '../Icon'
import type { BranchKpi } from '../../data/branchDetailMock'

interface BranchKpiGridProps {
  kpis: BranchKpi[]
}

export function BranchKpiGrid({ kpis }: BranchKpiGridProps) {
  return (
    <div className="mb-xl grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="elevation-l1 flex flex-col justify-between rounded-lg p-md">
          <div>
            <p className="mb-1 font-label-sm uppercase tracking-tight text-secondary">{kpi.label}</p>
            <p className="font-title-lg text-[24px] text-on-surface no-flip">{kpi.value}</p>
          </div>
          <div className={`mt-base flex items-center gap-xs ${kpi.trendColor}`}>
            <Icon name={kpi.trendIcon} size={16} filled={kpi.iconFilled} className="no-flip" />
            <span className="font-label-sm">{kpi.trendText}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
