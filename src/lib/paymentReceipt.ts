export function openPaymentReceiptPrint(paymentId: number): void {
  window.location.assign(`/payments/${paymentId}/receipt?print=1`)
}

export function openCollectionReceipts(data: { id?: number; related_payment_ids?: number[] } | null | undefined): void {
  const ids = (data?.related_payment_ids ?? []).filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)
  const uniqueIds = [...new Set(ids.map(Number))]
  const paymentId = uniqueIds[0] ?? (data?.id ? Number(data.id) : undefined)
  if (!paymentId) return
  openPaymentReceiptPrint(paymentId)
}
