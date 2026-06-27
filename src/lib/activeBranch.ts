import type { AuthUser } from '../api/types'
import { api } from '../api/client'
import { getUserDataScope } from './dataScope'
import { useAuthStore } from '../stores/authStore'

export function getAllowedBranchIds(user: AuthUser | null): number[] {
  if (!user) return []

  const explicit = user.allowed_branch_ids
    ?? user.branches?.map((branch) => branch.id)
    ?? []

  if (explicit.length > 0) {
    return explicit
  }

  if (getUserDataScope(user) === 'administration') {
    return []
  }

  const homeBranchId = user.branch_id ?? user.branch?.id
  return homeBranchId != null ? [homeBranchId] : []
}

export function getActiveBranchId(
  user: AuthUser | null,
  contextBranchId?: number | null,
): number | null {
  if (contextBranchId != null) return contextBranchId

  const fromPrefs = user?.preferences?.active_branch_id ?? user?.active_branch_id
  if (fromPrefs != null) return fromPrefs

  const allowed = getAllowedBranchIds(user)
  if (allowed.length > 0) return allowed[0]

  return user?.branch_id ?? user?.branch?.id ?? null
}

export async function persistActiveBranch(user: AuthUser, branchId: number): Promise<void> {
  const { data } = await api.patch<AuthUser>('/auth/me/preferences', {
    active_branch_id: branchId,
  })
  useAuthStore.getState().updateUser(data)
}
