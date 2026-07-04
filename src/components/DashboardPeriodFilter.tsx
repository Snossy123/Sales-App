export type DashboardPeriod = 'day' | 'week' | 'month' | 'year' | 'all'

const options: { id: DashboardPeriod; label: string }[] = [
  { id: 'day', label: 'يوم' },
  { id: 'week', label: 'أسبوع' },
  { id: 'month', label: 'شهر' },
  { id: 'year', label: 'سنة' },
  { id: 'all', label: 'الكل' },
]

export interface DashboardBranchOption {
  id: number
  name: string
  name_ar?: string | null
}

interface DashboardPeriodFilterProps {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
  branchValue?: number | ''
  onBranchChange?: (branchId: number | '') => void
  branches?: DashboardBranchOption[]
  showBranchFilter?: boolean
}

export function DashboardPeriodFilter({
  value,
  onChange,
  branchValue = '',
  onBranchChange,
  branches = [],
  showBranchFilter = false,
}: DashboardPeriodFilterProps) {
  return (
    <div
      data-tour="dashboard-period-filter"
      className="mb-md flex flex-wrap items-center gap-md"
    >
      <div className="flex flex-wrap items-center gap-sm">
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

      {showBranchFilter && onBranchChange ? (
        <div className="flex flex-wrap items-center gap-sm">
          <label htmlFor="dashboard-branch-filter" className="text-xs font-medium text-on-surface-variant">
            الفرع:
          </label>
          <select
            id="dashboard-branch-filter"
            value={branchValue === '' ? '' : String(branchValue)}
            onChange={(e) => onBranchChange(e.target.value ? Number(e.target.value) : '')}
            className="min-w-[10rem] rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-1.5 text-xs font-medium text-on-surface"
          >
            <option value="">كل الفروع</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name_ar || branch.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
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
