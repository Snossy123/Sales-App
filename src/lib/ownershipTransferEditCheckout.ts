import type { ContractKind } from '../api/types'

/**
 * Ownership-transfer fee service lines are rebuilt from the fees UI on every
 * save. Reusing the invoice's existing service lines would duplicate them and,
 * for installment transfers, resend installment rows without installment_plan.
 */
export function shouldReuseInvoiceServiceLinesOnEdit(
  contractKind: ContractKind,
): boolean {
  return contractKind !== 'ownership_transfer'
}
