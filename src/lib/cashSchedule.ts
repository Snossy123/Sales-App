export type CashSchedule = 'immediate' | 'month_1' | 'month_2' | 'month_3'

export const cashScheduleOptions: { value: CashSchedule; label: string }[] = [
  { value: 'immediate', label: 'فوري' },
  { value: 'month_1', label: 'شهر' },
  { value: 'month_2', label: 'شهرين' },
  { value: 'month_3', label: '3 شهور' },
]

export function isDeferredCashSchedule(schedule: CashSchedule | undefined | null): boolean {
  return schedule != null && schedule !== 'immediate'
}

export function cashDueDate(schedule: CashSchedule, contractDate: string): string | null {
  if (!isDeferredCashSchedule(schedule)) return null
  const months = schedule === 'month_1' ? 1 : schedule === 'month_2' ? 2 : 3
  const d = new Date(contractDate)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

export function linePaidNow(
  paymentTerm: 'cash' | 'installment',
  cashSchedule: CashSchedule | undefined,
  lineTotal: number,
  downPayment = 0,
): number {
  if (paymentTerm === 'installment') {
    return Math.min(lineTotal, Math.max(0, downPayment))
  }

  const down = Math.min(lineTotal, Math.max(0, downPayment))

  if (isDeferredCashSchedule(cashSchedule)) {
    return down
  }

  return down > 0 ? down : lineTotal
}

export function cashRemainder(lineTotal: number, downPayment: number): number {
  return Math.max(0, lineTotal - Math.min(lineTotal, Math.max(0, downPayment)))
}

export function priceForPaymentTerm(
  paymentTerm: 'cash' | 'installment',
  cashPrice: number,
  installmentPrice: number,
): number {
  return paymentTerm === 'cash' ? cashPrice : installmentPrice
}
