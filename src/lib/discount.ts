export type DiscountMode = 'amount' | 'percent'

export function amountFromPercent(base: number, percent: number): number {
  if (base <= 0 || percent <= 0) return 0
  return Math.round(base * (percent / 100) * 100) / 100
}

export function percentFromAmount(base: number, amount: number): number {
  if (base <= 0 || amount <= 0) return 0
  return Math.round((amount / base) * 10000) / 100
}

export function clampDiscountAmount(base: number, amount: number): number {
  return Math.min(Math.max(0, amount), base)
}
