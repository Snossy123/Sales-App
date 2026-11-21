import { describe, expect, it } from 'vitest'
import type { AuthUser, SalesInvoice } from '../api/types'
import { getUserRole, isAnyAdmin, userHasPermission } from './access'
import { canExchangeContract, canReturnContract } from './contractCases'
import type { CrmPageVisibilityContext } from './crmPageVisibility'
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

function navLabels(account: AuthUser, visibility?: CrmPageVisibilityContext): string[] {
  return getNavEntriesForUser(account, visibility).flatMap((entry) =>
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

  it('hides CRM tasks and activities for the current administration', () => {
    const crm = user({ demo_role: 'admin' })
    const hidden = {
      departmentId: 4,
      departments: [{ id: 4, settings: { crm_tasks_enabled: false, crm_activities_enabled: false } }],
    }
    const visibleSibling = {
      departmentId: 5,
      departments: [
        { id: 4, settings: { crm_tasks_enabled: false, crm_activities_enabled: false } },
        { id: 5, settings: { crm_tasks_enabled: true, crm_activities_enabled: true } },
      ],
    }

    expect(canAccessRoute('/crm/tasks', crm, hidden)).toBe(false)
    expect(canAccessRoute('/crm/activities', crm, hidden)).toBe(false)
    expect(canAccessRoute('/crm/call-logs', crm, hidden)).toBe(true)
    expect(navLabels(crm, hidden)).not.toContain('المهام')
    expect(navLabels(crm, hidden)).not.toContain('الأنشطة')
    expect(navLabels(crm, visibleSibling)).toContain('المهام')
    expect(navLabels(crm, visibleSibling)).toContain('الأنشطة')
  })
})

describe('CRM screen permissions', () => {
  it('hides an analytics screen when its permission is off, even if the older lead permission is on', () => {
    const crm = user({
      demo_role: 'crm',
      permissions: ['crm.access_all_leads', 'crm.access_own_leads', 'crm.reports.referrals'],
    })

    expect(canAccessRoute('/crm/reports', crm)).toBe(true)
    expect(canAccessRoute('/crm/reports/leaderboard', crm)).toBe(false)
    expect(canAccessRoute('/crm/ceo', crm)).toBe(false)
    expect(navLabels(crm)).toContain('تقارير الترشيحات')
    expect(navLabels(crm)).not.toContain('لوحة المتصدرين')
    expect(navLabels(crm)).not.toContain('لوحة المدير')
  })

  it('hides CRM screens for a manager who no longer has that permission', () => {
    const manager = user({
      demo_role: 'admin',
      roles: [{ id: 2, name: 'AdministrationManager' }],
      permissions: ['dashboard.view', 'crm.reports.referrals', 'users.manage'],
    })

    expect(canAccessRoute('/crm/reports', manager)).toBe(true)
    expect(canAccessRoute('/crm/reports/leaderboard', manager)).toBe(false)
    expect(canAccessRoute('/admin/users', manager)).toBe(true)
    expect(navLabels(manager)).toContain('تقارير الترشيحات')
    expect(navLabels(manager)).not.toContain('لوحة المتصدرين')
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

describe('contract action access', () => {
  const invoice = {
    review_status: 'approved',
    contract_status: 'active',
  } as SalesInvoice

  it('opens contract details, printing, return, and exchange without a special permission', () => {
    const sales = user({ permissions: ['customers.view'], demo_role: 'sales' })
    const collector = user({ permissions: [], demo_role: 'collector' })

    expect(canAccessRoute('/contracts/12', sales)).toBe(true)
    expect(canAccessRoute('/invoices/12/contract-print', sales)).toBe(true)
    expect(canAccessRoute('/invoices/12/service-contract/3', sales)).toBe(true)
    expect(canAccessRoute('/invoices/12/ownership-transfer-contract', collector)).toBe(true)
    expect(canReturnContract(sales, invoice)).toBe(true)
    expect(canExchangeContract(collector, invoice)).toBe(true)
    expect(canAccessRoute('/problems', sales)).toBe(false)
  })
})
