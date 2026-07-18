import type { AuthUser, Role } from '../api/types'

/** System role slug → Arabic display label */
export const SYSTEM_ROLE_LABELS: Record<string, string> = {
  Admin: 'مدير النظام',
  AdministrationManager: 'مدير الإدارة',
  BranchManager: 'مدير الفرع',
  Reviewer: 'المراجعة',
  Sales: 'المبيعات',
  Collector: 'التحصيل',
  CallCenter: 'مركز الاتصال',
  Accountant: 'المحاسبة',
  HrManager: 'الموارد البشرية',
  CrmSpecialist: 'مبيعات CRM',
  SupportEmployee: 'الدعم الفني',
}

export const PROTECTED_ROLE_SLUGS = new Set(Object.keys(SYSTEM_ROLE_LABELS))

export const ROLE_ASSIGNMENT_EXCLUDED = new Set(['Admin', 'AdministrationManager', 'Super Admin'])

/** Permissions denied to AdministrationManager / BranchManager (denylist model). */
export const MANAGER_DENIED_PERMISSIONS = new Set([
  'scope.organization',
  'roles.manage',
  'payments.refund',
])

/** Build manager permission keys: all catalog keys except denylist + exclusive scope. */
export function buildManagerPermissionKeys(
  allKeys: string[],
  scope: 'scope.administration' | 'scope.branch',
): string[] {
  const base = allKeys.filter(
    (key) => !MANAGER_DENIED_PERMISSIONS.has(key) && !key.startsWith('scope.'),
  )
  return [...base, scope]
}

export function formatRoleLabel(role: Pick<Role, 'name'> & { name_ar?: string | null }): string {
  if (role.name_ar?.trim()) return role.name_ar.trim()
  return SYSTEM_ROLE_LABELS[role.name] ?? role.name
}

export function formatUserRolesLabel(user: AuthUser | null): string {
  const roles = user?.roles ?? []
  if (roles.length === 0) return 'مستخدم'

  return roles.map((role) => formatRoleLabel(role)).join(' · ')
}

export function isProtectedRoleSlug(slug: string): boolean {
  return PROTECTED_ROLE_SLUGS.has(slug)
}

/** Pages each system role is intended to access (for admin UI hints). */
export const SYSTEM_ROLE_PAGE_HINTS: Record<string, string> = {
  Sales: 'لوحة التحكم · تعاقد جديد · دليل الأسعار · العروض · مخزون GPS · العملاء · الموزعين · البيان اليومي',
  Reviewer: 'مراجعة التعاقدات · كل التعاقدات · البيان اليومي',
  Collector: 'تحصيل الأقساط · سجل المدفوعات · العملاء · الموزعين',
  CallCenter: 'التحصيلات الخارجية · عرض الأقساط',
  Accountant: 'المحاسبة · الفواتير · الأقساط · التقارير المالية',
  HrManager: 'الموارد البشرية · الموظفون · الحضور · الرواتب',
  CrmSpecialist: 'قسم المبيعات CRM · العملاء المحتملين · المتابعات',
  SupportEmployee: 'مهام الدعم الفني المسندة',
  AdministrationManager: 'إدارة الفروع · المخزون · التعاقدات · المراجعة · التحصيل',
  BranchManager: 'فروع الإدارة · المخزون · التعاقدات · المراجعة · التحصيل',
}
