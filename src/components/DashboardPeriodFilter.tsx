export type DashboardPeriod = 'day' | 'week' | 'month' | 'year' | 'all'

const options: { id: DashboardPeriod; label: string }[] = [
  { id: 'day', label: 'يوم' },
  { id: 'week', label: 'أسبوع' },
  { id: 'month', label: 'شهر' },
  { id: 'year', label: 'سنة' },
  { id: 'all', label: 'الكل' },
]

interface DashboardPeriodFilterProps {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
}

export function DashboardPeriodFilter({ value, onChange }: DashboardPeriodFilterProps) {
  return (
    <div
      data-tour="dashboard-period-filter"
      className="mb-md flex flex-wrap items-center gap-sm"
    >
      <span className="text-xs font-medium text-on-surface-variant">الفترة:</span>
      <div className="flex flex-wrap gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-0.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              value === opt.id
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function salesLabelForPeriod(period: DashboardPeriod): string {
  switch (period) {
    case 'day':
      return 'مبيعات اليوم'
    case 'week':
      return 'مبيعات الأسبوع'
    case 'month':
      return 'مبيعات الشهر'
    case 'year':
      return 'مبيعات السنة'
    case 'all':
      return 'إجمالي المبيعات'
  }
}

export function invoicesLabelForPeriod(period: DashboardPeriod): string {
  switch (period) {
    case 'day':
      return 'فواتير اليوم'
    case 'week':
      return 'فواتير الأسبوع'
    case 'month':
      return 'فواتير الشهر'
    case 'year':
      return 'فواتير السنة'
    case 'all':
      return 'إجمالي الفواتير'
  }
}
