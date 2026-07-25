import type { DemoRole } from '../../../api/types'

export type CrmNavSectionId = 'home' | 'daily' | 'analytics'

export interface CrmNavItemDef {
  id: string
  to: string
  icon: string
  label: string
  letter: string
  section: CrmNavSectionId
  end?: boolean
  roles: DemoRole[]
}

export const CRM_NAV_SECTION_LABELS: Record<CrmNavSectionId, string> = {
  home: 'الرئيسية',
  daily: 'العمل اليومي',
  analytics: 'التحليلات',
}

const CRM_NAV_SECTION_ORDER: CrmNavSectionId[] = ['home', 'daily', 'analytics']

/**
 * مصدر حقيقة لعناصر CRM النشطة — مرتبة حسب أقسام الشريط الجانبي في إعادة التصميم.
 */
export const CRM_NAV_CATALOG: CrmNavItemDef[] = [
  // ——— الرئيسية ———
  {
    id: 'referrals',
    to: '/crm/referrals',
    icon: 'share',
    label: 'خط الترشيحات',
    letter: 'خ',
    section: 'home',
    end: true,
    roles: ['super_admin', 'admin', 'crm'],
  },
  {
    id: 'referrals-list',
    to: '/crm/referrals/list',
    icon: 'list_alt',
    label: 'قائمة الترشيحات',
    letter: 'ق',
    section: 'home',
    roles: ['super_admin', 'admin', 'crm'],
  },

  // ——— العمل اليومي ———
  {
    id: 'tasks',
    to: '/crm/tasks',
    icon: 'task',
    label: 'المهام',
    letter: 'م',
    section: 'daily',
    roles: ['super_admin', 'admin', 'crm'],
  },
  {
    id: 'call-logs',
    to: '/crm/call-logs',
    icon: 'call',
    label: 'سجل المكالمات',
    letter: 'س',
    section: 'daily',
    roles: ['super_admin', 'admin', 'crm'],
  },
  {
    id: 'activities',
    to: '/crm/activities',
    icon: 'view_agenda',
    label: 'الأنشطة',
    letter: 'ن',
    section: 'daily',
    roles: ['super_admin', 'admin', 'crm'],
  },

  // ——— التحليلات ———
  {
    id: 'reports',
    to: '/crm/reports',
    icon: 'analytics',
    label: 'تقارير الترشيحات',
    letter: 'ت',
    section: 'analytics',
    roles: ['super_admin', 'admin', 'crm'],
  },
  {
    id: 'owner-detail',
    to: '/crm/reports/owner-detail',
    icon: 'person_search',
    label: 'أداء الموظف',
    letter: 'أ',
    section: 'analytics',
    roles: ['super_admin', 'admin', 'crm'],
  },
  {
    id: 'leaderboard',
    to: '/crm/reports/leaderboard',
    icon: 'leaderboard',
    label: 'لوحة المتصدرين',
    letter: 'ل',
    section: 'analytics',
    roles: ['super_admin', 'admin', 'crm'],
  },
  {
    id: 'referral-network',
    to: '/crm/referrals/network',
    icon: 'account_tree',
    label: 'شبكة الإحالات',
    letter: 'ش',
    section: 'analytics',
    roles: ['super_admin', 'admin', 'crm'],
  },
  {
    id: 'owner-pipeline',
    to: '/crm/reports/owner-pipeline',
    icon: 'filter_alt',
    label: 'خط الأنابيب',
    letter: 'ط',
    section: 'analytics',
    roles: ['super_admin', 'admin', 'crm'],
  },
  {
    id: 'ceo-dashboard',
    to: '/crm/ceo',
    icon: 'dashboard',
    label: 'لوحة المدير',
    letter: 'د',
    section: 'analytics',
    end: true,
    roles: ['super_admin', 'admin', 'crm'],
  },
]

const ACTIVE_CRM_ROUTE_PREFIXES = [
  '/crm/ceo',
  '/crm/referrals',
  '/crm/reports',
  '/crm/tasks',
  '/crm/call-logs',
  '/crm/activities',
] as const

export function getActiveCrmNavItems(): CrmNavItemDef[] {
  return CRM_NAV_CATALOG
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

export interface CrmNavSection {
  id: CrmNavSectionId
  label: string
  items: CrmNavItemDef[]
}

/** أقسام الشريط الجانبي لـ CRM كما في إعادة التصميم */
export function buildCrmNavSections(): CrmNavSection[] {
  return CRM_NAV_SECTION_ORDER.map((id) => ({
    id,
    label: CRM_NAV_SECTION_LABELS[id],
    items: CRM_NAV_CATALOG.filter((item) => item.section === id),
  })).filter((section) => section.items.length > 0)
}

export function isActiveCrmRoute(path: string): boolean {
  const normalized = path.replace(/\/$/, '') || '/'
  return ACTIVE_CRM_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  )
}

/** المسار الافتراضي لقسم CRM */
export const CRM_DEFAULT_ROUTE = '/crm/referrals'
