import { Icon } from '../Icon'
import { gpsKpis as defaultKpis } from '../../data/enterpriseGpsMock'
import type { DepartmentKpi } from '../../lib/departmentDashboard'

interface GpsKpiRowProps {
  kpis?: DepartmentKpi[]
}

export function GpsKpiRow({ kpis = [...defaultKpis] }: GpsKpiRowProps) {
  return (
    <section className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="font-label-sm uppercase tracking-wider text-on-surface-variant">{kpi.label}</p>
          <p className="font-display-lg text-on-surface">{kpi.value}</p>
          <div className={`flex items-center gap-xs ${kpi.trendColor}`}>
            <Icon name={kpi.trendIcon} size={18} className="no-flip" />
            <span className="font-body-sm font-semibold">{kpi.trendText}</span>
          </div>
        </div>
      ))}
    </section>
  )
}
