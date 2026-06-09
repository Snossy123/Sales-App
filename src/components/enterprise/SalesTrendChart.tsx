import { Icon } from '../Icon'
import { chartLegend, chartMonths } from '../../data/enterpriseGpsMock'

export function SalesTrendChart() {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
      <div className="mb-md flex items-center justify-between">
        <h3 className="flex items-center gap-sm font-title-lg text-on-surface">
          <Icon name="trending_up" className="text-primary" />
          اتجهات المبيعات حسب الفرع
        </h3>
        <span className="font-label-md text-on-surface-variant">معدل الإنجاز: 65%</span>
      </div>
      <div className="mt-md flex flex-col gap-lg">
        <div className="relative h-64 w-full">
          <div className="absolute right-0 flex h-full flex-col justify-between border-r border-outline-variant pr-sm font-label-sm text-on-surface-variant">
            <span>500</span>
            <span>400</span>
            <span>300</span>
            <span>200</span>
            <span>100</span>
            <span>0</span>
          </div>
          <div className="relative mr-xl h-full">
            <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 200">
              <line stroke="#c1c6d6" strokeDasharray="4" strokeWidth="0.5" x1="0" x2="500" y1="0" y2="0" />
              <line stroke="#c1c6d6" strokeDasharray="4" strokeWidth="0.5" x1="0" x2="500" y1="40" y2="40" />
              <line stroke="#c1c6d6" strokeDasharray="4" strokeWidth="0.5" x1="0" x2="500" y1="80" y2="80" />
              <line stroke="#c1c6d6" strokeDasharray="4" strokeWidth="0.5" x1="0" x2="500" y1="120" y2="120" />
              <line stroke="#c1c6d6" strokeDasharray="4" strokeWidth="0.5" x1="0" x2="500" y1="160" y2="160" />
              <path
                d="M 0 160 L 100 120 L 200 140 L 300 80 L 400 60 L 500 40"
                fill="none"
                stroke="#005bbf"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              <path
                d="M 0 180 L 100 150 L 200 110 L 300 130 L 400 90 L 500 70"
                fill="none"
                stroke="#9e4300"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              <path
                d="M 0 140 L 100 160 L 200 130 L 300 150 L 400 120 L 500 100"
                fill="none"
                stroke="#5c5f60"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              <circle className="animate-pulse" cx="500" cy="40" fill="#005bbf" r="5" />
            </svg>
            <div className="absolute top-0 left-0 z-10 -translate-x-1/2 -translate-y-full rounded bg-inverse-surface p-sm font-label-sm text-inverse-on-surface shadow-lg">
              أكتوبر: 480 وحدة
            </div>
          </div>
          <div className="mr-xl mt-sm flex justify-between font-label-sm text-on-surface-variant">
            {chartMonths.map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-lg border-t border-outline-variant pt-md">
          {chartLegend.map((item) => (
            <div key={item.label} className="flex items-center gap-xs">
              <span className={`h-3 w-3 rounded-full ${item.color}`} />
              <span className="font-body-sm text-on-surface-variant">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
