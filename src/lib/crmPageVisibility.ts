import type { AdministrationCrmPageSettings } from '../api/types'

export type CrmHideablePage = 'tasks' | 'activities'

export interface CrmPageVisibilityContext {
  departmentId: number | null
  departments: Array<{ id: number; settings?: AdministrationCrmPageSettings | null }>
}

const SETTING_KEY: Record<CrmHideablePage, keyof AdministrationCrmPageSettings> = {
  tasks: 'crm_tasks_enabled',
  activities: 'crm_activities_enabled',
}

/** Missing settings keep the page visible so existing administrations do not change. */
export function isCrmPageEnabled(
  page: CrmHideablePage,
  context?: CrmPageVisibilityContext | null,
): boolean {
  if (!context || context.departmentId == null) return true
  const current = context.departments.find((department) => department.id === context.departmentId)
  if (!current) return true
  return current.settings?.[SETTING_KEY[page]] !== false
}

export function crmPageForPath(path: string): CrmHideablePage | null {
  const normalized = path.replace(/\/$/, '') || '/'
  if (normalized === '/crm/tasks' || normalized.startsWith('/crm/tasks/')) return 'tasks'
  if (normalized === '/crm/activities' || normalized.startsWith('/crm/activities/')) return 'activities'
  return null
}
