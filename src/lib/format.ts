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

export function formatDate(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale = DISPLAY_LOCALE,
): string {
  if (value == null || value === '') return '—'
  const raw = typeof value === 'string' ? value.split('T')[0] : value
  const d = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '—'
  return new Intl.DateTimeFormat(locale, {
    ...LATN,
    ...(options ?? { dateStyle: 'medium' }),
  }).format(d)
}

export function formatDateTime(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale = DISPLAY_LOCALE,
): string {
  if (value == null || value === '') return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : '—'
  return new Intl.DateTimeFormat(locale, {
    ...LATN,
    ...(options ?? { dateStyle: 'medium', timeStyle: 'short' }),
  }).format(d)
}
