import type { AuthUser, SalesInvoice } from '../api/types'
import { getUserRole, userHasPermission } from './access'

export const EDIT_BEFORE_REVIEW_PERMISSION = 'sales.invoices.edit_before_review'
export const EDIT_AFTER_REVIEW_PERMISSION = 'review.edit_after_review'

export function contractEditPath(invoiceId: number): string {
  return `/invoices/${invoiceId}/edit`
}

export function canEditContract(user: AuthUser | null, invoice?: SalesInvoice | null): boolean {
  if (!user || !invoice) return false

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

