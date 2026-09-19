export function openPaymentReceiptPrint(paymentId: number): void {
  window.open(`/payments/${paymentId}/receipt?print=1`, '_blank', 'noopener,noreferrer')
}

export function openCollectionReceipts(data: { id?: number; related_payment_ids?: number[] } | null | undefined): void {
  const ids = (data?.related_payment_ids ?? []).filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)
  const uniqueIds = [...new Set(ids.map(Number))]
  if (uniqueIds.length === 0 && data?.id) {
    openPaymentReceiptPrint(Number(data.id))
    return
  }
  uniqueIds.forEach((id) => openPaymentReceiptPrint(id))
}
