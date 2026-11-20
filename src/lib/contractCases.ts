import type { AuthUser, SalesInvoice } from '../api/types'
import { getUserRole, userHasPermission } from './access'

export type ContractProblemCaseType = 'exchange' | 'return'

function isActiveContract(invoice?: SalesInvoice | null): boolean {
  if (!invoice) return false
  return !invoice.contract_status || invoice.contract_status === 'active'
}

export function isContractEligibleForProblems(invoice?: SalesInvoice | null): boolean {
  return Boolean(invoice?.review_status === 'approved' && isActiveContract(invoice))
}

function canManageContractProblems(user: AuthUser | null): boolean {
  return user != null
}

export function canRejectContract(user: AuthUser | null, invoice?: SalesInvoice | null): boolean {
  if (!invoice || invoice.review_status !== 'pending') return false
  if (userHasPermission(user, 'review.reject')) return true
  return ['super_admin', 'admin', 'reviewer'].includes(getUserRole(user))
}

export function canExchangeContract(user: AuthUser | null, invoice?: SalesInvoice | null): boolean {
  if (!canManageContractProblems(user) || !isActiveContract(invoice)) {
    return false
  }
  return invoice?.review_status === 'pending' || invoice?.review_status === 'approved'
}

export function canReturnContract(user: AuthUser | null, invoice?: SalesInvoice | null): boolean {
  return canManageContractProblems(user) && isContractEligibleForProblems(invoice)
}
