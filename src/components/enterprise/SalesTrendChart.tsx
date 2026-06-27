import { Icon } from '../Icon'
import { BarChartPanel } from '../charts/BarChartPanel'
import { CHART_COLORS } from '../../lib/chartColors'
import type { BranchStockChartRow } from '../../lib/departmentDashboard'

interface SalesTrendChartProps {
  title?: string
  completionRate?: number
  chartData?: BranchStockChartRow[]
}

export function SalesTrendChart({
  title = 'مخزون GPS حسب الفرع',
  completionRate = 0,
  chartData = [],
}: SalesTrendChartProps) {
  const barData = chartData.map((row) => ({
    name: row.name,
    sold: row.sold,
    available: row.available,
    reserved: row.reserved,
  }))

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
      <div className="mb-md flex items-center justify-between">
        <h3 className="flex items-center gap-sm font-title-lg text-on-surface">
          <Icon name="bar_chart" className="text-primary" />
          {title}
        </h3>
        <span className="font-label-md text-on-surface-variant">نسبة التوزيع: {completionRate}%</span>
      </div>
      <BarChartPanel
        data={barData}
        xKey="name"
        series={[
          { key: 'sold', label: 'مباع', color: CHART_COLORS[0] },
          { key: 'available', label: 'متاح', color: CHART_COLORS[1] },
          { key: 'reserved', label: 'محجوز', color: CHART_COLORS[2] },
        ]}
        height={260}
      />
    </section>
  )
}
