import { describe, expect, it } from 'vitest'
import type { AuthUser } from '../api/types'
import { contractReviewPermissions } from './contractReviewPermissions'

const user = (permissions: string[] = [], demo_role: AuthUser['demo_role'] = 'reviewer'): AuthUser => ({
  id: 1, organization_id: 1, name: 'Reviewer', email: 'review@example.com', permissions, demo_role,
})

describe('contract review decision permissions', () => {
  it('does not grant access based on role alone', () => {
    for (const role of ['reviewer', 'admin', 'super_admin'] as const) {
      expect(contractReviewPermissions(user([], role))).toEqual({ canView: false, canApprove: false, canReject: false })
    }
    expect(contractReviewPermissions(null).canView).toBe(false)
  })
  it('separates viewing from approving and rejecting', () => {
    expect(contractReviewPermissions(user(['review.view_detail']))).toEqual({ canView: true, canApprove: false, canReject: false })
    expect(contractReviewPermissions(user(['review.approve']))).toEqual({ canView: true, canApprove: true, canReject: false })
    expect(contractReviewPermissions(user(['review.reject']))).toEqual({ canView: true, canApprove: false, canReject: true })
  })
})
