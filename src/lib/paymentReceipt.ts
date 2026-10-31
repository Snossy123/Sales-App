export function openPaymentReceiptPrint(paymentId: number): void {
  window.open(`/payments/${paymentId}/receipt?print=1`, '_blank', 'noopener,noreferrer')
}

/** Collect must stay on the collection page. Receipt print is a separate action. */
export function openCollectionReceipts(
  _data?: { id?: number; related_payment_ids?: number[] } | null,
): void {}
