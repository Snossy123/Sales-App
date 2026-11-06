import type { AuthUser } from '../api/types'
import { userHasPermission } from './access'

export function contractReviewPermissions(user: AuthUser | null) {
  const canApprove = userHasPermission(user, 'review.approve')
  const canReject = userHasPermission(user, 'review.reject')
  return {
    canApprove,
    canReject,
    canView: userHasPermission(user, 'review.view_detail') || canApprove || canReject,
  }
}
