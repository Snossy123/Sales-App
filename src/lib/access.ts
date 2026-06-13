import type { AuthUser, Branch, DemoRole } from '../api/types'

export function getUserRole(user: AuthUser | null): DemoRole {
  if (!user) return 'sales'
  if (user.demo_role) return user.demo_role
  const roleNames = user.roles?.map((r) => r.name) ?? []
  if (roleNames.includes('Admin')) return 'super_admin'
  const roleName = roleNames[0]?.toLowerCase() ?? ''
  if (roleName.includes('super')) return 'super_admin'
  if (roleName.includes('crmspecialist') || roleName.includes('crm specialist')) return 'crm'
  if (roleName.includes('hrmanager') || roleName.includes('hr manager') || roleName.includes('hr_manager')) return 'hr_manager'
  if (roleName.includes('accountant')) return 'accountant'
  if (roleName.includes('admin')) return 'admin'
  if (roleName.includes('collector')) return 'collector'
  if (roleName.includes('review')) return 'reviewer'
  if (roleName.includes('account')) return 'accountant'
  return 'sales'
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  return getUserRole(user) === 'super_admin'
}

export function isDepartmentAdmin(user: AuthUser | null): boolean {
  return getUserRole(user) === 'admin'
}

export function isAnyAdmin(user: AuthUser | null): boolean {
  const role = getUserRole(user)
  return role === 'super_admin' || role === 'admin'
}

/** null = unrestricted (super admin) */
export function getScopedDepartmentId(user: AuthUser | null): number | null {
  if (!user || isSuperAdmin(user)) return null
  if (isDepartmentAdmin(user)) return user.department_id ?? null
  return user.department_id ?? null
}

export function canAccessDepartment(user: AuthUser | null, departmentId: number): boolean {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (isDepartmentAdmin(user)) return user.department_id === departmentId
  return false
}

export function canAccessBranch(user: AuthUser | null, branch: Pick<Branch, 'department_id'>): boolean {
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (isDepartmentAdmin(user)) {
    return branch.department_id != null && branch.department_id === user.department_id
  }
  return false
}

export function filterByDepartmentScope<T extends { department_id?: number | null }>(
  user: AuthUser | null,
  items: T[],
): T[] {
  const scopeId = getScopedDepartmentId(user)
  if (scopeId == null) return items
  return items.filter((item) => item.department_id === scopeId)
}
