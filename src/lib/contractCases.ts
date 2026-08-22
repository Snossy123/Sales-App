import type { AuthUser, SalesInvoice } from '../api/types'
import { userHasPermission } from './access'

export const CONTRACT_CASES_MANAGE_PERMISSION = 'contract_cases.manage'

export function isContractEligibleForProblems(invoice?: SalesInvoice | null): boolean {
  if (!invoice) return false
  return (
    invoice.review_status === 'approved' &&
    (!invoice.contract_status || invoice.contract_status === 'active')
  )
}

export function canTransferContractToProblems(
  user: AuthUser | null,
  invoice?: SalesInvoice | null,
): boolean {
  return userHasPermission(user, CONTRACT_CASES_MANAGE_PERMISSION) && isContractEligibleForProblems(invoice)
}
