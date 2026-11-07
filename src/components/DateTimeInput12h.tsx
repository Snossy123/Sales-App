import { AppDatePicker } from './AppDatePicker'
import { useState } from 'react'
import { Icon } from './Icon'
import {
  emptyDateTime12hParts,
  formatDatetimeLocal,
  parseDatetimeLocal,
  periodLabels,
  type DateTime12hParts,
  type DayPeriod,
} from '../lib/datetime12h'

const inputClass = 'min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50'
const hourOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const minuteOptions = Array.from({ length: 60 }, (_, index) => index)

interface DateTimeInput12hProps {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

export function DateTimeInput12h({ value, onChange, className = '', disabled }: DateTimeInput12hProps) {
  const [pendingParts, setPendingParts] = useState<DateTime12hParts>(emptyDateTime12hParts)
  const parts = parseDatetimeLocal(value) ?? { ...pendingParts, date: '' }

  const emit = (next: DateTime12hParts) => {
    setPendingParts(next)
    if (!next.date) {
      onChange('')
      return
    }
    onChange(formatDatetimeLocal(next))
  }

  return (
    <div className={`min-w-0 space-y-2 ${className}`}>
      <AppDatePicker
        aria-label="تاريخ التذكير"
        value={parts.date}
        disabled={disabled}
        onChange={(e) => emit({ ...parts, date: e })}
        className={`${inputClass} w-full`}
      />
      {!parts.date && <p className="text-xs text-on-surface-variant">لم يتم اختيار تاريخ التذكير بعد.</p>}
      {parts.date && <p className="text-xs text-on-surface-variant" aria-live="polite">
        موعد التذكير: {new Date(`${parts.date}T12:00`).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn' })}
      </p>}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
          <Icon name="schedule" size={22} />
        </span>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1" dir="ltr">
        <select
          value={parts.hour}
          disabled={disabled}
          onChange={(e) => emit({ ...parts, hour: Number(e.target.value) })}
          className={`${inputClass} w-16 flex-1 text-center tabular-nums`}
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
          className={`${inputClass} w-16 flex-1 text-center tabular-nums`}
          aria-label="الدقيقة"
        >
          {minuteOptions.map((minute) => (
            <option key={minute} value={minute}>
              {String(minute).padStart(2, '0')}
            </option>
          ))}
        </select>
      </div>
      <div role="group" aria-label="صباحاً أو مساءً" className="inline-flex shrink-0 overflow-hidden rounded-lg border border-primary/20">
        {(Object.keys(periodLabels) as DayPeriod[]).map((period) => (
          <button
            key={period}
            type="button"
            disabled={disabled}
            aria-label={period === 'am' ? 'صباحاً' : 'مساءً'}
            aria-pressed={parts.period === period}
            onClick={() => emit({ ...parts, period })}
            className={`min-w-[2.5rem] px-2 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${parts.period === period ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'}`}
          >
            {periodLabels[period]}
          </button>
        ))}
      </div>
      </div>
    </div>
  )
}
