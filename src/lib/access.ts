import type { AuthUser, Branch, DemoRole } from '../api/types'

function roleNames(user: AuthUser | null): string[] {
  return user?.roles?.map((r) => r.name) ?? []
}

function hasRole(user: AuthUser | null, ...names: string[]): boolean {
  const normalized = roleNames(user).map((n) => n.toLowerCase())
  return names.some((name) => normalized.includes(name.toLowerCase()))
}

export function userHasPermission(user: AuthUser | null, permission: string): boolean {
  return user?.permissions?.includes(permission) ?? false
}

export function getUserRole(user: AuthUser | null): DemoRole {
  if (!user) return 'sales'
  if (user.demo_role) return user.demo_role

  if (hasRole(user, 'Admin')) return 'super_admin'
  if (hasRole(user, 'BranchManager')) return 'admin'

  const primary = roleNames(user)[0]?.toLowerCase() ?? ''
  if (primary.includes('super')) return 'super_admin'
  if (primary.includes('crmspecialist') || primary.includes('crm specialist')) return 'crm'
  if (primary.includes('hrmanager') || primary.includes('hr manager') || primary.includes('hr_manager')) return 'hr_manager'
  if (primary.includes('accountant')) return 'accountant'
  if (primary.includes('collector')) return 'collector'
  if (primary.includes('review')) return 'reviewer'
  if (primary.includes('admin')) return 'admin'

  if (userHasPermission(user, 'users.manage')) return 'super_admin'
  if (userHasPermission(user, 'accounting.access_accounting_module')) return 'accountant'
  if (userHasPermission(user, 'hr.employees.manage')) return 'hr_manager'
  if (userHasPermission(user, 'crm.leads.manage')) return 'crm'

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
