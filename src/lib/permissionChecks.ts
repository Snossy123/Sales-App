import type { AuthUser } from '../api/types'

export function userHasAnyPermissionPrefix(user: AuthUser | null, prefix: string): boolean {
  return user?.permissions?.some((p) => p.startsWith(`${prefix}.`)) ?? false
}

export function userHasReviewAccess(user: AuthUser | null): boolean {
  return userHasAnyPermissionPrefix(user, 'review')
}

export function userHasAccountingAccess(user: AuthUser | null): boolean {
  return user?.permissions?.includes('accounting.access_accounting_module') ?? false
}
