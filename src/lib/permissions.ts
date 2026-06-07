import type { AuthUser, DemoRole } from '../api/types'

export interface NavItem {
  to: string
  icon: string
  label: string
  end?: boolean
  roles: DemoRole[]
}

export const navItems: NavItem[] = [
  { to: '/', icon: 'dashboard', label: 'لوحة التحكم', end: true, roles: ['admin', 'sales', 'reviewer', 'collector'] },
  { to: '/departments', icon: 'corporate_fare', label: 'الإدارات', roles: ['admin'] },
  { to: '/branches', icon: 'store', label: 'الفروع', roles: ['admin'] },
  { to: '/inventory', icon: 'inventory_2', label: 'مخزون GPS', roles: ['admin', 'sales'] },
  { to: '/pos', icon: 'point_of_sale', label: 'نقطة البيع', roles: ['admin', 'sales'] },
  { to: '/invoices/review', icon: 'fact_check', label: 'مراجعة الفواتير', roles: ['admin', 'reviewer'] },
  { to: '/invoices', icon: 'receipt_long', label: 'الفواتير', roles: ['admin'] },
  { to: '/installments', icon: 'payments', label: 'تحصيل الأقساط', roles: ['admin', 'collector'] },
  { to: '/customers', icon: 'group', label: 'العملاء', roles: ['admin', 'sales', 'collector'] },
]

const routeRoles: Record<string, DemoRole[]> = {
  '/': ['admin', 'sales', 'reviewer', 'collector'],
  '/departments': ['admin'],
  '/branches': ['admin'],
  '/inventory': ['admin', 'sales'],
  '/pos': ['admin', 'sales'],
  '/invoices/review': ['admin', 'reviewer'],
  '/invoices': ['admin'],
  '/installments': ['admin', 'collector'],
  '/customers': ['admin', 'sales', 'collector'],
}

export function getUserRole(user: AuthUser | null): DemoRole {
  if (!user) return 'sales'
  if (user.demo_role) return user.demo_role
  const roleName = user.roles?.[0]?.name?.toLowerCase() ?? ''
  if (roleName.includes('admin')) return 'admin'
  if (roleName.includes('collector')) return 'collector'
  if (roleName.includes('review')) return 'reviewer'
  return 'sales'
}

export function canAccessRoute(path: string, user: AuthUser | null): boolean {
  const role = getUserRole(user)
  const normalized = path.replace(/\/$/, '') || '/'

  if (normalized.startsWith('/customers/')) {
    return routeRoles['/customers']?.includes(role) ?? false
  }

  const allowed = routeRoles[normalized]
  if (!allowed) return true
  return allowed.includes(role)
}

export function getNavForUser(user: AuthUser | null): NavItem[] {
  const role = getUserRole(user)
  return navItems.filter((item) => item.roles.includes(role))
}

export function getDefaultRoute(user: AuthUser | null): string {
  const role = getUserRole(user)
  if (role === 'reviewer') return '/invoices/review'
  if (role === 'collector') return '/installments'
  return '/'
}

export function getRoleLabel(user: AuthUser | null): string {
  const role = getUserRole(user)
  const labels: Record<DemoRole, string> = {
    admin: 'مدير النظام',
    sales: 'قسم المبيعات',
    reviewer: 'قسم المراجعة',
    collector: 'قسم التحصيل',
  }
  return labels[role]
}
