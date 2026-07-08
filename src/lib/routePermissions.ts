/** Maps app routes to required permission keys (any one match grants access). */
export const ROUTE_PERMISSIONS: Record<string, string | string[]> = {
  '/': 'dashboard.view',
  '/pos': 'sales.pos',
  '/pos/services': 'sales.pos',
  '/pricing/catalog': 'sales.pos',
  '/pricing/promotions': 'sales.pos',
  '/sales/accessories': 'sales.pos',
  '/sales/maintenance': 'sales.pos',
  '/inventory': 'inventory.manage',
  '/inventory/branch': 'inventory.manage',
  '/inventory/movements': 'device_movements.manage',
  '/inventory/add': 'inventory.manage',
  '/inventory/transfers': 'stock.transfer',
  '/inventory/returns': 'stock.transfer',
  '/inventory/warehouses': 'warehouses.manage',
  '/inventory/settings': 'inventory.manage',
  '/customers': 'customers.manage',
  '/customers/add': 'customers.manage',
  '/distributors': 'customers.manage',
  '/distributors/add': 'customers.manage',
  '/services': 'settings.manage',
  '/services/add': 'settings.manage',
  '/contract-templates': 'settings.manage',
  '/invoices/review': ['review.view_queue', 'review.view_detail'],
  '/review/collections': 'review.view_collections',
  '/review/expenses': 'review.view_expenses',
  '/expenses/new': 'expenses.submit',
  '/invoices': 'review.view_contracts',
  '/review/evaluation-queue': 'review.view_evaluation_queue',
  '/review/subscription-renewals': 'review.view_subscription_renewals',
  '/review/evaluation-questions': 'review.manage_evaluation_questions',
  '/installments': 'installments.view',
  '/payments': 'payments.view',
  '/call-center/collections': 'external_collections.collect',
  '/admin/collection-accounts': 'collection_accounts.manage',
  '/daily-reports': 'dashboard.view',
  '/departments': 'branches.manage',
  '/branches': 'branches.manage',
  '/sections': 'branches.manage',
  '/gps/management': 'branches.manage',
  '/admin/users': 'users.manage',
  '/admin/roles': 'users.manage',
  '/admin/activity-log': 'audit.view',
  '/admin/trash': 'trash.view',
  '/admin/faq': 'faq.manage',
  '/admin/settings': 'settings.manage',
  '/help/faq': 'dashboard.view',
  '/messages': 'dashboard.view',
  '/feedback': 'dashboard.view',
  '/crm': 'crm.access_own_leads',
  '/crm/referrals': 'crm.access_own_leads',
  '/crm/referrals/follow-ups': 'crm.access_own_schedule',
  '/crm/referrals/add': 'crm.access_own_leads',
  '/crm/follow-ups': 'crm.access_own_schedule',
  '/crm/activities': 'crm.activities.manage',
  '/crm/call-logs': 'crm.view_own_call_log',
  '/crm/campaigns': 'crm.access_own_campaigns',
  '/crm/proposals': 'crm.access_proposal',
  '/crm/order-requests': 'crm.access_own_leads',
  '/crm/marketplace': 'crm.access_b2b_marketplace',
  '/crm/reports': 'crm.access_all_leads',
  '/crm/settings': 'crm.leads.manage',
  '/support/my-tasks': 'support.view_assigned_tasks',
  '/support/tasks': ['support.view_all_tasks', 'support.assign_tasks'],
  '/accounting': 'accounting.access_accounting_module',
  '/hrm': 'hr.employees.manage',
}

export function resolveRoutePermissions(path: string): string[] | null {
  const normalized = path.replace(/\/$/, '') || '/'

  if (ROUTE_PERMISSIONS[normalized]) {
    const value = ROUTE_PERMISSIONS[normalized]
    return Array.isArray(value) ? value : [value]
  }

  if (normalized.startsWith('/customers/')) return ['customers.manage']
  if (normalized.startsWith('/distributors/')) return ['customers.manage']
  if (normalized.startsWith('/services/')) return ['settings.manage']
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
  if (normalized.startsWith('/accounting/')) return ['accounting.access_accounting_module']
  if (normalized.startsWith('/hrm/')) return ['hr.employees.manage']
  if (normalized.startsWith('/admin/')) {
    const adminRoute = normalized.match(/^\/admin\/[^/]+/)?.[0] ?? '/admin/users'
    const value = ROUTE_PERMISSIONS[adminRoute]
    if (!value) return ['users.manage']
    return Array.isArray(value) ? value : [value]
  }
  if (normalized.startsWith('/crm/')) {
    const crmRoute = normalized.match(/^\/crm\/[^/]+/)?.[0] ?? '/crm'
    const value = ROUTE_PERMISSIONS[crmRoute] ?? ROUTE_PERMISSIONS['/crm']
    if (!value) return ['crm.access_own_leads']
    return Array.isArray(value) ? value : [value]
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
