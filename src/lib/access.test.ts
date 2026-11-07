import { describe, expect, it } from 'vitest'
import type { AuthUser } from '../api/types'
import { getUserRole, isAnyAdmin, userHasPermission } from './access'
import { canAccessRoute, getNavEntriesForUser } from './permissions'
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

function navLabels(account: AuthUser): string[] {
  return getNavEntriesForUser(account).flatMap((entry) =>
    entry.type === 'item' ? [entry.item.label] : entry.group.items.map((item) => item.label),
  )
}

describe('user manual access', () => {
  it('opens the manual for system admins and managers only', () => {
    const systemAdmin = user({ roles: [{ id: 1, name: 'Admin' }] })
    const administrationManager = user({ roles: [{ id: 2, name: 'AdministrationManager' }] })
    const branchManager = user({ roles: [{ id: 3, name: 'BranchManager' }] })
    const sales = user({ roles: [{ id: 4, name: 'Sales' }], permissions: ['dashboard.view'] })

    expect(canAccessRoute('/help/manual', systemAdmin)).toBe(true)
    expect(canAccessRoute('/help/manual', administrationManager)).toBe(true)
    expect(canAccessRoute('/help/manual', branchManager)).toBe(true)
    expect(canAccessRoute('/help/manual', sales)).toBe(false)

    expect(navLabels(branchManager)).toContain('دليل الاستخدام')
    expect(navLabels(sales)).not.toContain('دليل الاستخدام')
  })
})


describe('expense request detail access', () => {
  it('lets an expense submitter open the request and its details without review permissions', () => {
    const submitter = user({ permissions: ['expenses.submit'], demo_role: 'sales' })
    expect(canAccessRoute('/expenses/new', submitter)).toBe(true)
    expect(canAccessRoute('/review/expenses/123', submitter)).toBe(true)
    expect(canAccessRoute('/review/expenses/123/', submitter)).toBe(true)
    expect(canAccessRoute('/review/expenses', submitter)).toBe(false)
  })

  it('does not grant expense detail access to an unrelated employee', () => {
    expect(canAccessRoute('/review/expenses/123', user({ permissions: ['dashboard.view'], demo_role: 'sales' }))).toBe(false)
  })
})


describe('expense edit and delete permissions', () => {
  it('opens expense details for users granted either independent management permission', () => {
    for (const permission of ['expenses.edit', 'expenses.delete']) {
      expect(canAccessRoute('/review/expenses/123', user({ permissions: [permission], demo_role: 'sales' }))).toBe(true)
    }
  })
})
