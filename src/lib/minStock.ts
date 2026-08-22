export function isAtOrBelowMinStock(
  available: number,
  minStockLevel?: number | null,
): boolean {
  const min = Number(minStockLevel ?? 0)
  return min > 0 && available <= min
}

export function minStockWarningMessage(available: number): string {
  return `المخزون وصل للحد الأدنى (المتاح: ${available}). كلم الأدمن لطلب أجهزة.`
}
