import { Icon } from '../Icon'
import { gpsKpis } from '../../data/enterpriseGpsMock'

export function GpsKpiRow() {
  return (
    <section className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-4">
      {gpsKpis.map((kpi) => (
        <div
          key={kpi.label}
          className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="font-label-sm uppercase tracking-wider text-on-surface-variant">{kpi.label}</p>
          <p className="font-display-lg text-on-surface">{kpi.value}</p>
          <div className={`flex items-center gap-xs ${kpi.trendColor}`}>
            <Icon name={kpi.trendIcon} size={18} />
            <span className="font-body-sm font-semibold">{kpi.trendText}</span>
          </div>
        </div>
      ))}
    </section>
  )
}
