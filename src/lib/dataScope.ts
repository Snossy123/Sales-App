import type { AuthUser, Branch } from '../api/types'
import { getActiveBranchId as resolveActiveBranchId } from './activeBranch'
import { useAuthStore } from '../stores/authStore'

export type DataScopeLevel = 'organization' | 'administration' | 'branches' | 'branch' | 'none'

function hasScopePermission(user: AuthUser | null, permission: string): boolean {
  return user?.permissions?.includes(permission) ?? false
}

export function getUserDataScope(user: AuthUser | null): DataScopeLevel {
  if (!user) return 'none'

  const fromPayload = user.data_scope
  if (
    fromPayload === 'organization'
    || fromPayload === 'administration'
    || fromPayload === 'branches'
    || fromPayload === 'branch'
    || fromPayload === 'none'
  ) {
    return fromPayload
  }

  if (hasScopePermission(user, 'scope.organization')) return 'organization'
  if (hasScopePermission(user, 'scope.administration')) return 'administration'
  if (hasScopePermission(user, 'scope.branches')) return 'branches'
  if (hasScopePermission(user, 'scope.branch')) return 'branch'

  if (user.demo_role === 'super_admin') return 'organization'
  if (user.branch_id ?? user.branch?.id) return 'branch'

  return 'none'
}

export function isOrgWideDataScope(user: AuthUser | null): boolean {
  return getUserDataScope(user) === 'organization'
}

/** null = unrestricted (organization scope) */
export function getScopedDepartmentId(user: AuthUser | null): number | null {
  if (!user || isOrgWideDataScope(user)) return null
  return user.administration_id ?? user.department_id ?? null
}

/** null = not locked to a single branch (organization, administration, or branches scope) */
export function getScopedBranchId(user: AuthUser | null): number | null {
  if (!user) return null
  if (getUserDataScope(user) !== 'branch') return null
  return user.branch_id ?? user.branch?.id ?? null
}

export function getScopeApiFilters(user: AuthUser | null): Record<string, string | number> {
  const branchId = getScopedBranchId(user)
  if (branchId != null) return { 'filter[branch_id]': branchId }

  const administrationId = getScopedDepartmentId(user)
  if (administrationId != null) return { 'filter[administration_id]': administrationId }

  return {}
}

export function canPickBranch(user: AuthUser | null): boolean {
  const scope = getUserDataScope(user)
  return scope === 'organization' || scope === 'administration' || scope === 'branches'
}

export function canPickAdministration(user: AuthUser | null): boolean {
  return getUserDataScope(user) === 'organization'
}

export function getScopedBranchIds(
  user: AuthUser | null,
  branches: Pick<Branch, 'id' | 'administration_id' | 'department_id'>[],
): number[] | null {
  const scope = getUserDataScope(user)
  if (scope === 'organization') return null

  if (scope === 'administration') {
    const administrationId = user?.administration_id ?? user?.department_id
    if (administrationId == null) return []
    return branches
      .filter((branch) => (branch.administration_id ?? branch.department_id) === administrationId)
      .map((branch) => branch.id)
  }

  if (scope === 'branches') {
    const allowed = user?.allowed_branch_ids ?? user?.branches?.map((branch) => branch.id) ?? []
    if (allowed.length > 0) return allowed

    const administrationId = user?.administration_id ?? user?.department_id
    if (administrationId == null) return []
    return branches
      .filter((branch) => (branch.administration_id ?? branch.department_id) === administrationId)
      .map((branch) => branch.id)
  }

  if (scope === 'branch') {
    const branchId = user?.branch_id ?? user?.branch?.id
    return branchId != null ? [branchId] : []
  }

  return []
}

export function isBranchInDataScope(
  user: AuthUser | null,
  branchId?: number | null,
  branches: Pick<Branch, 'id' | 'administration_id' | 'department_id'>[] = [],
): boolean {
  const scopedBranchIds = getScopedBranchIds(user, branches)
  if (scopedBranchIds == null) return true
  if (branchId == null) return false
  return scopedBranchIds.includes(branchId)
}

export function getDataScopeLabel(user: AuthUser | null): string | null {
  return user?.data_scope_label ?? null
}

/** Resolve administration id for customer/distributor list queries. */
export function getResolvedAdministrationId(user: AuthUser | null): number | null {
  const scoped = getScopedDepartmentId(user)
  if (scoped != null) return scoped

  const fromStore = useAuthStore.getState().departmentId
  if (fromStore != null) return fromStore

  const branch = user?.branch
  if (branch) {
    return branch.administration_id ?? branch.department_id ?? null
  }

  return user?.administration_id ?? user?.department_id ?? null
}

export function getListAdministrationFilter(user: AuthUser | null): Record<string, number> {
  const administrationId = getResolvedAdministrationId(user)
  if (administrationId != null) {
    return { 'filter[administration_id]': administrationId }
  }
  return {}
}

/** Merge list query params scoped to the active administration (customers/distributors). */
export function mergeAdministrationListParams<T extends Record<string, unknown>>(
  user: AuthUser | null,
  params: T,
): T & Record<string, string | number> {
  return { ...params, ...getListAdministrationFilter(user) }
}

/** Stable react-query key segment for administration-scoped list endpoints. */
export function getAdministrationScopeQueryKey(user: AuthUser | null): number | 'all' {
  return getResolvedAdministrationId(user) ?? 'all'
}

/** Locked branch filter for list queries. */
export function getListBranchFilter(
  user: AuthUser | null,
  contextBranchId?: number | null,
): Record<string, number> {
  const scope = getUserDataScope(user)

  if (scope === 'branch') {
    const branchId = getScopedBranchId(user)
    if (branchId != null) {
      return { 'filter[branch_id]': branchId }
    }
  }

  if (scope === 'branches') {
    const branchId = resolveActiveBranchId(user, contextBranchId)
    if (branchId != null) {
      return { 'filter[branch_id]': branchId }
    }
  }

  return {}
}

/** Merge list query params with data-scope branch filter. */
export function mergeScopedListParams<T extends Record<string, unknown>>(
  user: AuthUser | null,
  params: T,
  contextBranchId?: number | null,
): T & Record<string, string | number> {
  const branchId = contextBranchId ?? useAuthStore.getState().branchId
  return { ...params, ...getListBranchFilter(user, branchId) }
}

/** Stable react-query key segment for scoped list endpoints. */
export function getListScopeQueryKey(
  user: AuthUser | null,
  contextBranchId?: number | null,
): number | 'all' {
  const branchId = contextBranchId ?? useAuthStore.getState().branchId
  const scope = getUserDataScope(user)

  if (scope === 'branch') {
    return getScopedBranchId(user) ?? 'all'
  }

  if (scope === 'branches') {
    return resolveActiveBranchId(user, branchId) ?? 'all'
  }

  return 'all'
}
