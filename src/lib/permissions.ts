import type { AuthUser, DemoRole } from '../api/types'
import { canAccessDepartment, getUserRole, isSuperAdmin, userHasPermission } from './access'
import { buildActiveCrmNavItems, CRM_DEFAULT_ROUTE, isSuspendedCrmRoute } from '../modules/crm/lib/crmNavCatalog'
import { userHasReviewAccess } from './permissionChecks'
import { resolveRoutePermissions, userCanAccessByPermissions } from './routePermissions'
import { formatUserRolesLabel } from './roleCatalog'

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
      id: 'management',
      label: 'الإدارة',
      icon: 'corporate_fare',
      items: [
        { to: '/departments', icon: 'corporate_fare', label: 'الإدارات', end: true, roles: ['super_admin'] },
        { to: '/branches', icon: 'store', label: 'كل الفروع', roles: ['super_admin'] },
        { to: '/sections', icon: 'account_tree', label: 'الأقسام', roles: ['super_admin'] },
        { to: '/gps/management', icon: 'dashboard', label: 'لوحة الإدارة', roles: ['admin'] },
        { to: '/branches', icon: 'store', label: 'فروع الإدارة', roles: ['admin'] },
        { to: '/sections', icon: 'account_tree', label: 'الأقسام', roles: ['admin'] },
        { to: '/daily-reports', icon: 'summarize', label: 'البيان اليومي', roles: ['super_admin', 'admin', 'sales', 'reviewer', 'collector'] },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'contracts',
      label: 'قسم التعاقدات',
      icon: 'edit_document',
      items: [
        { to: '/pos', icon: 'edit_document', label: 'تعاقد جديد', end: true, roles: ['super_admin', 'admin', 'sales'] },
        { to: '/pos/services', icon: 'home_repair_service', label: 'تعاقد خدمات', roles: ['super_admin', 'admin', 'sales'] },
        { to: '/sales/accessories', icon: 'headphones', label: 'بيع إكسسوارات', roles: ['super_admin', 'admin', 'sales'] },
        { to: '/pricing/catalog', icon: 'sell', label: 'دليل الأسعار', roles: ['super_admin', 'admin', 'sales'] },
        { to: '/pricing/promotions', icon: 'local_offer', label: 'العروض', roles: ['super_admin', 'admin', 'sales'] },
        { to: '/review/subscription-renewals', icon: 'autorenew', label: 'تجديد الاشتراكات', roles: ['super_admin', 'admin', 'reviewer'] },
        { to: '/expenses/new', icon: 'add_card', label: 'طلب مصروف', roles: ['super_admin', 'admin'] },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'collection',
      label: 'قسم الاقساط',
      icon: 'payments',
      items: [
        { to: '/installments', icon: 'payments', label: 'تحصيل الأقساط', end: true, roles: ['super_admin', 'admin', 'collector'] },
        { to: '/payments', icon: 'receipt', label: 'سجل المدفوعات', roles: ['super_admin', 'admin', 'collector'] },
        { to: '/call-center/collections', icon: 'phone_in_talk', label: 'التحصيلات الخارجية', roles: ['super_admin', 'admin', 'call_center'] },
        { to: '/admin/collection-accounts', icon: 'account_balance', label: 'حسابات التحويل', roles: ['super_admin', 'admin'] },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'crm',
      label: 'المبيعات',
      icon: 'hub',
      items: buildActiveCrmNavItems(),
    },
  },
  {
    type: 'item',
    item: {
      to: '/customers',
      icon: 'group',
      label: 'العملاء',
      end: true,
      roles: ['super_admin', 'admin', 'sales', 'collector'],
    },
  },
  {
    type: 'item',
    item: {
      to: '/distributors',
      icon: 'local_shipping',
      label: 'الموزعين',
      end: true,
      roles: ['super_admin', 'admin', 'sales', 'collector'],
    },
  },
  {
    type: 'group',
    group: {
      id: 'review',
      label: 'المراجعة',
      icon: 'fact_check',
      items: [
        { to: '/invoices/review', icon: 'fact_check', label: 'مراجعة التعاقدات', end: true, roles: ['super_admin', 'admin', 'reviewer'] },
        { to: '/review/collections', icon: 'payments', label: 'مراجعة التحصيلات', roles: ['super_admin', 'admin', 'reviewer'] },
        { to: '/review/expenses', icon: 'receipt', label: 'مراجعة المصروفات', roles: ['super_admin', 'admin', 'reviewer'] },
        { to: '/invoices', icon: 'receipt_long', label: 'كل التعاقدات', roles: ['super_admin', 'admin', 'reviewer'] },
        { to: '/review/evaluation-queue', icon: 'rate_review', label: 'تقييم العملاء', roles: ['super_admin', 'admin', 'reviewer'] },
        { to: '/review/evaluation-questions', icon: 'quiz', label: 'أسئلة التقييم', roles: ['super_admin', 'admin', 'reviewer'] },
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
        { to: '/hrm', icon: 'dashboard', label: 'نظرة عامة', end: true, roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/employees', icon: 'badge', label: 'الموظفون', roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/sales-targets', icon: 'track_changes', label: 'أهداف المبيعات', roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/jobs', icon: 'work', label: 'الوظائف', roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/attendance', icon: 'schedule', label: 'الحضور', roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/zk-devices', icon: 'fingerprint', label: 'أجهزة البصمة', roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/leaves', icon: 'event_busy', label: 'الإجازات', roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/leave-types', icon: 'category', label: 'أنواع الإجازة', roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/shifts', icon: 'calendar_month', label: 'الورديات', roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/holidays', icon: 'celebration', label: 'العطلات', roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/allowances', icon: 'payments', label: 'البدلات', roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/payroll', icon: 'account_balance_wallet', label: 'الرواتب', roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/payroll-groups', icon: 'folder_shared', label: 'مسيرات الرواتب', roles: ['super_admin', 'admin', 'hr_manager'] },
        { to: '/hrm/settings', icon: 'settings', label: 'الإعدادات', roles: ['super_admin', 'admin', 'hr_manager'] },
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
        { to: '/accounting', icon: 'dashboard', label: 'نظرة عامة', end: true, roles: ['super_admin', 'admin', 'accountant'] },
        { to: '/accounting/chart-of-accounts', icon: 'list_alt', label: 'دليل الحسابات', roles: ['super_admin', 'admin', 'accountant'] },
        { to: '/accounting/journal-entries', icon: 'edit_note', label: 'قيود اليومية', roles: ['super_admin', 'admin', 'accountant'] },
        { to: '/accounting/transfers', icon: 'swap_horiz', label: 'التحويلات', roles: ['super_admin', 'admin', 'accountant'] },
        { to: '/accounting/transactions', icon: 'link', label: 'ربط المبيعات', roles: ['super_admin', 'admin', 'accountant'] },
        { to: '/accounting/reports', icon: 'assessment', label: 'التقارير', roles: ['super_admin', 'admin', 'accountant'] },
        { to: '/accounting/budgets', icon: 'savings', label: 'الميزانيات', roles: ['super_admin', 'admin', 'accountant'] },
        { to: '/accounting/settings', icon: 'settings', label: 'الإعدادات', roles: ['super_admin', 'admin', 'accountant'] },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'support',
      label: 'الدعم الفني',
      icon: 'support_agent',
      items: [
        { to: '/support/my-tasks', icon: 'assignment_ind', label: 'مهامي', end: true, roles: ['super_admin', 'admin', 'support'] },
        { to: '/support/tasks', icon: 'assignment', label: 'إدارة المهام', roles: ['super_admin', 'admin'] },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'inventory',
      label: 'المخزون',
      icon: 'inventory_2',
      items: [
        { to: '/inventory', icon: 'inventory_2', label: 'مخزون GPS', end: true, roles: ['super_admin', 'admin', 'sales'] },
        { to: '/inventory/branch', icon: 'inventory', label: 'مخزون الفرع', roles: ['super_admin', 'admin', 'sales'] },
        { to: '/inventory/movements', icon: 'swap_horiz', label: 'حركات الأجهزة', roles: ['super_admin', 'admin', 'sales'] },
        { to: '/inventory/add', icon: 'add_box', label: 'تسجيل مخزون', roles: ['super_admin', 'admin'] },
        { to: '/inventory/transfers', icon: 'local_shipping', label: 'توزيع المخزون', roles: ['super_admin', 'admin'] },
        { to: '/inventory/returns', icon: 'undo', label: 'استرجاع مخزون', roles: ['super_admin', 'admin'] },
        { to: '/inventory/warehouses', icon: 'warehouse', label: 'المخازن', roles: ['super_admin', 'admin'] },
        { to: '/inventory/accessories', icon: 'category', label: 'كتالوج الإكسسوارات', roles: ['super_admin', 'admin'] },
        { to: '/inventory/accessory-packages', icon: 'inventory', label: 'باكدجات الإكسسوارات', roles: ['super_admin', 'admin'] },
        { to: '/inventory/accessory-stock', icon: 'warehouse', label: 'مخزون الإكسسوارات', roles: ['super_admin', 'admin'] },
        { to: '/inventory/settings', icon: 'settings', label: 'إعدادات المنتج', roles: ['super_admin', 'admin'] },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'services',
      label: 'الخدمات',
      icon: 'home_repair_service',
      items: [
        { to: '/services', icon: 'home_repair_service', label: 'الخدمات', end: true, roles: ['super_admin', 'admin'] },
        { to: '/services/add', icon: 'add_circle', label: 'إضافة خدمة', roles: ['super_admin', 'admin'] },
        { to: '/contract-templates', icon: 'description', label: 'نماذج العقود', roles: ['super_admin', 'admin'] },
      ],
    },
  },
  {
    type: 'group',
    group: {
      id: 'system',
      label: 'الآعدادات',
      icon: 'admin_panel_settings',
      items: [
        { to: '/admin/users', icon: 'manage_accounts', label: 'المستخدمون', end: true, roles: ['super_admin', 'admin'] },
        { to: '/admin/roles', icon: 'admin_panel_settings', label: 'الأدوار', roles: ['super_admin', 'admin'] },
        { to: '/admin/activity-log', icon: 'history', label: 'سجل التدقيق', roles: ['super_admin', 'admin'] },
        { to: '/admin/trash', icon: 'delete', label: 'سلة المهملات', roles: ['super_admin', 'admin'] },
        { to: '/admin/faq', icon: 'quiz', label: 'إدارة الأسئلة', roles: ['super_admin', 'admin'] },
        { to: '/admin/settings', icon: 'settings', label: 'إعدادات النظام', roles: ['super_admin'] },
        { to: '/help/faq', icon: 'help', label: 'المساعدة', roles: ['super_admin', 'admin', 'sales', 'reviewer', 'collector', 'call_center', 'crm', 'accountant', 'hr_manager'] },
        { to: '/messages', icon: 'chat', label: 'الرسائل', roles: ['super_admin', 'admin', 'sales', 'reviewer', 'collector', 'call_center', 'crm', 'accountant', 'hr_manager'] },
        { to: '/feedback', icon: 'feedback', label: 'ملاحظات', roles: ['super_admin', 'admin', 'sales', 'reviewer', 'collector', 'call_center', 'crm', 'accountant', 'hr_manager'] },
      ],
    },
  },
]

const routeRoles: Record<string, DemoRole[]> = {
  '/': ['super_admin', 'admin', 'sales', 'reviewer', 'collector'],
  '/departments': ['super_admin'],
  '/branches': ['super_admin', 'admin'],
  '/sections': ['super_admin', 'admin'],
  '/gps/management': ['admin'],
  '/inventory': ['super_admin', 'admin', 'sales'],
  '/inventory/movements': ['super_admin', 'admin', 'sales'],
  '/inventory/add': ['super_admin', 'admin'],
  '/inventory/transfers': ['super_admin', 'admin'],
  '/inventory/returns': ['super_admin', 'admin'],
  '/inventory/warehouses': ['super_admin', 'admin'],
  '/inventory/settings': ['super_admin', 'admin'],
  '/inventory/accessories': ['super_admin', 'admin'],
  '/inventory/accessory-packages': ['super_admin', 'admin'],
  '/inventory/accessory-stock': ['super_admin', 'admin'],
  '/pos': ['super_admin', 'admin', 'sales'],
  '/pos/services': ['super_admin', 'admin', 'sales'],
  '/pricing/catalog': ['super_admin', 'admin', 'sales'],
  '/pricing/promotions': ['super_admin', 'admin', 'sales'],
  '/sales/accessories': ['super_admin', 'admin', 'sales'],
  '/sales/maintenance': ['super_admin', 'admin', 'sales'],
  '/services': ['super_admin', 'admin'],
  '/services/add': ['super_admin', 'admin'],
  '/contract-templates': ['super_admin', 'admin'],
  '/invoices': ['super_admin', 'admin', 'reviewer'],
  '/invoices/review': ['super_admin', 'admin', 'reviewer'],
  '/review/evaluation-queue': ['super_admin', 'admin', 'reviewer'],
  '/review/subscription-renewals': ['super_admin', 'admin', 'reviewer'],
  '/review/evaluation-questions': ['super_admin', 'admin', 'reviewer'],
  '/installments': ['super_admin', 'admin', 'collector'],
  '/payments': ['super_admin', 'admin', 'collector'],
  '/help/faq': ['super_admin', 'admin', 'sales', 'reviewer', 'collector', 'call_center', 'crm', 'accountant', 'hr_manager'],
  '/feedback': ['super_admin', 'admin', 'sales', 'reviewer', 'collector', 'call_center', 'crm', 'accountant', 'hr_manager'],
  '/admin/trash': ['super_admin', 'admin'],
  '/admin/faq': ['super_admin', 'admin'],
  '/call-center/collections': ['super_admin', 'admin', 'call_center'],
  '/admin/collection-accounts': ['super_admin', 'admin'],
  '/daily-reports': ['super_admin', 'admin', 'sales', 'reviewer', 'collector'],
  '/distributors': ['super_admin', 'admin', 'sales', 'collector'],
  '/distributors/add': ['super_admin', 'admin', 'sales'],
  '/customers': ['super_admin', 'admin', 'sales', 'collector'],
  '/customers/add': ['super_admin', 'admin', 'sales'],
  '/accounting': ['super_admin', 'admin', 'accountant'],
  '/accounting/chart-of-accounts': ['super_admin', 'admin', 'accountant'],
  '/accounting/journal-entries': ['super_admin', 'admin', 'accountant'],
  '/accounting/transfers': ['super_admin', 'admin', 'accountant'],
  '/accounting/transactions': ['super_admin', 'admin', 'accountant'],
  '/accounting/reports': ['super_admin', 'admin', 'accountant'],
  '/accounting/budgets': ['super_admin', 'admin', 'accountant'],
  '/accounting/settings': ['super_admin', 'admin', 'accountant'],
  '/hrm': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/attendance': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/zk-devices': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/leaves': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/leave-types': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/employees': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/sales-targets': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/jobs': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/allowances': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/payroll-groups': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/shifts': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/payroll': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/holidays': ['super_admin', 'admin', 'hr_manager'],
  '/hrm/settings': ['super_admin', 'admin', 'hr_manager'],
  '/admin/users': ['super_admin', 'admin'],
  '/admin/roles': ['super_admin', 'admin'],
  '/admin/activity-log': ['super_admin', 'admin'],
  '/admin/settings': ['super_admin'],
  '/crm/referrals': ['super_admin', 'admin', 'crm'],
  '/crm/referrals/follow-ups': ['super_admin', 'admin', 'crm'],
  '/crm/referrals/add': ['super_admin', 'admin', 'crm'],
  '/crm/referrals/network': ['super_admin', 'admin', 'crm'],
  '/crm/customers/add': ['super_admin', 'admin', 'crm'],
  '/crm/follow-ups': ['super_admin', 'admin', 'crm'],
  '/crm/activities': ['super_admin', 'admin', 'crm'],
  '/crm/call-logs': ['super_admin', 'admin', 'crm'],
  '/crm/campaigns': ['super_admin', 'admin', 'crm'],
  '/crm/proposals': ['super_admin', 'admin', 'crm'],
  '/crm/order-requests': ['super_admin', 'admin', 'crm'],
  '/crm/marketplace': ['super_admin', 'admin', 'crm'],
  '/crm/reports': ['super_admin', 'admin', 'crm'],
  '/crm/settings': ['super_admin', 'admin', 'crm'],
  '/support/my-tasks': ['super_admin', 'admin', 'support'],
  '/support/tasks': ['super_admin', 'admin'],
}

function canSeeNavItem(item: NavItem, user: AuthUser | null): boolean {
  if (!user) return false

  if (item.to === '/admin/settings') {
    return isSuperAdmin(user)
  }

  const role = getUserRole(user)
  const roleAllowed = item.roles.includes(role)

  if (!roleAllowed) {
    if (item.to.startsWith('/accounting') && userHasPermission(user, 'accounting.access_accounting_module')) {
      return true
    }
    if (item.to.startsWith('/hrm') && userHasPermission(user, 'hr.employees.manage')) {
      return true
    }
    if (item.to.startsWith('/admin') && userHasPermission(user, 'users.manage')) {
      return true
    }
    if (item.to === '/') {
      return userHasPermission(user, 'dashboard.view')
    }
    if (item.to === '/invoices/review') {
      return userHasPermission(user, 'review.view_queue') || userHasReviewAccess(user)
    }
    if (item.to === '/invoices') {
      return userHasPermission(user, 'review.view_contracts') || userHasReviewAccess(user)
    }
    if (item.to === '/review/evaluation-queue') {
      return userHasPermission(user, 'review.view_evaluation_queue') || userHasReviewAccess(user)
    }
    if (item.to === '/review/subscription-renewals') {
      return userHasPermission(user, 'review.view_subscription_renewals') || userHasReviewAccess(user)
    }
    if (item.to === '/review/evaluation-questions') {
      return userHasPermission(user, 'review.manage_evaluation_questions') || userHasReviewAccess(user)
    }
    if (item.to === '/support/my-tasks') {
      return userHasPermission(user, 'support.view_assigned_tasks')
    }
    if (item.to === '/support/tasks') {
      return userHasPermission(user, 'support.view_all_tasks') || userHasPermission(user, 'support.assign_tasks')
    }
    if (item.to === '/inventory/movements') {
      return userHasPermission(user, 'device_movements.manage') || userHasPermission(user, 'inventory.manage')
    }
    return false
  }

  // Admin / super_admin are already gated by item.roles. Their API permission
  // lists are often incomplete (e.g. Admin only has users/roles/settings),
  // so don't hide the rest of the sidebar behind that list.
  if (role === 'super_admin' || role === 'admin') return true

  const path = item.dynamicTo && user ? item.dynamicTo(user) ?? item.to : item.to
  const requiredPerms = resolveRoutePermissions(path)
  const permAccess = userCanAccessByPermissions(user.permissions, requiredPerms)
  if (permAccess !== null) return permAccess

  return true
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

  if (normalized === '/admin/settings') {
    return isSuperAdmin(user)
  }

  const deptDetailMatch = normalized.match(/^\/departments\/(\d+)$/)
  if (deptDetailMatch) {
    if (!isSuperAdmin(user)) return false
    return canAccessDepartment(user, Number(deptDetailMatch[1]))
  }

  const requiredPerms = resolveRoutePermissions(normalized)
  const permAccess = userCanAccessByPermissions(user?.permissions, requiredPerms)
  // Same as nav: admin roles are gated by routeRoles below, not a partial permission array.
  if (permAccess !== null && role !== 'super_admin' && role !== 'admin') return permAccess

  if (normalized === '/customers/add') {
    return routeRoles['/customers/add']?.includes(role) ?? false
  }

  if (normalized === '/distributors/add') {
    return routeRoles['/distributors/add']?.includes(role) ?? false
  }

  if (normalized.startsWith('/customers/')) {
    return routeRoles['/customers']?.includes(role) ?? false
  }

  if (normalized.startsWith('/distributors/')) {
    return routeRoles['/distributors']?.includes(role) ?? false
  }

  if (normalized.startsWith('/services/')) {
    return routeRoles['/services']?.includes(role) ?? false
  }

  if (normalized.startsWith('/contract-templates/')) {
    return routeRoles['/contract-templates']?.includes(role) ?? false
  }

  if (normalized.match(/^\/payments\/\d+\/receipt$/)) {
    return routeRoles['/payments']?.includes(role) ?? false
  }

  if (normalized.match(/^\/daily-reports\/\d+\/print$/)) {
    return routeRoles['/daily-reports']?.includes(role) ?? false
  }

  if (normalized.match(/^\/invoices\/\d+\/contract-print$/)) {
    if (
      routeRoles['/invoices']?.includes(role) ||
      routeRoles['/invoices/review']?.includes(role) ||
      routeRoles['/pos']?.includes(role)
    ) {
      return true
    }
    return userHasPermission(user, 'review.print') || userHasPermission(user, 'sales.invoices.view')
  }

  if (normalized.match(/^\/invoices\/review\/\d+$/)) {
    if (routeRoles['/invoices/review']?.includes(role)) return true
    return userHasReviewAccess(user)
  }

  if (normalized === '/invoices/review') {
    if (routeRoles['/invoices/review']?.includes(role)) return true
    return userHasPermission(user, 'review.view_queue') || userHasReviewAccess(user)
  }

  if (normalized === '/invoices') {
    if (routeRoles['/invoices']?.includes(role)) return true
    return userHasPermission(user, 'review.view_contracts') || userHasReviewAccess(user)
  }

  if (normalized === '/review/evaluation-queue') {
    if (routeRoles['/review/evaluation-queue']?.includes(role)) return true
    return userHasPermission(user, 'review.view_evaluation_queue') || userHasReviewAccess(user)
  }

  if (normalized === '/review/subscription-renewals') {
    if (routeRoles['/review/subscription-renewals']?.includes(role)) return true
    return userHasPermission(user, 'review.view_subscription_renewals') || userHasReviewAccess(user)
  }

  if (normalized.match(/^\/review\/evaluation-queue\/\d+$/)) {
    if (routeRoles['/review/evaluation-queue']?.includes(role)) return true
    return userHasPermission(user, 'review.view_evaluation_queue') || userHasReviewAccess(user)
  }

  if (normalized === '/review/evaluation-questions') {
    if (routeRoles['/review/evaluation-questions']?.includes(role)) return true
    return userHasPermission(user, 'review.manage_evaluation_questions') || userHasReviewAccess(user)
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
    if (adminRoute === '/admin/settings' && role !== 'super_admin') {
      return false
    }
    const allowed = routeRoles[adminRoute] ?? routeRoles['/admin/users']
    if (allowed?.includes(role)) return true
    return userHasPermission(user, 'users.manage')
  }

  if (normalized.startsWith('/crm')) {
    if (isSuspendedCrmRoute(normalized) && !isSuperAdmin(user)) {
      return false
    }

    const crmRoute = normalized === '/crm' ? '/crm' : (normalized.match(/^\/crm\/[^/]+/)?.[0] ?? '/crm')
    const allowed = routeRoles[crmRoute] ?? routeRoles['/crm']
    return allowed?.includes(role) ?? false
  }

  if (normalized.startsWith('/support')) {
    if (normalized === '/support/my-tasks') {
      if (routeRoles['/support/my-tasks']?.includes(role)) return true
      return userHasPermission(user, 'support.view_assigned_tasks')
    }
    if (normalized === '/support/tasks') {
      if (routeRoles['/support/tasks']?.includes(role)) return true
      return (
        userHasPermission(user, 'support.view_all_tasks')
        || userHasPermission(user, 'support.assign_tasks')
      )
    }
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
  if (role === 'call_center') return '/call-center/collections'
  if (role === 'crm') return CRM_DEFAULT_ROUTE
  if (role === 'hr_manager') return '/hrm'
  if (role === 'accountant') return '/accounting'
  if (role === 'support') return '/support/my-tasks'
  if (role === 'admin') return '/gps/management'
  return '/'
}

export function getRoleLabel(user: AuthUser | null): string {
  return formatUserRolesLabel(user)
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

  if (item.to === '/departments' || target === '/departments') {
    return normalized === '/departments'
  }

  if (item.to === '/sections' || target === '/sections') {
    return normalized === '/sections'
  }

  if (item.to === '/gps/management' || target === '/gps/management') {
    return normalized === '/gps/management' || normalized.startsWith('/gps/management/')
  }

  if (target.startsWith('/departments/')) {
    return normalized === target
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

  if (item.to === '/crm/referrals' || target === '/crm/referrals') {
    return normalized === '/crm/referrals' || normalized.startsWith('/crm/referrals/')
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

  if (item.to === '/invoices/review' || target === '/invoices/review') {
    return normalized === '/invoices/review' || /^\/invoices\/review\/\d+$/.test(normalized)
  }

  if (item.to === '/invoices' || target === '/invoices') {
    return normalized === '/invoices' || /^\/invoices\/\d+/.test(normalized)
  }

  if (item.end) return normalized === target
  return normalized === target || normalized.startsWith(`${target}/`)
}

export function isNavGroupActive(group: NavGroup, pathname: string, user: AuthUser | null): boolean {
  return group.items.some((item) => isNavItemActive(item, pathname, user))
}
