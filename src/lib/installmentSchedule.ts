export type InstallmentIntervalType = 'monthly' | 'weekly'

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function formatDateOnly(date: Date): string {
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
  if (count < 1 || !firstDueDate) return null
  return installmentDueDate(firstDueDate, count - 1, intervalType, intervalDays)
}
