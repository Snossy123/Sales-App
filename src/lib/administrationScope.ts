import type { AuthUser } from '../api/types'
import { getScopedDepartmentId } from './access'

export function getAdministrationApiFilters(user: AuthUser | null): Record<string, string | number> {
  const scopeId = getScopedDepartmentId(user)
  if (scopeId == null) return {}
  return { 'filter[administration_id]': scopeId }
}

export function getAdministrationBranchFilters(user: AuthUser | null): Record<string, string | number> {
  return getAdministrationApiFilters(user)
}

export function mergeScopedParams<T extends Record<string, unknown>>(
  user: AuthUser | null,
  params: T,
): T & Record<string, string | number> {
  return { ...params, ...getAdministrationApiFilters(user) }
}
