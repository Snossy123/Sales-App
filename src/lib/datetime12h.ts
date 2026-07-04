export type DayPeriod = 'am' | 'pm'

export interface DateTime12hParts {
  date: string
  hour: number
  minute: number
  period: DayPeriod
}

export const periodLabels: Record<DayPeriod, string> = {
  am: 'ص',
  pm: 'م',
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function to12HourParts(hours24: number): { hour: number; period: DayPeriod } {
  if (hours24 === 0) return { hour: 12, period: 'am' }
  if (hours24 < 12) return { hour: hours24, period: 'am' }
  if (hours24 === 12) return { hour: 12, period: 'pm' }
  return { hour: hours24 - 12, period: 'pm' }
}

export function to24Hour(hour12: number, period: DayPeriod): number {
  if (period === 'am') return hour12 === 12 ? 0 : hour12
  return hour12 === 12 ? 12 : hour12 + 12
}

export function parseDatetimeLocal(value: string): DateTime12hParts | null {
  if (!value) return null

  const localMatch = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  if (localMatch) {
    const [, date, h24, min] = localMatch
    const { hour, period } = to12HourParts(Number(h24))
    return { date, hour, minute: Number(min), period }
  }

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null

  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const { hour, period } = to12HourParts(d.getHours())
  return { date, hour, minute: d.getMinutes(), period }
}

export function formatDatetimeLocal(parts: DateTime12hParts): string {
  const h24 = to24Hour(parts.hour, parts.period)
  return `${parts.date}T${pad2(h24)}:${pad2(parts.minute)}`
}

export function formatDatetime12hDisplay(value: string | null | undefined): string {
  if (!value) return '—'

  const parts = parseDatetimeLocal(value)
  if (!parts) return value

  const d = new Date(formatDatetimeLocal(parts))
  if (Number.isNaN(d.getTime())) return value

  return d.toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export const emptyDateTime12hParts: DateTime12hParts = {
  date: '',
  hour: 12,
  minute: 0,
  period: 'am',
}
