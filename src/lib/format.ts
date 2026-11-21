import { periodLabels, to12HourParts } from './datetime12h'

export const DISPLAY_LOCALE = 'ar-EG'
export const DISPLAY_TIMEZONE = 'Africa/Cairo'

const LATN: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions = {
  numberingSystem: 'latn',
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function formatNumber(
  value: number | string | null | undefined,
  options?: Intl.NumberFormatOptions,
): string {
  const n = toFiniteNumber(value)
  if (n == null) return '—'
  return new Intl.NumberFormat(DISPLAY_LOCALE, { ...LATN, ...options }).format(n)
}

/** Currency-style money (theme / dashboards). Always Latin digits. */
export function formatMoney(
  value: number | string | null | undefined,
  currency = 'EGP',
  locale = DISPLAY_LOCALE,
): string {
  const n = toFiniteNumber(value)
  if (n == null) return '—'
  return new Intl.NumberFormat(locale, {
    ...LATN,
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}

/** Accounting-style money: 2 decimals + ج.م */
export function formatAccountingMoney(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  const n = toFiniteNumber(value)
  if (n == null) return '—'
  return `${formatNumber(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`
}

const BIDI_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

function stripBidiMarks(value: string): string {
  return value.replace(BIDI_MARKS, '')
}

function parseDisplayDate(value: string | Date): Date {
  if (value instanceof Date) return value
  const match = DATE_ONLY.exec(value)
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }
  return new Date(value)
}

export function formatDate(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale = DISPLAY_LOCALE,
): string {
  if (value == null || value === '') return '—'
  const d = parseDisplayDate(typeof value === 'string' ? value.split('T')[0] : value)
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '—'
  return stripBidiMarks(
    new Intl.DateTimeFormat(locale, {
      ...LATN,
      ...(options ?? { day: '2-digit', month: '2-digit', year: 'numeric' }),
    }).format(d),
  )
}

export function formatDateTime(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale = DISPLAY_LOCALE,
): string {
  if (value == null || value === '') return '—'
  const d = parseDisplayDate(value)
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '—'
  return stripBidiMarks(
    new Intl.DateTimeFormat(locale, {
      ...LATN,
      ...(options ?? {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    }).format(d),
  )
}

export function formatTime(
  value: string | Date | null | undefined,
  locale = DISPLAY_LOCALE,
): string {
  if (value == null || value === '') return '—'
  const d = parseDisplayDate(value)
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '—'
  return stripBidiMarks(
    new Intl.DateTimeFormat(locale, {
      ...LATN,
      timeZone: DISPLAY_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
    }).format(d),
  )
}

const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/
const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function clock12(hour24: number, minute: number): string {
  const { hour, period } = to12HourParts(hour24)
  return `${pad2(hour)}:${pad2(minute)} ${periodLabels[period]}`
}

function ymdFromInstant(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((value) => value.type === type)?.value ?? ''
  return `${part('year')}/${part('month')}/${part('day')}`
}

/** Calendar date as yyyy/mm/dd. A leading YYYY-MM-DD is kept as written. */
export function formatCalendarYmd(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') {
    const match = DATE_PREFIX.exec(value.trim())
    if (match) return `${match[1]}/${match[2]}/${match[3]}`
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return ymdFromInstant(date)
}

/** yyyy/mm/dd, and a 12-hour Cairo clock when the value includes a time. */
export function formatCairoDateTime12h(value: string | null | undefined): string {
  if (value == null || value === '') return '—'
  const trimmed = value.trim()
  const wall = WALL_CLOCK.exec(trimmed)
  if (!wall) return formatCalendarYmd(trimmed)

  if (HAS_ZONE.test(trimmed)) {
    const instant = new Date(trimmed)
    if (Number.isNaN(instant.getTime())) return `${wall[1]}/${wall[2]}/${wall[3]}`
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: DISPLAY_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(instant)
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
    const hour = part('hour') === '24' ? 0 : Number(part('hour'))
    return `${part('year')}/${part('month')}/${part('day')}، ${clock12(hour, Number(part('minute')))}`
  }

  return `${wall[1]}/${wall[2]}/${wall[3]}، ${clock12(Number(wall[4]), Number(wall[5]))}`
}
