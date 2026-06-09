import type { AuthUser, Branch, DemoRole } from '../api/types'

export function getUserRole(user: AuthUser | null): DemoRole {
  if (!user) return 'sales'
  if (user.demo_role) return user.demo_role
  const roleName = user.roles?.[0]?.name?.toLowerCase() ?? ''
  if (roleName.includes('super')) return 'super_admin'
  if (roleName.includes('admin')) return 'admin'
  if (roleName.includes('collector')) return 'collector'
  if (roleName.includes('review')) return 'reviewer'
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
