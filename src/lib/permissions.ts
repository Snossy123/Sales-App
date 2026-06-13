import type { AuthUser, DemoRole } from '../api/types'
import { canAccessDepartment, getUserRole } from './access'

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

export const navItems: NavItem[] = [
  { to: '/', icon: 'dashboard', label: 'لوحة التحكم', end: true, roles: ['super_admin', 'admin', 'sales', 'reviewer', 'collector'] },
  { to: '/admin/users', icon: 'manage_accounts', label: 'إدارة النظام', end: true, roles: ['super_admin'] },
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
  { to: '/inventory', icon: 'inventory_2', label: 'مخزون GPS', roles: ['super_admin', 'admin', 'sales'] },
  { to: '/pos', icon: 'point_of_sale', label: 'نقطة البيع', roles: ['super_admin', 'admin', 'sales'] },
  { to: '/invoices/review', icon: 'fact_check', label: 'مراجعة الفواتير', roles: ['super_admin', 'reviewer'] },
  { to: '/invoices', icon: 'receipt_long', label: 'الفواتير', roles: ['super_admin'] },
  { to: '/installments', icon: 'payments', label: 'تحصيل الأقساط', roles: ['super_admin', 'collector'] },
  { to: '/customers', icon: 'group', label: 'العملاء', roles: ['super_admin', 'admin', 'sales', 'collector'] },
  { to: '/accounting', icon: 'account_balance', label: 'المحاسبة', roles: ['super_admin', 'accountant'] },
  { to: '/accounting/chart-of-accounts', icon: 'list_alt', label: 'دليل الحسابات', roles: ['accountant'] },
  { to: '/accounting/journal-entries', icon: 'edit_note', label: 'قيود اليومية', roles: ['accountant'] },
  { to: '/accounting/transfers', icon: 'swap_horiz', label: 'التحويلات', roles: ['accountant'] },
  { to: '/accounting/transactions', icon: 'link', label: 'ربط المبيعات', roles: ['accountant'] },
  { to: '/accounting/reports', icon: 'assessment', label: 'التقارير', roles: ['accountant'] },
  { to: '/accounting/budgets', icon: 'savings', label: 'الميزانيات', roles: ['accountant'] },
  { to: '/accounting/settings', icon: 'settings', label: 'إعدادات المحاسبة', roles: ['accountant'] },
  { to: '/hrm', icon: 'groups', label: 'الموارد البشرية', end: true, roles: ['super_admin', 'hr_manager'] },
  { to: '/hrm/attendance', icon: 'schedule', label: 'الحضور', roles: ['super_admin', 'hr_manager'] },
  { to: '/hrm/leaves', icon: 'event_busy', label: 'الإجازات', roles: ['super_admin', 'hr_manager'] },
  { to: '/hrm/shifts', icon: 'calendar_month', label: 'الورديات', roles: ['super_admin', 'hr_manager'] },
  { to: '/hrm/payroll', icon: 'payments', label: 'الرواتب', roles: ['super_admin', 'hr_manager'] },
  { to: '/hrm/holidays', icon: 'celebration', label: 'العطلات', roles: ['super_admin', 'hr_manager'] },
  { to: '/hrm/settings', icon: 'settings', label: 'إعدادات HR', roles: ['super_admin', 'hr_manager'] },
  { to: '/crm', icon: 'hub', label: 'خط الأنابيب', end: true, roles: ['super_admin', 'admin', 'crm'] },
  { to: '/crm/follow-ups', icon: 'event', label: 'المتابعات', roles: ['super_admin', 'admin', 'crm'] },
  { to: '/crm/campaigns', icon: 'campaign', label: 'الحملات', roles: ['super_admin', 'admin', 'crm'] },
  { to: '/crm/proposals', icon: 'description', label: 'العروض', roles: ['super_admin', 'admin', 'crm'] },
  { to: '/crm/reports', icon: 'analytics', label: 'تقارير CRM', roles: ['super_admin', 'admin', 'crm'] },
  { to: '/crm/settings', icon: 'settings', label: 'إعدادات CRM', roles: ['super_admin', 'admin', 'crm'] },
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
  '/crm/campaigns': ['super_admin', 'admin', 'crm'],
  '/crm/proposals': ['super_admin', 'admin', 'crm'],
  '/crm/reports': ['super_admin', 'admin', 'crm'],
  '/crm/settings': ['super_admin', 'admin', 'crm'],
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
    // Branch ownership verified in page via API; allow route if role matches
    return routeRoles['/branches']?.includes(role) ?? false
  }

  if (normalized.startsWith('/accounting')) {
    const allowed = routeRoles[normalized] ?? routeRoles['/accounting']
    return allowed?.includes(role) ?? false
  }

  if (normalized.startsWith('/hrm')) {
    const hrmRoute = normalized === '/hrm' ? '/hrm' : (normalized.match(/^\/hrm\/[^/]+/)?.[0] ?? '/hrm')
    const allowed = routeRoles[hrmRoute] ?? routeRoles['/hrm']
    return allowed?.includes(role) ?? false
  }

  if (normalized.startsWith('/admin')) {
    const adminRoute = normalized === '/admin/users' ? '/admin/users' : (normalized.match(/^\/admin\/[^/]+/)?.[0] ?? '/admin/users')
    const allowed = routeRoles[adminRoute] ?? routeRoles['/admin/users']
    return allowed?.includes(role) ?? false
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

export function getNavForUser(user: AuthUser | null): NavItem[] {
  const role = getUserRole(user)
  return navItems
    .filter((item) => item.roles.includes(role))
    .map((item) => {
      if (item.dynamicTo && user) {
        const resolved = item.dynamicTo(user)
        if (!resolved) return null
        return { ...item, to: resolved }
      }
      return item
    })
    .filter((item): item is NavItem => item != null)
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
    return normalized === '/hrm' || normalized.startsWith('/hrm/')
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
