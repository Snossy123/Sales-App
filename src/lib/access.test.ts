import { describe, expect, it } from 'vitest'
import type { AuthUser } from '../api/types'
import { getUserRole, isAnyAdmin, userHasPermission } from './access'
import {
  userHasAccountingAccess,
  userHasAnyPermissionPrefix,
  userHasReviewAccess,
} from './permissionChecks'

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    name: 'Tester',
    email: 't@example.com',
    organization_id: 1,
    permissions: [],
    roles: [],
    ...overrides,
  }
}

describe('permissionChecks', () => {
  it('detects permission prefixes and accounting access', () => {
    expect(userHasAnyPermissionPrefix(null, 'review')).toBe(false)
    expect(userHasReviewAccess(user({ permissions: ['review.invoices.approve'] }))).toBe(true)
    expect(userHasReviewAccess(user())).toBe(false)
    expect(
      userHasAccountingAccess(user({ permissions: ['accounting.access_accounting_module'] })),
    ).toBe(true)
    expect(userHasAccountingAccess(user({ permissions: ['review.invoices.approve'] }))).toBe(false)
  })
})

describe('access', () => {
  it('checks exact permissions', () => {
    expect(userHasPermission(null, 'crm.leads.manage')).toBe(false)
    expect(userHasPermission(user({ permissions: ['crm.leads.manage'] }), 'crm.leads.manage')).toBe(
      true,
    )
  })

  it('resolves demo role first, then named roles and permissions', () => {
    expect(getUserRole(null)).toBe('sales')
    expect(getUserRole(user({ demo_role: 'collector' }))).toBe('collector')
    expect(getUserRole(user({ roles: [{ id: 1, name: 'Admin' }] }))).toBe('super_admin')
    expect(getUserRole(user({ permissions: ['crm.leads.manage'] }))).toBe('crm')
  })

  it('treats only admin demo roles as any-admin', () => {
    expect(isAnyAdmin(user({ demo_role: 'admin' }))).toBe(true)
    expect(isAnyAdmin(user({ demo_role: 'super_admin' }))).toBe(true)
    expect(isAnyAdmin(user({ demo_role: 'sales' }))).toBe(false)
  })
})
