export type InstallmentIntervalType = 'monthly' | 'weekly'

function parseDateOnly(dateStr: string): Date {
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/)
  if (!match) return new Date(NaN)
  const [, year, month, day] = match.map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return new Date(NaN)
  return date
}

function formatDateOnly(date: Date): string {
  if (!Number.isFinite(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDateOnly(dateStr)
  date.setDate(date.getDate() + days)
  return formatDateOnly(date)
}

export function addMonthsNoOverflow(dateStr: string, months: number): string {
  const date = parseDateOnly(dateStr)
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(months)) return ''
  const day = date.getDate()
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, lastDay))
  return formatDateOnly(target)
}

export function installmentDueDate(
  firstDueDate: string,
  indexZeroBased: number,
  intervalType: InstallmentIntervalType | string | undefined,
  intervalDays?: number,
): string {
  if (intervalType === 'weekly') {
    return addDays(firstDueDate, indexZeroBased * Math.max(1, intervalDays ?? 7))
  }

  return addMonthsNoOverflow(firstDueDate, indexZeroBased)
}

export function nextInstallmentInterval(
  fromDate: string,
  intervalType: InstallmentIntervalType | string | undefined,
  intervalDays?: number,
): string {
  if (intervalType === 'weekly') {
    return addDays(fromDate, Math.max(1, intervalDays ?? 7))
  }

  return addMonthsNoOverflow(fromDate, 1)
}

export function lastInstallmentDate(
  firstDueDate: string,
  count: number,
  intervalType: InstallmentIntervalType | string | undefined,
  intervalDays?: number,
): string | null {
  if (!Number.isInteger(count) || count < 1 || !firstDueDate || !Number.isFinite(parseDateOnly(firstDueDate).getTime())) return null
  return installmentDueDate(firstDueDate, count - 1, intervalType, intervalDays)
}
