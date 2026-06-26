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
