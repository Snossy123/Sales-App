/** Maps app routes to required permission keys (any one match grants access). */
export const ROUTE_PERMISSIONS: Record<string, string | string[]> = {
  '/': 'dashboard.view',
  '/pos': ['sales.pos.new', 'sales.pos'],
  '/pos/services': ['sales.pos.services', 'sales.pos'],
  '/pricing/catalog': ['sales.pos.catalog', 'sales.pos'],
  '/pricing/promotions': 'promotions.view',
  '/sales/accessories': ['sales.pos.accessories', 'sales.pos'],
  '/sales/maintenance': ['sales.pos.services', 'sales.pos'],
  '/sales/mission': 'sales.daily_mission',
  '/inventory': 'inventory.manage',
  '/inventory/branch': 'inventory.manage',
  '/inventory/movements': 'device_movements.manage',
  '/inventory/add': 'inventory.manage',
  '/inventory/transfers': 'stock.transfer',
  '/inventory/returns': 'stock.transfer',
  '/inventory/warehouses': 'warehouses.manage',
  '/inventory/settings': 'inventory.manage',
  '/inventory/accessories': ['inventory.manage', 'accessories.view'],
  '/inventory/accessory-packages': ['inventory.manage', 'accessory_packages.view'],
  '/inventory/accessory-stock': 'inventory.manage',
  '/customers': ['customers.manage', 'customers.view'],
  '/customers/add': ['customers.manage', 'customers.add'],
  '/distributors': ['customers.manage', 'distributors.view'],
  '/distributors/add': ['customers.manage', 'distributors.add'],
  '/services': ['settings.manage', 'services.view'],
  '/services/add': ['settings.manage', 'services.add'],
  '/contract-templates': 'settings.manage',
  '/invoices/review': ['review.view_queue', 'review.view_detail'],
  '/review/collections': 'review.view_collections',
  '/review/expenses': 'review.view_expenses',
  '/expenses/new': 'expenses.submit',
  '/invoices': ['review.view_contracts', 'sales.invoices.view'],
  '/invoices/mine': ['review.view_contracts', 'sales.invoices.view'],
  '/review/evaluation-queue': 'review.view_evaluation_queue',
  '/review/subscription-renewals': 'review.view_subscription_renewals',
  '/review/evaluation-questions': 'review.manage_evaluation_questions',
  '/installments': 'installments.view',
  '/payments': 'payments.view',
  '/call-center/collections': 'external_collections.collect',
  '/admin/collection-accounts': ['collection_accounts.manage', 'collection_accounts.view'],
  '/daily-reports': 'dashboard.view',
  '/departments': 'branches.manage',
  '/branches': 'branches.manage',
  '/sections': 'branches.manage',
  '/gps/management': 'branches.manage',
  '/admin/users': 'users.manage',
  '/admin/roles': 'roles.manage',
  '/admin/activity-log': 'audit.view',
  '/admin/trash': 'trash.view',
  '/admin/faq': 'faq.manage',
  '/admin/feedback': 'feedback.view',
  '/admin/settings': 'settings.manage',
  '/help/faq': 'dashboard.view',
  '/messages': 'dashboard.view',
  '/feedback': 'dashboard.view',
  '/crm': 'crm.access_own_leads',
  '/crm/ceo': 'crm.access_all_leads',
  '/crm/referrals': 'crm.access_own_leads',
  '/crm/referrals/add': 'crm.access_own_leads',
  '/crm/referrals/list': 'crm.access_own_leads',
  '/crm/referrals/network': 'crm.access_own_leads',
  '/crm/reports/employees': 'crm.access_all_leads',
  '/crm/reports/leaderboard': 'crm.access_all_leads',
  '/crm/reports/owner-detail': 'crm.access_all_leads',
  '/crm/reports/owner-pipeline': 'crm.access_all_leads',
  '/crm/activities': ['crm.activities.manage', 'crm.access_own_leads'],
  '/crm/call-logs': ['crm.view_own_call_log', 'crm.view_all_call_log'],
  '/crm/reports': 'crm.access_all_leads',
  '/crm/tasks': ['crm.access_own_schedule', 'crm.access_all_schedule'],
  '/support/my-tasks': 'support.view_assigned_tasks',
  '/support/tasks': ['support.view_all_tasks', 'support.assign_tasks'],
  '/problems': 'contract_cases.manage',
  '/accounting': 'accounting.access_accounting_module',
  '/accounting/chart-of-accounts': 'accounting.manage_accounts',
  '/accounting/journal-entries': 'accounting.view_journal',
  '/accounting/transfers': 'accounting.view_transfer',
  '/accounting/transactions': 'accounting.map_transactions',
  '/accounting/reports': 'accounting.view_reports',
  '/accounting/budgets': 'accounting.manage_budget',
  '/accounting/settings': 'accounting.access_accounting_module',
  '/hrm': 'hr.employees.manage',
  '/hrm/employees': 'hr.employees.manage',
  '/hrm/jobs': 'hr.employees.manage',
  '/hrm/leaves': 'hrm.leave.manage',
  '/hrm/leave-types': 'hrm.leave.manage',
  '/hrm/attendance': 'hrm.attendance.manage',
  '/hrm/zk-devices': 'hrm.attendance.manage',
  '/hrm/shifts': 'hrm.shift.manage',
  '/hrm/holidays': 'hrm.holiday.manage',
  '/hrm/allowances': 'hrm.allowance.manage',
  '/hrm/payroll': 'hrm.payroll.manage',
  '/hrm/payroll-groups': 'hrm.payroll.manage',
  '/hrm/sales-targets': 'hrm.sales_target.manage',
  '/hrm/settings': ['settings.manage', 'hr.employees.manage'],
}

function asPermissionList(value: string | string[] | undefined): string[] | null {
  if (!value) return null
  return Array.isArray(value) ? value : [value]
}

export function resolveRoutePermissions(path: string): string[] | null {
  const normalized = path.replace(/\/$/, '') || '/'

  if (ROUTE_PERMISSIONS[normalized]) {
    return asPermissionList(ROUTE_PERMISSIONS[normalized])
  }

  if (normalized.match(/^\/customers\/\d+\/edit$/)) return ['customers.manage', 'customers.edit']
  if (normalized.startsWith('/customers/')) return ['customers.manage', 'customers.view']
  if (normalized.startsWith('/distributors/')) return ['customers.manage', 'distributors.view']
  if (normalized.match(/^\/services\/.+\/edit$/)) return ['settings.manage', 'services.edit']
  if (normalized.startsWith('/services/')) return ['settings.manage', 'services.view']
  if (normalized.startsWith('/contract-templates/')) return ['settings.manage']
  if (normalized.match(/^\/departments\/\d+$/)) return ['branches.manage']
  if (normalized.match(/^\/branches\/\d+$/)) return ['branches.manage']
  if (normalized.match(/^\/review\/expenses\/\d+$/)) {
    return ['review.view_expenses', 'review.approve_expenses']
  }
  if (normalized.match(/^\/review\/collections\/\d+$/)) {
    return ['review.view_collections', 'review.confirm_collections']
  }
  if (normalized.startsWith('/inventory/movements')) {
    return ['device_movements.manage']
  }
  if (normalized.match(/^\/payments\/\d+\/receipt$/)) {
    return ['payments.view']
  }
  if (normalized.startsWith('/daily-reports')) {
    return ['dashboard.view']
  }
  if (normalized.match(/^\/invoices\/\d+\/edit$/)) {
    return ['sales.invoices.edit_before_review', 'review.edit_after_review']
  }
  if (normalized.match(/^\/invoices\/review\/\d+$/)) {
    return ['review.view_queue', 'review.view_detail']
  }
  if (normalized.match(/^\/review\/evaluation-queue\/\d+$/)) {
    return ['review.view_evaluation_queue', 'review.record_evaluation']
  }
  if (normalized.match(/^\/contracts\/\d+/)) {
    return ['contract_cases.manage', 'sales.invoices.view', 'customers.manage', 'installments.view']
  }
  if (normalized.match(/^\/invoices\/\d+/)) {
    return ['review.view_contracts', 'sales.invoices.view', 'review.view_detail']
  }
  if (normalized.startsWith('/accounting/chart-of-accounts')) {
    return ['accounting.manage_accounts']
  }
  if (normalized.startsWith('/accounting/')) {
    const accountingRoute = normalized.match(/^\/accounting\/[^/]+/)?.[0] ?? '/accounting'
    return asPermissionList(ROUTE_PERMISSIONS[accountingRoute] ?? ROUTE_PERMISSIONS['/accounting'])
  }
  if (normalized.startsWith('/hrm/employees')) {
    return ['hr.employees.manage']
  }
  if (normalized.startsWith('/hrm/')) {
    const hrmRoute = normalized.match(/^\/hrm\/[^/]+/)?.[0] ?? '/hrm'
    return asPermissionList(ROUTE_PERMISSIONS[hrmRoute] ?? ROUTE_PERMISSIONS['/hrm'])
  }
  if (normalized.startsWith('/admin/')) {
    const adminRoute = normalized.match(/^\/admin\/[^/]+/)?.[0] ?? '/admin/users'
    const value = ROUTE_PERMISSIONS[adminRoute]
    if (!value) return ['users.manage']
    return asPermissionList(value)
  }
  if (normalized.startsWith('/crm/reports/employees')) {
    return ['crm.access_all_leads']
  }
  if (normalized.startsWith('/crm/reports/owners')) {
    return ['crm.access_all_leads']
  }
  if (normalized.startsWith('/crm/')) {
    const crmRoute = normalized.match(/^\/crm\/[^/]+/)?.[0] ?? '/crm'
    const value = ROUTE_PERMISSIONS[crmRoute] ?? ROUTE_PERMISSIONS['/crm']
    if (!value) return ['crm.access_own_leads']
    return asPermissionList(value)
  }

  return null
}

export function userCanAccessByPermissions(
  userPermissions: string[] | undefined,
  required: string[] | null,
): boolean | null {
  if (!required?.length) return null
  if (!userPermissions?.length) return null
  return required.some((permission) => userPermissions.includes(permission))
}
