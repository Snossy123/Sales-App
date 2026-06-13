import type { AuthUser } from '../api/types'
import { getUserRole, userHasPermission } from '../lib/access'
import { canAccessRoute } from '../lib/permissions'
import type { TourLocale, TourStepConfig } from './types'

function stepAllowed(step: TourStepConfig, user: AuthUser | null): boolean {
  if (!user) return false

  if (step.roles?.length) {
    const role = getUserRole(user)
    if (!step.roles.includes(role)) return false
  }

  if (step.permissions?.length) {
    const hasAny = step.permissions.some((p) => userHasPermission(user, p))
    if (!hasAny) return false
  }

  if (step.requiresRoute && !canAccessRoute(step.requiresRoute, user)) {
    return false
  }

  return true
}

export function resolveTourSteps(
  steps: TourStepConfig[],
  user: AuthUser | null,
  locale: TourLocale,
): Array<{
  id: string
  target: string
  title: string
  content: string
  placement: TourStepConfig['placement']
}> {
  return steps
    .filter((step) => stepAllowed(step, user))
    .map((step) => ({
      id: step.id,
      target: step.target,
      title: step.title[locale],
      content: step.content[locale],
      placement: step.placement ?? 'auto',
    }))
}
