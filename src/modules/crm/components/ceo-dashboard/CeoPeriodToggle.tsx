import type { DashboardPeriod } from '../../../../components/DashboardPeriodFilter'
import { CrmChip } from '../ui/CrmChip'

export type CeoDashboardPeriod = DashboardPeriod | 'custom'

export interface CeoDateRange {
  from: string
  to: string
}

const OPTIONS: { id: CeoDashboardPeriod; label: string }[] = [
  { id: 'day', label: 'يوم' },
  { id: 'week', label: 'أسبوع' },
  { id: 'month', label: 'شهر' },
  { id: 'year', label: 'سنة' },
  { id: 'all', label: 'الكل' },
  { id: 'custom', label: 'مخصص' },
]

interface CeoPeriodToggleProps {
  value: CeoDashboardPeriod
  onChange: (period: CeoDashboardPeriod) => void
  dateRange: CeoDateRange
  onDateRangeChange: (range: CeoDateRange) => void
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: string
  min?: string
  max?: string
  onChange: (value: string) => void
}) {
  return (
    <label
      className="inline-flex h-[38px] items-center gap-2 px-2.5 text-[12px] font-medium"
      style={{
        border: '1px solid var(--crm-border)',
        borderRadius: 9,
        background: 'var(--crm-surface-muted)',
        color: 'var(--crm-text-faint)',
      }}
    >
      {label}
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="border-none bg-transparent text-[12.5px] font-medium outline-none"
        style={{ color: 'var(--crm-text)' }}
        dir="ltr"
      />
    </label>
  )
}

export function CeoPeriodToggle({
  value,
  onChange,
  dateRange,
  onDateRangeChange,
}: CeoPeriodToggleProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2.5">
      <span className="text-[12.5px] font-medium" style={{ color: 'var(--crm-text-faint)' }}>
        الفترة
      </span>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <CrmChip
            key={opt.id}
            label={opt.label}
            active={value === opt.id}
            onClick={() => onChange(opt.id)}
          />
        ))}
      </div>

      {value === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <DateField
            label="من"
            value={dateRange.from}
            max={dateRange.to || undefined}
            onChange={(from) => onDateRangeChange({ ...dateRange, from })}
          />
          <DateField
            label="إلى"
            value={dateRange.to}
            min={dateRange.from || undefined}
            onChange={(to) => onDateRangeChange({ ...dateRange, to })}
          />
        </div>
      )}
    </div>
  )
}
