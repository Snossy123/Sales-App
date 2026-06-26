import type { Customer, Distributor, Service } from '../../api/types'
import type { EntityCrudConfig, EntityCrudKey } from './types'

const adminRoles = ['super_admin', 'admin'] as const
const salesRoles = ['super_admin', 'admin', 'sales'] as const

export const entityCrudRegistry: Record<EntityCrudKey, EntityCrudConfig> = {
  customers: {
    resource: 'customers',
    trashType: 'customers',
    listPath: '/customers',
    createPath: '/customers/add',
    detailPath: (id) => `/customers/${id}`,
    editPath: (id) => `/customers/${id}/edit`,
    label: (row) => (row as Customer).name,
    permissions: { create: [...salesRoles], read: [...salesRoles], edit: [...salesRoles], delete: [...adminRoles] },
    editMode: 'route',
    deleteConfirmMessage: (row) => `حذف العميل "${(row as Customer).name}"؟`,
  },
  distributors: {
    resource: 'distributors',
    trashType: 'distributors',
    listPath: '/distributors',
    createPath: '/distributors/add',
    detailPath: (id) => `/distributors/${id}`,
    editPath: (id) => `/distributors/${id}`,
    label: (row) => (row as Distributor).name_ar || (row as Distributor).name,
    permissions: { create: [...salesRoles], read: [...salesRoles], edit: [...salesRoles], delete: [...adminRoles] },
    editMode: 'route',
    deleteConfirmMessage: (row) => {
      const d = row as Distributor
      return `حذف الموزّع "${d.name_ar || d.name}"؟`
    },
  },
  services: {
    resource: 'services',
    trashType: 'services',
    listPath: '/services',
    createPath: '/services/add',
    editPath: (id) => `/services/${id}/edit`,
    label: (row) => (row as Service).name_ar || (row as Service).name,
    permissions: { create: [...adminRoles], read: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'route',
    deleteConfirmMessage: (row) => {
      const s = row as Service
      return `حذف الخدمة "${s.name_ar || s.name}"؟`
    },
  },
  employees: {
    resource: 'employees',
    trashType: 'employees',
    listPath: '/hrm/employees',
    detailPath: (id) => `/hrm/employees/${id}`,
    label: (row) => (row as { name: string }).name,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  leads: {
    resource: 'leads',
    trashType: 'leads',
    listPath: '/crm/leads',
    label: (row) => (row as { name: string }).name,
    permissions: { create: [...salesRoles], edit: [...salesRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  promotions: {
    resource: 'pricing/promotions',
    trashType: 'promotions',
    listPath: '/pricing/promotions',
    label: (row) => (row as { name_ar?: string }).name_ar ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  priceCatalog: {
    resource: 'pricing/catalog',
    trashType: 'price-catalog-items',
    listPath: '/pricing/catalog',
    label: (row) => (row as { name_ar?: string }).name_ar ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  crmCampaigns: {
    resource: 'crm/campaigns',
    trashType: 'crm-campaigns',
    listPath: '/crm/campaigns',
    label: (row) => (row as { name?: string }).name ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'inline',
  },
  hrmJobs: {
    resource: 'hrm/jobs',
    trashType: 'hrm-jobs',
    listPath: '/hrm/jobs',
    label: (row) => (row as { name?: string }).name ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  hrmHolidays: {
    resource: 'hrm/holidays',
    trashType: 'hrm-holidays',
    listPath: '/hrm/holidays',
    label: (row) => (row as { name?: string }).name ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  hrmShifts: {
    resource: 'hrm/shifts',
    trashType: 'hrm-shifts',
    listPath: '/hrm/shifts',
    label: (row) => (row as { name?: string }).name ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  hrmLeaveTypes: {
    resource: 'hrm/leave-types',
    trashType: 'hrm-leave-types',
    listPath: '/hrm/leave-types',
    label: (row) => (row as { name?: string }).name ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  hrmAllowances: {
    resource: 'hrm/allowances',
    trashType: 'hrm-allowances',
    listPath: '/hrm/allowances',
    label: (row) => (row as { name?: string }).name ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  hrmPayrollGroups: {
    resource: 'hrm/payroll-groups',
    trashType: 'hrm-payroll-groups',
    listPath: '/hrm/payroll-groups',
    label: (row) => (row as { name?: string }).name ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  faqItems: {
    resource: 'admin/faq-items',
    trashType: 'faq-items',
    listPath: '/admin/faq',
    label: (row) => (row as { question_ar?: string }).question_ar ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  collectionAccounts: {
    resource: 'collection-accounts',
    trashType: 'collection-accounts',
    listPath: '/admin/collection-accounts',
    label: (row) => (row as { beneficiary_name?: string }).beneficiary_name ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  journalEntries: {
    resource: 'accounting/journal-entries',
    trashType: 'journal-entries',
    listPath: '/accounting/journal-entries',
    label: (row) => (row as { ref_no?: string }).ref_no ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  budgets: {
    resource: 'accounting/budgets',
    trashType: 'accounting-budgets',
    listPath: '/accounting/budgets',
    label: (row) => (row as { name?: string }).name ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  administrations: {
    resource: 'administrations',
    listPath: '/departments',
    label: (row) => (row as { name_ar?: string; name?: string }).name_ar || (row as { name?: string }).name || `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: ['super_admin'] },
    editMode: 'modal',
  },
  branches: {
    resource: 'branches',
    listPath: '/branches',
    label: (row) => (row as { name_ar?: string; name?: string }).name_ar || (row as { name?: string }).name || `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: ['super_admin'] },
    editMode: 'modal',
  },
  sections: {
    resource: 'departments',
    listPath: '/sections',
    label: (row) => (row as { name_ar?: string; name?: string }).name_ar || (row as { name?: string }).name || `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: [...adminRoles] },
    editMode: 'modal',
  },
  adminUsers: {
    resource: 'admin/users',
    trashType: 'admin-users',
    listPath: '/admin/users',
    label: (row) => (row as { name?: string }).name ?? `#${row.id}`,
    permissions: { create: [...adminRoles], edit: [...adminRoles], delete: ['super_admin'] },
    editMode: 'modal',
    deleteConfirmMessage: (row) => `حذف المستخدم "${(row as { name?: string }).name}"؟`,
  },
}

export function getEntityCrudConfig(key: EntityCrudKey): EntityCrudConfig {
  return entityCrudRegistry[key]
}
