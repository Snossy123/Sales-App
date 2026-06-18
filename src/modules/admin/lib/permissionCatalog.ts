export type PermissionCategory = 'view' | 'add' | 'edit' | 'delete' | 'other'

export interface PermissionDefinition {
  key: string
  module: string
  category: PermissionCategory
  label: string
  description: string
}

export const CATEGORY_LABELS: Record<PermissionCategory, string> = {
  view: 'عرض',
  add: 'إضافة',
  edit: 'تعديل',
  delete: 'حذف',
  other: 'أخرى',
}

export const MODULE_LABELS: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  branches: 'الفروع',
  warehouses: 'المخازن',
  inventory: 'مخزون GPS',
  stock: 'تحويلات المخزون',
  customers: 'العملاء',
  sales: 'الفواتير والبيع',
  installments: 'الأقساط',
  users: 'المستخدمون',
  roles: 'الأدوار',
  audit: 'سجل التدقيق',
  settings: 'إعدادات النظام',
  reports: 'التقارير المالية',
  crm: 'قسم المبيعات',
  hrm: 'الموارد البشرية',
  accounting: 'المحاسبة',
}

export interface PermissionSectionDef {
  id: string
  label: string
  icon: string
  modules: string[]
}

/** ترتيب الوحدات مطابق لمجموعات القائمة الجانبية */
export const PERMISSION_SECTIONS: PermissionSectionDef[] = [
  {
    id: 'general',
    label: 'عام',
    icon: 'dashboard',
    modules: ['dashboard'],
  },
  {
    id: 'management',
    label: 'الإدارة',
    icon: 'corporate_fare',
    modules: ['branches'],
  },
  {
    id: 'contracts',
    label: 'قسم التعاقدات',
    icon: 'edit_document',
    modules: ['warehouses', 'sales'],
  },
  {
    id: 'review',
    label: 'قسم المراجعة',
    icon: 'fact_check',
    modules: ['sales'],
  },
  {
    id: 'collection',
    label: 'قسم التحصيل',
    icon: 'payments',
    modules: ['installments'],
  },
  {
    id: 'inventory',
    label: 'المخزون',
    icon: 'inventory_2',
    modules: ['inventory', 'stock'],
  },
  {
    id: 'operations',
    label: 'العمليات',
    icon: 'work',
    modules: ['customers'],
  },
  {
    id: 'system',
    label: 'إدارة النظام',
    icon: 'admin_panel_settings',
    modules: ['users', 'roles', 'audit', 'settings'],
  },
  {
    id: 'accounting',
    label: 'المحاسبة',
    icon: 'account_balance',
    modules: ['accounting', 'reports'],
  },
  {
    id: 'hrm',
    label: 'الموارد البشرية',
    icon: 'groups',
    modules: ['hrm'],
  },
  {
    id: 'crm',
    label: 'قسم المبيعات',
    icon: 'hub',
    modules: ['crm'],
  },
]

const PERMISSIONS: PermissionDefinition[] = [
  { key: 'dashboard.view', module: 'dashboard', category: 'view', label: 'عرض لوحة التحكم', description: 'الوصول إلى لوحة التحكم الرئيسية وملخص المؤشرات' },
  { key: 'branches.manage', module: 'branches', category: 'other', label: 'إدارة الفروع', description: 'إنشاء وتعديل وإدارة فروع الإدارات' },
  { key: 'warehouses.manage', module: 'warehouses', category: 'other', label: 'إدارة المخازن', description: 'إنشاء وتعديل مخازن الفروع' },
  { key: 'inventory.manage', module: 'inventory', category: 'other', label: 'إدارة المخزون', description: 'عرض وإدارة مخزون أجهزة GPS' },
  { key: 'stock.transfer', module: 'stock', category: 'other', label: 'تحويل المخزون', description: 'إنشاء واعتماد تحويلات المخزون بين الفروع' },
  { key: 'customers.manage', module: 'customers', category: 'other', label: 'إدارة العملاء', description: 'إنشاء وتعديل بيانات العملاء والضامنين' },
  { key: 'sales.pos', module: 'sales', category: 'other', label: 'نقطة البيع', description: 'تنفيذ عمليات البيع من نقطة البيع' },
  { key: 'sales.invoices.view', module: 'sales', category: 'view', label: 'عرض الفواتير', description: 'استعراض فواتير المبيعات وتفاصيلها' },
  { key: 'installments.collect', module: 'installments', category: 'other', label: 'تحصيل الأقساط', description: 'تسجيل تحصيل الأقساط من العملاء' },
  { key: 'installments.view', module: 'installments', category: 'view', label: 'عرض الأقساط', description: 'استعراض جداول الأقساط والمتأخرات' },
  { key: 'installments.reconcile', module: 'installments', category: 'other', label: 'تصالح الأقساط', description: 'فتح وإغلاق تصالح الأقساط المتأخرة' },
  { key: 'external_collections.collect', module: 'installments', category: 'other', label: 'التحصيلات الخارجية', description: 'تحصيل الأقساط عبر التحويل لمركز الاتصال' },
  { key: 'collection_accounts.manage', module: 'installments', category: 'other', label: 'حسابات التحويل', description: 'إدارة حسابات التحصيل الخارجي لكل رقم' },
  { key: 'users.manage', module: 'users', category: 'other', label: 'إدارة المستخدمين', description: 'إنشاء وتعديل حسابات الموظفين وربطهم بالفروع' },
  { key: 'roles.manage', module: 'roles', category: 'other', label: 'إدارة الأدوار', description: 'تعريف الأدوار وربط الصلاحيات بها' },
  { key: 'audit.view', module: 'audit', category: 'view', label: 'عرض سجل التدقيق', description: 'استعراض سجل العمليات والتغييرات الإدارية' },
  { key: 'settings.manage', module: 'settings', category: 'other', label: 'إدارة الإعدادات', description: 'تعديل إعدادات النظام والمؤسسة' },
  { key: 'reports.financial', module: 'reports', category: 'view', label: 'التقارير المالية', description: 'عرض التقارير المالية والتحليلات' },
  { key: 'crm.access_all_leads', module: 'crm', category: 'view', label: 'عرض كل العملاء المحتملين', description: 'الوصول إلى جميع العملاء المحتملين في النظام' },
  { key: 'crm.access_own_leads', module: 'crm', category: 'view', label: 'عرض عملائي المحتملين', description: 'الوصول إلى العملاء المحتملين المسندين للمستخدم فقط' },
  { key: 'crm.access_all_schedule', module: 'crm', category: 'view', label: 'عرض كل المتابعات', description: 'استعراض جدول المتابعات لجميع المستخدمين' },
  { key: 'crm.access_own_schedule', module: 'crm', category: 'view', label: 'عرض متابعاتي', description: 'استعراض المتابعات المسندة للمستخدم فقط' },
  { key: 'crm.access_all_campaigns', module: 'crm', category: 'view', label: 'عرض كل الحملات', description: 'استعراض حملات التسويق لجميع المستخدمين' },
  { key: 'crm.access_own_campaigns', module: 'crm', category: 'view', label: 'عرض حملاتي', description: 'استعراض الحملات المسندة للمستخدم فقط' },
  { key: 'crm.access_contact_login', module: 'crm', category: 'other', label: 'بوابة العملاء', description: 'إدارة دخول العملاء إلى بوابة CRM' },
  { key: 'crm.access_sources', module: 'crm', category: 'other', label: 'مصادر العملاء', description: 'إدارة مصادر العملاء المحتملين' },
  { key: 'crm.access_life_stage', module: 'crm', category: 'other', label: 'مراحل العميل', description: 'إدارة مراحل دورة حياة العميل' },
  { key: 'crm.access_proposal', module: 'crm', category: 'other', label: 'العروض', description: 'إنشاء وإدارة عروض الأسعار للعملاء' },
  { key: 'crm.view_all_call_log', module: 'crm', category: 'view', label: 'عرض كل سجل المكالمات', description: 'استعراض سجل المكالمات لجميع المستخدمين' },
  { key: 'crm.view_own_call_log', module: 'crm', category: 'view', label: 'عرض مكالماتي', description: 'استعراض سجل المكالمات الخاص بالمستخدم' },
  { key: 'crm.access_b2b_marketplace', module: 'crm', category: 'other', label: 'التكاملات', description: 'الوصول إلى تكاملات B2B والسوق' },
  { key: 'crm.leads.manage', module: 'crm', category: 'other', label: 'إدارة العملاء المحتملين', description: 'إنشاء وتعديل العملاء المحتملين ومراحلهم' },
  { key: 'crm.activities.manage', module: 'crm', category: 'other', label: 'إدارة الأنشطة', description: 'تسجيل ومتابعة أنشطة CRM' },
  { key: 'hrm.leave.manage', module: 'hrm', category: 'other', label: 'إدارة الإجازات', description: 'تقديم وإدارة طلبات الإجازة' },
  { key: 'hrm.leave.approve', module: 'hrm', category: 'other', label: 'اعتماد الإجازات', description: 'الموافقة على طلبات الإجازة أو رفضها' },
  { key: 'hrm.attendance.manage', module: 'hrm', category: 'other', label: 'إدارة الحضور', description: 'تسجيل ومتابعة حضور وانصراف الموظفين' },
  { key: 'hrm.payroll.manage', module: 'hrm', category: 'other', label: 'إدارة الرواتب', description: 'إعداد وصرف مسيرات الرواتب' },
  { key: 'hrm.shift.manage', module: 'hrm', category: 'other', label: 'إدارة الورديات', description: 'تعريف الورديات وربطها بالموظفين' },
  { key: 'hrm.holiday.manage', module: 'hrm', category: 'other', label: 'إدارة العطلات', description: 'تعريف العطلات الرسمية في التقويم' },
  { key: 'hrm.allowance.manage', module: 'hrm', category: 'other', label: 'إدارة البدلات', description: 'تعريف وإدارة بدلات الموظفين' },
  { key: 'hrm.sales_target.manage', module: 'hrm', category: 'other', label: 'أهداف المبيعات', description: 'تحديد ومتابعة أهداف مبيعات الموظفين' },
  { key: 'hr.employees.manage', module: 'hrm', category: 'other', label: 'إدارة الموظفين', description: 'إنشاء وتعديل بيانات الموظفين وربطهم بالفروع' },
  { key: 'hr.attendance.manage', module: 'hrm', category: 'other', label: 'سجلات الحضور', description: 'تسجيل ومتابعة حضور وانصراف الموظفين على مستوى HR' },
  { key: 'accounting.access_accounting_module', module: 'accounting', category: 'view', label: 'الوصول للمحاسبة', description: 'الدخول إلى وحدة المحاسبة' },
  { key: 'accounting.manage_accounts', module: 'accounting', category: 'other', label: 'دليل الحسابات', description: 'إنشاء وتعديل حسابات دليل الحسابات' },
  { key: 'accounting.view_journal', module: 'accounting', category: 'view', label: 'عرض قيود اليومية', description: 'استعراض قيود اليومية المحاسبية' },
  { key: 'accounting.add_journal', module: 'accounting', category: 'add', label: 'إضافة قيد يومية', description: 'إنشاء قيود يومية جديدة' },
  { key: 'accounting.edit_journal', module: 'accounting', category: 'edit', label: 'تعديل قيد يومية', description: 'تعديل قيود اليومية المسجلة' },
  { key: 'accounting.delete_journal', module: 'accounting', category: 'delete', label: 'حذف قيد يومية', description: 'حذف قيود اليومية' },
  { key: 'accounting.map_transactions', module: 'accounting', category: 'other', label: 'ربط المبيعات', description: 'ربط فواتير المبيعات بالحسابات المحاسبية' },
  { key: 'accounting.view_transfer', module: 'accounting', category: 'view', label: 'عرض التحويلات', description: 'استعراض التحويلات بين الحسابات' },
  { key: 'accounting.add_transfer', module: 'accounting', category: 'add', label: 'إضافة تحويل', description: 'إنشاء تحويلات بين الحسابات' },
  { key: 'accounting.edit_transfer', module: 'accounting', category: 'edit', label: 'تعديل تحويل', description: 'تعديل التحويلات المحاسبية' },
  { key: 'accounting.delete_transfer', module: 'accounting', category: 'delete', label: 'حذف تحويل', description: 'حذف التحويلات المحاسبية' },
  { key: 'accounting.manage_budget', module: 'accounting', category: 'other', label: 'إدارة الميزانيات', description: 'تعريف ومتابعة الميزانيات' },
  { key: 'accounting.view_reports', module: 'accounting', category: 'view', label: 'تقارير المحاسبة', description: 'عرض ميزان المراجعة والقوائم المالية' },
]

const catalogByKey = new Map(PERMISSIONS.map((p) => [p.key, p]))

export function inferCategory(key: string): PermissionCategory {
  const suffix = key.split('.').slice(1).join('.')
  if (suffix.startsWith('view') || suffix === 'view') return 'view'
  if (suffix.startsWith('add')) return 'add'
  if (suffix.startsWith('edit')) return 'edit'
  if (suffix.startsWith('delete')) return 'delete'
  return 'other'
}

export function inferModule(key: string): string {
  const prefix = key.split('.')[0]
  if (prefix === 'hr') return 'hrm'
  return prefix
}

export function getPermissionDefinition(key: string): PermissionDefinition {
  const existing = catalogByKey.get(key)
  if (existing) return existing

  const module = inferModule(key)
  return {
    key,
    module,
    category: inferCategory(key),
    label: key.replace(/\./g, ' · '),
    description: key,
  }
}

export function getAllPermissions(apiKeys?: string[]): PermissionDefinition[] {
  const keys = apiKeys?.length
    ? [...new Set([...PERMISSIONS.map((p) => p.key), ...apiKeys])]
    : PERMISSIONS.map((p) => p.key)

  return keys.map(getPermissionDefinition)
}

export interface ModuleGroup {
  module: string
  label: string
  permissions: PermissionDefinition[]
  selectedCount: number
  totalCount: number
}

export interface PermissionSection {
  id: string
  label: string
  icon: string
  modules: ModuleGroup[]
  selectedCount: number
  totalCount: number
}

function buildModuleGroups(
  permissions: PermissionDefinition[],
  selected: string[],
): ModuleGroup[] {
  const byModule = new Map<string, PermissionDefinition[]>()

  for (const perm of permissions) {
    const list = byModule.get(perm.module) ?? []
    list.push(perm)
    byModule.set(perm.module, list)
  }

  const moduleOrder = PERMISSION_SECTIONS.flatMap((section) => section.modules)
  const groups: ModuleGroup[] = []

  for (const module of moduleOrder) {
    const perms = byModule.get(module)
    if (!perms?.length) continue
    groups.push({
      module,
      label: MODULE_LABELS[module] ?? module,
      permissions: perms,
      selectedCount: perms.filter((p) => selected.includes(p.key)).length,
      totalCount: perms.length,
    })
    byModule.delete(module)
  }

  for (const [module, perms] of byModule) {
    groups.push({
      module,
      label: MODULE_LABELS[module] ?? module,
      permissions: perms,
      selectedCount: perms.filter((p) => selected.includes(p.key)).length,
      totalCount: perms.length,
    })
  }

  return groups
}

export function groupPermissionsByModule(
  permissions: PermissionDefinition[],
  selected: string[],
): ModuleGroup[] {
  return buildModuleGroups(permissions, selected)
}

export function groupPermissionsBySection(
  permissions: PermissionDefinition[],
  selected: string[],
): PermissionSection[] {
  const moduleGroups = buildModuleGroups(permissions, selected)
  const byModule = new Map(moduleGroups.map((group) => [group.module, group]))
  const sections: PermissionSection[] = []

  for (const section of PERMISSION_SECTIONS) {
    const modules = section.modules
      .map((module) => byModule.get(module))
      .filter((group): group is ModuleGroup => Boolean(group))

    if (modules.length === 0) continue

    sections.push({
      id: section.id,
      label: section.label,
      icon: section.icon,
      modules,
      selectedCount: modules.reduce((sum, mod) => sum + mod.selectedCount, 0),
      totalCount: modules.reduce((sum, mod) => sum + mod.totalCount, 0),
    })

    for (const mod of modules) {
      byModule.delete(mod.module)
    }
  }

  if (byModule.size > 0) {
    const orphanModules = [...byModule.values()]
    sections.push({
      id: 'other',
      label: 'أخرى',
      icon: 'extension',
      modules: orphanModules,
      selectedCount: orphanModules.reduce((sum, mod) => sum + mod.selectedCount, 0),
      totalCount: orphanModules.reduce((sum, mod) => sum + mod.totalCount, 0),
    })
  }

  return sections
}

export function groupPermissionsByCategory(
  permissions: PermissionDefinition[],
): Record<PermissionCategory, PermissionDefinition[]> {
  const groups: Record<PermissionCategory, PermissionDefinition[]> = {
    view: [],
    add: [],
    edit: [],
    delete: [],
    other: [],
  }

  for (const perm of permissions) {
    groups[perm.category].push(perm)
  }

  return groups
}

export function searchPermissions(
  permissions: PermissionDefinition[],
  query: string,
): PermissionDefinition[] {
  const q = query.trim().toLowerCase()
  if (!q) return permissions

  return permissions.filter(
    (p) =>
      p.label.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q),
  )
}

export const CATEGORY_ORDER: PermissionCategory[] = ['view', 'add', 'edit', 'delete', 'other']
