import type { AuthUser, SalesInvoice } from '../api/types'
import { getUserRole, userHasPermission } from './access'
import { getUserDataScope, isBranchInDataScope } from './dataScope'

export const EDIT_BEFORE_REVIEW_PERMISSION = 'sales.invoices.edit_before_review'
export const EDIT_AFTER_REVIEW_PERMISSION = 'review.edit_after_review'

export function isClosedContract(invoice?: SalesInvoice | null): boolean {
  return invoice?.contract_status === 'cancelled' || invoice?.contract_status === 'returned'
}

/** @deprecated Sold services now use the same full edit flow as new contracts. Kept for callers until removed. */
export function isExecutionBranchOnlyContract(_invoice: SalesInvoice): boolean {
  return false
}

export function contractEditPath(invoiceId: number): string {
  return `/invoices/${invoiceId}/edit`
}

export function canOperateContract(user: AuthUser | null, invoice?: SalesInvoice | null): boolean {
  if (!user || !invoice) return false

  const scope = getUserDataScope(user)
  if (scope === 'organization' || scope === 'administration' || scope === 'none') return true

  return (
    isBranchInDataScope(user, invoice.branch_id) ||
    isBranchInDataScope(user, invoice.action_branch_id)
  )
}

export function canEditContract(user: AuthUser | null, invoice?: SalesInvoice | null): boolean {
  if (!canOperateContract(user, invoice) || !invoice) return false

  const status = invoice.review_status
  const role = getUserRole(user)
  const isAdmin = role === 'super_admin' || role === 'admin'

  if (status === 'pending' || status === 'rejected') {
    return isAdmin || userHasPermission(user, EDIT_BEFORE_REVIEW_PERMISSION)
  }
  if (status === 'approved') {
    return isAdmin || userHasPermission(user, EDIT_AFTER_REVIEW_PERMISSION)
  }

  return false
}

export function canConvertCashToInstallment(
  user: AuthUser | null,
  invoice?: SalesInvoice | null,
): boolean {
  if (!canEditContract(user, invoice) || !invoice) return false
  if (invoice.payment_term !== 'cash') return false
  if (invoice.ownership_transferred_at) return false
  if (invoice.status && invoice.status !== 'confirmed') return false

  const contractStatus = invoice.contract_status ?? 'active'
  return contractStatus === 'active' || contractStatus === 'in_problem'
}

