import type { AuthUser, DemoRole } from '../api/types'
import { canAccessDepartment, getUserRole, userHasPermission } from './access'

export { getUserRole } from './access'

export interface NavItem {
  to: string
  icon: string
  label: string
  end?: boolean
  roles: DemoRole[]
  /** Dynamic path for department admin (e.g. /departments/:id) */
  dynamicTo?: (user: AuthUser) => string | null
}

export interface NavGroup {
  id: string
  label: string
  icon: string
  items: NavItem[]
}

export type NavEntry =
  | { type: 'item'; item: NavItem }
  | { type: 'group'; group: NavGroup }

export const navEntries: NavEntry[] = [
  {
    type: 'item',
    item: {
      to: '/',
      icon: 'dashboard',
      label: 'لوحة التحكم',
      end: true,
      roles: ['super_admin', 'admin', 'sales', 'reviewer', 'collector'],
    },
  },
  {
    type: 'group',
    group: {
      id: 'system',
      label: 'إدارة النظام',
      icon: 'admin_panel_settings',
      items: [
        { to: '/admin/users', icon: 'manage_accounts', label: 'المستخدمون', end: true, roles: ['super_admin'] },
        { to: '/admin/roles', icon: 'admin_panel_settings', label: 'الأدوار', roles: ['super_admin'] },
        { to: '/admin/activity-log', icon: 'history', label: 'سجل التدقيق', roles: ['super_admin'] },
        { to: '/admin/settings', icon: 'settings', label: 'إعدادات النظام', roles: ['super_admin'] },
        { to: '/departments', icon: 'corporate_fare', label: 'الإدارات', roles: ['super_admin'] },
        {
          to: '/departments',
          icon: 'corporate_fare',
          label: 'إدارتي',
          roles: ['admin'],
          dynamicTo: (user) => (user.department_id ? `/departments/${user.department_id}` : null),
        },
        { to: '/branches', icon: 'store', label: 'الفروع', roles: ['super_admin', 'admin'] },
        { to: '/gps/management', icon: 'router', label: 'إدارة GPS المركزية', roles: ['super_admin'] },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'sales',
      label: 'المبيعات',
      icon: 'point_of_sale',
      items: [
        { to: '/inventory', icon: 'inventory_2', label: 'مخزون GPS', roles: ['super_admin', 'admin', 'sales'] },
        { to: '/invoices/review', icon: 'fact_check', label: 'مراجعة الفواتير', roles: ['super_admin', 'reviewer'] },
        { to: '/invoices', icon: 'receipt_long', label: 'الفواتير', roles: ['super_admin'] },
        { to: '/installments', icon: 'payments', label: 'تحصيل الأقساط', roles: ['super_admin', 'collector'] },
        { to: '/customers', icon: 'group', label: 'العملاء', roles: ['super_admin', 'admin', 'sales', 'collector'] },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'accounting',
      label: 'المحاسبة',
      icon: 'account_balance',
      items: [
        { to: '/accounting', icon: 'dashboard', label: 'نظرة عامة', end: true, roles: ['super_admin', 'accountant'] },
        { to: '/accounting/chart-of-accounts', icon: 'list_alt', label: 'دليل الحسابات', roles: ['super_admin', 'accountant'] },
        { to: '/accounting/journal-entries', icon: 'edit_note', label: 'قيود اليومية', roles: ['super_admin', 'accountant'] },
        { to: '/accounting/transfers', icon: 'swap_horiz', label: 'التحويلات', roles: ['super_admin', 'accountant'] },
        { to: '/accounting/transactions', icon: 'link', label: 'ربط المبيعات', roles: ['super_admin', 'accountant'] },
        { to: '/accounting/reports', icon: 'assessment', label: 'التقارير', roles: ['super_admin', 'accountant'] },
        { to: '/accounting/budgets', icon: 'savings', label: 'الميزانيات', roles: ['super_admin', 'accountant'] },
        { to: '/accounting/settings', icon: 'settings', label: 'الإعدادات', roles: ['super_admin', 'accountant'] },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'hrm',
      label: 'الموارد البشرية',
      icon: 'groups',
      items: [
        { to: '/hrm', icon: 'dashboard', label: 'نظرة عامة', end: true, roles: ['super_admin', 'hr_manager'] },
        { to: '/hrm/employees', icon: 'badge', label: 'الموظفون', roles: ['super_admin', 'hr_manager'] },
        { to: '/hrm/attendance', icon: 'schedule', label: 'الحضور', roles: ['super_admin', 'hr_manager'] },
        { to: '/hrm/leaves', icon: 'event_busy', label: 'الإجازات', roles: ['super_admin', 'hr_manager'] },
        { to: '/hrm/leave-types', icon: 'category', label: 'أنواع الإجازة', roles: ['super_admin', 'hr_manager'] },
        { to: '/hrm/shifts', icon: 'calendar_month', label: 'الورديات', roles: ['super_admin', 'hr_manager'] },
        { to: '/hrm/holidays', icon: 'celebration', label: 'العطلات', roles: ['super_admin', 'hr_manager'] },
        { to: '/hrm/allowances', icon: 'payments', label: 'البدلات', roles: ['super_admin', 'hr_manager'] },
        { to: '/hrm/payroll', icon: 'account_balance_wallet', label: 'الرواتب', roles: ['super_admin', 'hr_manager'] },
        { to: '/hrm/payroll-groups', icon: 'folder_shared', label: 'مسيرات الرواتب', roles: ['super_admin', 'hr_manager'] },
        { to: '/hrm/settings', icon: 'settings', label: 'الإعدادات', roles: ['super_admin', 'hr_manager'] },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'crm',
      label: 'علاقات العملاء',
      icon: 'hub',
      items: [
        { to: '/crm', icon: 'hub', label: 'خط الأنابيب', end: true, roles: ['super_admin', 'admin', 'crm'] },
        { to: '/crm/follow-ups', icon: 'event', label: 'المتابعات', roles: ['super_admin', 'admin', 'crm'] },
        { to: '/crm/activities', icon: 'task', label: 'الأنشطة', roles: ['super_admin', 'admin', 'crm'] },
        { to: '/crm/call-logs', icon: 'call', label: 'سجل المكالمات', roles: ['super_admin', 'admin', 'crm'] },
        { to: '/crm/campaigns', icon: 'campaign', label: 'الحملات', roles: ['super_admin', 'admin', 'crm'] },
        { to: '/crm/proposals', icon: 'description', label: 'العروض', roles: ['super_admin', 'admin', 'crm'] },
        { to: '/crm/order-requests', icon: 'shopping_cart', label: 'طلبات العملاء', roles: ['super_admin', 'admin', 'crm'] },
        { to: '/crm/marketplace', icon: 'extension', label: 'التكاملات', roles: ['super_admin', 'admin', 'crm'] },
        { to: '/crm/reports', icon: 'analytics', label: 'التقارير', roles: ['super_admin', 'admin', 'crm'] },
        { to: '/crm/settings', icon: 'settings', label: 'الإعدادات', roles: ['super_admin', 'admin', 'crm'] },
      ],
    },
  },
]

const routeRoles: Record<string, DemoRole[]> = {
  '/': ['super_admin', 'admin', 'sales', 'reviewer', 'collector'],
  '/departments': ['super_admin'],
  '/branches': ['super_admin', 'admin'],
  '/gps/management': ['super_admin'],
  '/inventory': ['super_admin', 'admin', 'sales'],
  '/pos': ['super_admin', 'admin', 'sales'],
  '/invoices/review': ['super_admin', 'reviewer'],
  '/invoices': ['super_admin'],
  '/installments': ['super_admin', 'collector'],
  '/customers': ['super_admin', 'admin', 'sales', 'collector'],
  '/accounting': ['super_admin', 'accountant'],
  '/accounting/chart-of-accounts': ['super_admin', 'accountant'],
  '/accounting/journal-entries': ['super_admin', 'accountant'],
  '/accounting/transfers': ['super_admin', 'accountant'],
  '/accounting/transactions': ['super_admin', 'accountant'],
  '/accounting/reports': ['super_admin', 'accountant'],
  '/accounting/budgets': ['super_admin', 'accountant'],
  '/accounting/settings': ['super_admin', 'accountant'],
  '/hrm': ['super_admin', 'hr_manager'],
  '/hrm/attendance': ['super_admin', 'hr_manager'],
  '/hrm/leaves': ['super_admin', 'hr_manager'],
  '/hrm/leave-types': ['super_admin', 'hr_manager'],
  '/hrm/employees': ['super_admin', 'hr_manager'],
  '/hrm/allowances': ['super_admin', 'hr_manager'],
  '/hrm/payroll-groups': ['super_admin', 'hr_manager'],
  '/hrm/shifts': ['super_admin', 'hr_manager'],
  '/hrm/payroll': ['super_admin', 'hr_manager'],
  '/hrm/holidays': ['super_admin', 'hr_manager'],
  '/hrm/settings': ['super_admin', 'hr_manager'],
  '/admin/users': ['super_admin'],
  '/admin/roles': ['super_admin'],
  '/admin/activity-log': ['super_admin'],
  '/admin/settings': ['super_admin'],
  '/crm': ['super_admin', 'admin', 'crm'],
  '/crm/follow-ups': ['super_admin', 'admin', 'crm'],
  '/crm/activities': ['super_admin', 'admin', 'crm'],
  '/crm/call-logs': ['super_admin', 'admin', 'crm'],
  '/crm/campaigns': ['super_admin', 'admin', 'crm'],
  '/crm/proposals': ['super_admin', 'admin', 'crm'],
  '/crm/order-requests': ['super_admin', 'admin', 'crm'],
  '/crm/marketplace': ['super_admin', 'admin', 'crm'],
  '/crm/reports': ['super_admin', 'admin', 'crm'],
  '/crm/settings': ['super_admin', 'admin', 'crm'],
}

function canSeeNavItem(item: NavItem, user: AuthUser | null): boolean {
  const role = getUserRole(user)
  if (item.roles.includes(role)) return true
  if (item.to.startsWith('/accounting') && userHasPermission(user, 'accounting.access_accounting_module')) {
    return true
  }
  if (item.to.startsWith('/hrm') && userHasPermission(user, 'hr.employees.manage')) {
    return true
  }
  if (item.to.startsWith('/admin') && userHasPermission(user, 'users.manage')) {
    return true
  }
  return false
}

function resolveNavItem(item: NavItem, user: AuthUser | null): NavItem | null {
  if (!canSeeNavItem(item, user)) return null
  if (item.dynamicTo && user) {
    const resolved = item.dynamicTo(user)
    if (!resolved) return null
    return { ...item, to: resolved }
  }
  return item
}

export function canAccessRoute(path: string, user: AuthUser | null): boolean {
  const role = getUserRole(user)
  const normalized = path.replace(/\/$/, '') || '/'

  if (normalized.startsWith('/customers/')) {
    return routeRoles['/customers']?.includes(role) ?? false
  }

  const deptDetailMatch = normalized.match(/^\/departments\/(\d+)$/)
  if (deptDetailMatch) {
    if (!['super_admin', 'admin'].includes(role)) return false
    return canAccessDepartment(user, Number(deptDetailMatch[1]))
  }

  const branchDetailMatch = normalized.match(/^\/branches\/(\d+)$/)
  if (branchDetailMatch) {
    if (!['super_admin', 'admin'].includes(role)) return false
    return routeRoles['/branches']?.includes(role) ?? false
  }

  if (normalized.startsWith('/accounting')) {
    const allowed = routeRoles[normalized] ?? routeRoles['/accounting']
    if (allowed?.includes(role)) return true
    return userHasPermission(user, 'accounting.access_accounting_module')
  }

  if (normalized.startsWith('/hrm')) {
    const hrmRoute = normalized === '/hrm' ? '/hrm' : (normalized.match(/^\/hrm\/[^/]+/)?.[0] ?? '/hrm')
    const allowed = routeRoles[hrmRoute] ?? routeRoles['/hrm']
    if (allowed?.includes(role)) return true
    return userHasPermission(user, 'hr.employees.manage')
  }

  if (normalized.startsWith('/admin')) {
    const adminRoute = normalized === '/admin/users' ? '/admin/users' : (normalized.match(/^\/admin\/[^/]+/)?.[0] ?? '/admin/users')
    const allowed = routeRoles[adminRoute] ?? routeRoles['/admin/users']
    if (allowed?.includes(role)) return true
    return userHasPermission(user, 'users.manage')
  }

  if (normalized.startsWith('/crm')) {
    const crmRoute = normalized === '/crm' ? '/crm' : (normalized.match(/^\/crm\/[^/]+/)?.[0] ?? '/crm')
    const allowed = routeRoles[crmRoute] ?? routeRoles['/crm']
    return allowed?.includes(role) ?? false
  }

  const allowed = routeRoles[normalized]
  if (!allowed) return true
  return allowed.includes(role)
}

export function getNavEntriesForUser(user: AuthUser | null): NavEntry[] {
  return navEntries
    .map((entry) => {
      if (entry.type === 'item') {
        const resolved = resolveNavItem(entry.item, user)
        return resolved ? { type: 'item' as const, item: resolved } : null
      }

      const items = entry.group.items
        .map((item) => resolveNavItem(item, user))
        .filter((item): item is NavItem => item != null)

      if (items.length === 0) return null

      return {
        type: 'group' as const,
        group: { ...entry.group, items },
      }
    })
    .filter((entry): entry is NavEntry => entry != null)
}

export function getDefaultRoute(user: AuthUser | null): string {
  const role = getUserRole(user)
  if (role === 'reviewer') return '/invoices/review'
  if (role === 'collector') return '/installments'
  if (role === 'crm') return '/crm'
  if (role === 'hr_manager') return '/hrm'
  if (role === 'accountant') return '/accounting'
  if (role === 'admin' && user?.department_id) return `/departments/${user.department_id}`
  return '/'
}

export function getRoleLabel(user: AuthUser | null): string {
  const role = getUserRole(user)
  const labels: Record<DemoRole, string> = {
    super_admin: 'مدير النظام الأعلى',
    admin: 'مدير الإدارة',
    sales: 'قسم المبيعات',
    reviewer: 'قسم المراجعة',
    collector: 'قسم التحصيل',
    crm: 'قسم علاقات العملاء',
    accountant: 'قسم المحاسبة',
    hr_manager: 'مدير الموارد البشرية',
  }
  return labels[role]
}

export function resolveNavPath(item: NavItem, user: AuthUser | null): string {
  if (item.dynamicTo && user) {
    return item.dynamicTo(user) ?? item.to
  }
  return item.to
}

export function isNavItemActive(item: NavItem, pathname: string, user: AuthUser | null): boolean {
  const target = resolveNavPath(item, user)
  const normalized = pathname.replace(/\/$/, '') || '/'

  if (item.to === '/branches' || target === '/branches') {
    return normalized === '/branches' || /^\/branches\/\d+$/.test(normalized)
  }

  if (item.to === '/hrm' || target === '/hrm') {
    return normalized === '/hrm'
  }

  if (target.startsWith('/hrm/')) {
    return normalized === target
  }

  if (target.startsWith('/admin/')) {
    return normalized === target
  }

  if (item.to === '/crm' || target === '/crm') {
    return normalized === '/crm'
  }

  if (target.startsWith('/crm/')) {
    return normalized === target
  }

  if (item.to === '/accounting' || target === '/accounting') {
    return normalized === '/accounting'
  }

  if (target.startsWith('/accounting/')) {
    return normalized === target
  }

  if (target.startsWith('/departments/')) {
    return normalized === target
  }

  if (item.end) return normalized === target
  return normalized === target || normalized.startsWith(`${target}/`)
}

export function isNavGroupActive(group: NavGroup, pathname: string, user: AuthUser | null): boolean {
  return group.items.some((item) => isNavItemActive(item, pathname, user))
}
