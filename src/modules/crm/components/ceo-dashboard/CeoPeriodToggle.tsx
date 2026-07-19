import type { DashboardPeriod } from '../../../../components/DashboardPeriodFilter'

const OPTIONS: { id: DashboardPeriod; label: string }[] = [
  { id: 'day', label: 'يوم' },
  { id: 'week', label: 'أسبوع' },
  { id: 'month', label: 'شهر' },
  { id: 'year', label: 'سنة' },
  { id: 'all', label: 'الكل' },
]

interface CeoPeriodToggleProps {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
}

export function CeoPeriodToggle({ value, onChange }: CeoPeriodToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] font-medium text-[#8890a0]">الفترة</span>
      <div className="flex gap-1 rounded-xl bg-[#eaedf4] p-1">
        {OPTIONS.map((opt) => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`rounded-[9px] px-4 py-[7px] text-[13px] font-semibold transition-all ${
                active
                  ? 'bg-primary text-on-primary shadow-[0_1px_2px_rgba(42,91,215,0.35)]'
                  : 'bg-transparent text-[#5b6272] hover:text-[#374151]'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
