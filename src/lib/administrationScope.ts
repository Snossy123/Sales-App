import type { AuthUser } from '../api/types'
import {
  getListBranchFilter,
  getScopeApiFilters,
  mergeScopedListParams,
} from './dataScope'

export { getListBranchFilter, mergeScopedListParams }

export function getAdministrationApiFilters(user: AuthUser | null): Record<string, string | number> {
  return getScopeApiFilters(user)
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
