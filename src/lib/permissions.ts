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

  if (target.startsWith('/departments/')) {
    return normalized === target
  }

  if (item.end) return normalized === target
  return normalized === target || normalized.startsWith(`${target}/`)
}
