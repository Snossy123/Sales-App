import {
  emptyDateTime12hParts,
  formatDatetimeLocal,
  parseDatetimeLocal,
  periodLabels,
  type DateTime12hParts,
  type DayPeriod,
} from '../lib/datetime12h'

const inputClass = 'rounded border border-outline-variant px-sm py-2 text-sm'
const hourOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const minuteOptions = Array.from({ length: 60 }, (_, index) => index)

interface DateTimeInput12hProps {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

function getParts(value: string): DateTime12hParts {
  return parseDatetimeLocal(value) ?? emptyDateTime12hParts
}

export function DateTimeInput12h({ value, onChange, className = '', disabled }: DateTimeInput12hProps) {
  const parts = getParts(value)

  const emit = (next: DateTime12hParts) => {
    if (!next.date) {
      onChange('')
      return
    }
    onChange(formatDatetimeLocal(next))
  }

  return (
    <div className={`grid grid-cols-1 gap-xs sm:grid-cols-[minmax(0,1.4fr)_auto_auto_auto] sm:items-center ${className}`}>
      <input
        type="date"
        value={parts.date}
        disabled={disabled}
        onChange={(e) => emit({ ...parts, date: e.target.value })}
        className={`${inputClass} w-full`}
        dir="ltr"
      />
      <div className="flex items-center gap-1">
        <select
          value={parts.hour}
          disabled={disabled}
          onChange={(e) => emit({ ...parts, hour: Number(e.target.value) })}
          className={`${inputClass} min-w-[4.5rem]`}
          aria-label="الساعة"
        >
          {hourOptions.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
        <span className="text-sm text-on-surface-variant">:</span>
        <select
          value={parts.minute}
          disabled={disabled}
          onChange={(e) => emit({ ...parts, minute: Number(e.target.value) })}
          className={`${inputClass} min-w-[4.5rem]`}
          aria-label="الدقيقة"
        >
          {minuteOptions.map((minute) => (
            <option key={minute} value={minute}>
              {String(minute).padStart(2, '0')}
            </option>
          ))}
        </select>
      </div>
      <select
        value={parts.period}
        disabled={disabled}
        onChange={(e) => emit({ ...parts, period: e.target.value as DayPeriod })}
        className={`${inputClass} min-w-[4.5rem]`}
        aria-label="صباحاً أو مساءً"
      >
        {(Object.keys(periodLabels) as DayPeriod[]).map((period) => (
          <option key={period} value={period}>
            {periodLabels[period]}
          </option>
        ))}
      </select>
    </div>
  )
}
