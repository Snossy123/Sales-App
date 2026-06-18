export type ActivityAction = 'create' | 'update' | 'delete' | 'login' | 'other'

const DESCRIPTIONS: Record<string, string> = {
  'Organization provisioned': 'تم تهيئة المؤسسة',
  'User roles synced': 'تم مزامنة أدوار المستخدم',
  'Demo data seeded': 'تم تحميل بيانات العرض',
  'User created': 'تم إنشاء مستخدم',
  'User updated': 'تم تحديث مستخدم',
  'Role created': 'تم إنشاء دور',
  'Role updated': 'تم تحديث دور',
  'Organization settings updated': 'تم تحديث إعدادات المؤسسة',
}

const LOG_NAMES: Record<string, string> = {
  admin: 'إدارة',
  default: 'افتراضي',
  sales: 'مبيعات',
  crm: 'علاقات العملاء',
  hrm: 'موارد بشرية',
  accounting: 'محاسبة',
}

export const ACTION_LABELS: Record<ActivityAction, string> = {
  create: 'إنشاء',
  update: 'تحديث',
  delete: 'حذف',
  login: 'دخول',
  other: 'أخرى',
}

export function translateActivityDescription(description: string): string {
  return DESCRIPTIONS[description] ?? description
}

export function translateLogName(logName?: string | null): string {
  if (!logName) return '—'
  return LOG_NAMES[logName] ?? logName
}

export function translateEvent(event?: string | null): string {
  if (!event) return '—'
  const map: Record<string, string> = {
    created: 'إنشاء',
    updated: 'تحديث',
    deleted: 'حذف',
  }
  return map[event] ?? event
}

export function inferActivityAction(description: string, event?: string | null): ActivityAction {
  if (event === 'created') return 'create'
  if (event === 'updated') return 'update'
  if (event === 'deleted') return 'delete'

  const lower = description.toLowerCase()
  if (lower.includes('logged in') || lower.includes('login')) return 'login'
  if (lower.includes('created') || lower.includes('provisioned') || lower.includes('seeded')) return 'create'
  if (lower.includes('updated') || lower.includes('synced')) return 'update'
  if (lower.includes('deleted') || lower.includes('removed')) return 'delete'
  return 'other'
}

export function getActionLabel(description: string, event?: string | null): string {
  return ACTION_LABELS[inferActivityAction(description, event)]
}

const SUBJECT_ROUTE_BUILDERS: Record<string, (id: number) => string> = {
  'App\\Models\\Customer': (id) => `/customers/${id}`,
  'App\\Models\\SalesInvoice': (id) => `/invoices?id=${id}`,
  'App\\Models\\PaymentTransaction': (id) => `/payments?highlight=${id}`,
  'App\\Models\\InstallmentItem': (id) => `/installments?item=${id}`,
  'App\\Models\\InstallmentReconciliation': (id) => `/installments?reconciliation=${id}`,
}

const SUBJECT_LABELS: Record<string, string> = {
  'App\\Models\\Customer': 'عميل',
  'App\\Models\\SalesInvoice': 'عقد / فاتورة',
  'App\\Models\\PaymentTransaction': 'عملية دفع',
  'App\\Models\\InstallmentItem': 'قسط',
  'App\\Models\\InstallmentReconciliation': 'تصالح',
}

export function getActivitySubjectRoute(subjectType?: string | null, subjectId?: number | null): string | null {
  if (!subjectType || subjectId == null) return null
  const builder = SUBJECT_ROUTE_BUILDERS[subjectType]
  return builder ? builder(subjectId) : null
}

export function getActivitySubjectLabel(subjectType?: string | null): string {
  if (!subjectType) return '—'
  return SUBJECT_LABELS[subjectType] ?? subjectType.split('\\').pop() ?? subjectType
}
