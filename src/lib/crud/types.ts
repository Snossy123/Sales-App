import type { DemoRole } from '../../api/types'

export type EditMode = 'route' | 'modal' | 'inline'

export interface EntityCrudPermissions {
  create?: DemoRole[]
  read?: DemoRole[]
  edit?: DemoRole[]
  delete?: DemoRole[]
}

export interface EntityCrudConfig<T extends { id: number } = { id: number }> {
  resource: string
  trashType?: string
  listPath: string
  createPath?: string
  detailPath?: (id: number) => string
  editPath?: (id: number) => string
  label: (row: T) => string
  permissions: EntityCrudPermissions
  editMode?: EditMode
  deleteConfirmMessage?: (row: T) => string
}

export type EntityCrudKey =
  | 'customers'
  | 'distributors'
  | 'services'
  | 'employees'
  | 'leads'
  | 'promotions'
  | 'priceCatalog'
  | 'crmCampaigns'
  | 'hrmJobs'
  | 'hrmHolidays'
  | 'hrmShifts'
  | 'hrmLeaveTypes'
  | 'hrmAllowances'
  | 'hrmPayrollGroups'
  | 'faqItems'
  | 'collectionAccounts'
  | 'journalEntries'
  | 'budgets'
  | 'administrations'
  | 'branches'
  | 'sections'
  | 'adminUsers'
