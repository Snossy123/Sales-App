export type CashSchedule = 'immediate' | 'month_1' | 'month_2' | 'month_3' | 'custom'

export interface CashScheduleItem {
  amount: number
  dueDate: string
}

export const cashScheduleOptions: { value: CashSchedule; label: string }[] = [
  { value: 'immediate', label: 'فوري' },
  { value: 'month_1', label: 'شهر' },
  { value: 'month_2', label: 'شهرين' },
  { value: 'month_3', label: '3 شهور' },
  { value: 'custom', label: 'جدولة حرة' },
]

export function isDeferredCashSchedule(schedule: CashSchedule | undefined | null): boolean {
  return schedule != null && schedule !== 'immediate'
}

export function isCustomCashSchedule(schedule: CashSchedule | undefined | null): boolean {
  return schedule === 'custom'
}

export function cashDueDate(schedule: CashSchedule, contractDate: string): string | null {
  if (!isDeferredCashSchedule(schedule) || isCustomCashSchedule(schedule)) return null
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

export function seedCashScheduleItems(remainder: number, contractDate: string): CashScheduleItem[] {
  return [{ amount: Math.max(0, Math.round(remainder * 100) / 100), dueDate: contractDate }]
}

export function resizeCashScheduleItems(
  items: CashScheduleItem[],
  count: number,
  contractDate: string,
): CashScheduleItem[] {
  const nextCount = Math.max(1, Math.floor(count))
  if (items.length === nextCount) return items
  if (items.length > nextCount) return items.slice(0, nextCount)

  return [
    ...items,
    ...Array.from({ length: nextCount - items.length }, () => ({
      amount: 0,
      dueDate: contractDate,
    })),
  ]
}

export function cashScheduleItemsTotal(items: CashScheduleItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0) * 100) / 100
}

export function validateCashScheduleItems(
  items: CashScheduleItem[] | undefined,
  remainder: number,
  maxCount: number,
): string[] {
  const errors: string[] = []
  const list = items ?? []

  if (list.length < 1) {
    errors.push('أضف قسطًا واحدًا على الأقل')
    return errors
  }

  if (list.length > maxCount) {
    errors.push(`عدد الأقساط يتجاوز الحد الأقصى (${maxCount})`)
  }

  list.forEach((item, index) => {
    if (!(item.amount > 0)) {
      errors.push(`قيمة القسط ${index + 1} يجب أن تكون أكبر من صفر`)
    }
    if (!item.dueDate) {
      errors.push(`تاريخ تحصيل القسط ${index + 1} مطلوب`)
    }
  })

  const total = cashScheduleItemsTotal(list)
  if (Math.abs(total - remainder) > 0.01) {
    errors.push('مجموع الأقساط يجب أن يساوي المتبقي بعد المقدم')
  }

  return errors
}

export function toCheckoutCashScheduleItems(
  items: CashScheduleItem[],
): { amount: number; due_date: string }[] {
  return items.map((item) => ({ amount: item.amount, due_date: item.dueDate }))
}

export function fromPlanCashScheduleItems(plan?: {
  custom_schedule?: { amount?: number | string; due_date?: string }[] | null
  items?: { amount?: number | string; due_date?: string }[] | null
} | null): CashScheduleItem[] {
  const custom = plan?.custom_schedule
  if (custom && custom.length > 0) {
    return custom.map((item) => ({
      amount: Number(item.amount ?? 0),
      dueDate: item.due_date ?? '',
    }))
  }

  return (plan?.items ?? []).map((item) => ({
    amount: Number(item.amount ?? 0),
    dueDate: item.due_date ?? '',
  }))
}

export function cashLineCheckoutFields(line: {
  paymentTerm: 'cash' | 'installment'
  cashSchedule: CashSchedule
  downPayment: number
  cashScheduleItems?: CashScheduleItem[]
}): {
  cash_schedule?: CashSchedule
  down_payment?: number
  cash_schedule_items?: { amount: number; due_date: string }[]
} {
  if (line.paymentTerm !== 'cash') return {}

  return {
    cash_schedule: line.cashSchedule,
    down_payment: line.downPayment > 0 ? line.downPayment : undefined,
    cash_schedule_items:
      line.cashSchedule === 'custom'
        ? toCheckoutCashScheduleItems(line.cashScheduleItems ?? [])
        : undefined,
  }
}
