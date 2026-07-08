import type { DemoRole } from '../../../api/types'

/** حالة ظهور عنصر CRM في القائمة الجانبية */
export type CrmNavAvailability = 'active' | 'suspended'

export interface CrmNavItemDef {
  id: string
  to: string
  icon: string
  label: string
  end?: boolean
  roles: DemoRole[]
  availability: CrmNavAvailability
  /** سبب التعليق — للمرجع عند إعادة التفعيل */
  suspendNote?: string
}

/**
 * مصدر حقيقة لعناصر CRM.
 * لتفعيل تبويب معلّق لاحقاً: غيّر availability إلى 'active'.
 */
export const CRM_NAV_CATALOG: CrmNavItemDef[] = [
  // ——— نشط: نطاق العميل الحالي (الترشيحات) ———
  {
    id: 'referrals',
    to: '/crm/referrals',
    icon: 'share',
    label: 'الترشيحات',
    end: true,
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'active',
  },
  {
    id: 'referral-follow-ups',
    to: '/crm/referrals/follow-ups',
    icon: 'event_available',
    label: 'متابعات الترشيحات',
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'active',
  },
  {
    id: 'reports',
    to: '/crm/reports',
    icon: 'analytics',
    label: 'تقارير الترشيحات',
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'active',
  },

  // ——— معلّق: ميزات CRM العامة (محفوظة للمستقبل) ———
  {
    id: 'pipeline',
    to: '/crm',
    icon: 'hub',
    label: 'العملاء المحتملين',
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'suspended',
    suspendNote: 'Pipeline CRM العام (new → won)',
  },
  {
    id: 'customer-add',
    to: '/crm/customers/add',
    icon: 'person_add',
    label: 'إضافة عميل',
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'suspended',
    suspendNote: 'تسجيل عميل مع مصدر إحالة من CRM',
  },
  {
    id: 'follow-ups',
    to: '/crm/follow-ups',
    icon: 'event',
    label: 'المتابعات',
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'suspended',
    suspendNote: 'جدولة متابعات CRM العامة',
  },
  {
    id: 'activities',
    to: '/crm/activities',
    icon: 'task',
    label: 'الأنشطة',
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'suspended',
    suspendNote: 'سجل أنشطة العملاء المحتملين',
  },
  {
    id: 'call-logs',
    to: '/crm/call-logs',
    icon: 'call',
    label: 'سجل المكالمات',
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'suspended',
    suspendNote: 'تسجيل ومتابعة المكالمات',
  },
  {
    id: 'campaigns',
    to: '/crm/campaigns',
    icon: 'campaign',
    label: 'الحملات',
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'suspended',
    suspendNote: 'حملات SMS/بريد',
  },
  {
    id: 'proposals',
    to: '/crm/proposals',
    icon: 'description',
    label: 'العروض',
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'suspended',
    suspendNote: 'عروض أسعار للعملاء المحتملين',
  },
  {
    id: 'order-requests',
    to: '/crm/order-requests',
    icon: 'shopping_cart',
    label: 'طلبات العملاء',
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'suspended',
    suspendNote: 'طلبات بوابة العملاء',
  },
  {
    id: 'marketplace',
    to: '/crm/marketplace',
    icon: 'extension',
    label: 'التكاملات',
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'suspended',
    suspendNote: 'تكاملات B2B وFacebook leads',
  },
  {
    id: 'settings',
    to: '/crm/settings',
    icon: 'settings',
    label: 'الإعدادات',
    roles: ['super_admin', 'admin', 'crm'],
    availability: 'suspended',
    suspendNote: 'إعدادات CRM ومصادر العملاء',
  },
]

const ACTIVE_CRM_ROUTE_PREFIXES = ['/crm/referrals', '/crm/reports'] as const

export function getActiveCrmNavItems(): CrmNavItemDef[] {
  return CRM_NAV_CATALOG.filter((item) => item.availability === 'active')
}

export function getSuspendedCrmNavItems(): CrmNavItemDef[] {
  return CRM_NAV_CATALOG.filter((item) => item.availability === 'suspended')
}

export function crmNavDefToNavItem(def: CrmNavItemDef): {
  to: string
  icon: string
  label: string
  end?: boolean
  roles: DemoRole[]
} {
  return {
    to: def.to,
    icon: def.icon,
    label: def.label,
    end: def.end,
    roles: def.roles,
  }
}

export type CrmNavItem = ReturnType<typeof crmNavDefToNavItem>

export function buildActiveCrmNavItems(): CrmNavItem[] {
  return getActiveCrmNavItems().map(crmNavDefToNavItem)
}

export function isActiveCrmRoute(path: string): boolean {
  const normalized = path.replace(/\/$/, '') || '/'
  return ACTIVE_CRM_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  )
}

export function isSuspendedCrmRoute(path: string): boolean {
  const normalized = path.replace(/\/$/, '') || '/'
  if (!normalized.startsWith('/crm')) return false
  return !isActiveCrmRoute(normalized)
}

/** المسار الافتراضي لقسم CRM في النطاق الحالي */
export const CRM_DEFAULT_ROUTE = '/crm/referrals'
