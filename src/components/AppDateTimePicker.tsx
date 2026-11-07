import { type ComponentProps } from 'react'
import { AppDatePicker } from './AppDatePicker'

type Props = Omit<ComponentProps<typeof AppDatePicker>, 'minDate' | 'maxDate'>

/** Preserve datetime-local's wall-clock string contract without UTC conversion. */
export function AppDateTimePicker({
  value = '',
  onChange,
  min,
  max,
  required,
  disabled,
  className,
  id,
  name,
  ...props
}: Props) {
  const [date = '', time = ''] = value.split('T')
  function update(nextDate: string, nextTime: string) {
    onChange(nextDate && nextTime ? `${nextDate}T${nextTime}` : '')
  }
  return (
    <span className="app-datetime-field">
      {name && (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      )}
      <AppDatePicker
        {...props}
        id={id}
        value={date}
        onChange={(next) => update(next, next ? time || '00:00' : '')}
        min={min?.split('T')[0]}
        max={max?.split('T')[0]}
        required={required}
        disabled={disabled}
        className={className}
      />
      <input
        type="time"
        aria-label={
          document.documentElement.lang.startsWith('ar') ? 'الوقت' : 'Time'
        }
        value={time}
        onChange={(event) => update(date, event.target.value)}
        min={date === min?.split('T')[0] ? min.split('T')[1] : undefined}
        max={date === max?.split('T')[0] ? max.split('T')[1] : undefined}
        required={required || Boolean(date)}
        disabled={disabled || !date}
        className={className}
        dir="ltr"
      />
    </span>
  )
}
