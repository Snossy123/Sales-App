import type { AuthUser, SalesInvoice } from '../api/types'
import { getUserRole, userHasPermission } from './access'

export const CONTRACT_CASES_MANAGE_PERMISSION = 'contract_cases.manage'

export type ContractProblemCaseType = 'exchange' | 'return'

function isActiveContract(invoice?: SalesInvoice | null): boolean {
  if (!invoice) return false
  return !invoice.contract_status || invoice.contract_status === 'active'
}

export function isContractEligibleForProblems(invoice?: SalesInvoice | null): boolean {
  return Boolean(invoice?.review_status === 'approved' && isActiveContract(invoice))
}

export function canTransferContractToProblems(
  user: AuthUser | null,
  invoice?: SalesInvoice | null,
): boolean {
  return userHasPermission(user, CONTRACT_CASES_MANAGE_PERMISSION) && isContractEligibleForProblems(invoice)
}

export function canRejectContract(user: AuthUser | null, invoice?: SalesInvoice | null): boolean {
  if (!invoice || invoice.review_status !== 'pending') return false
  if (userHasPermission(user, 'review.reject')) return true
  return ['super_admin', 'admin', 'reviewer'].includes(getUserRole(user))
}

export function canExchangeContract(user: AuthUser | null, invoice?: SalesInvoice | null): boolean {
  if (!userHasPermission(user, CONTRACT_CASES_MANAGE_PERMISSION) || !isActiveContract(invoice)) {
    return false
  }
  return invoice?.review_status === 'pending' || invoice?.review_status === 'approved'
}

export function canReturnContract(user: AuthUser | null, invoice?: SalesInvoice | null): boolean {
  return userHasPermission(user, CONTRACT_CASES_MANAGE_PERMISSION) && isContractEligibleForProblems(invoice)
}
