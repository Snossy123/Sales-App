export function openPaymentReceiptPrint(paymentId: number): void {
  window.open(`/payments/${paymentId}/receipt?print=1`, '_blank', 'noopener,noreferrer')
}
