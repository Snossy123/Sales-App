export const DISPLAY_LOCALE = 'ar-EG'

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
