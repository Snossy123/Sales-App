import type { GeneralSettings, MessagingSettings, SalesSettings, SecuritySettings } from '../../../api/types'

export type SettingsTab = 'branding' | 'regional' | 'sales' | 'security' | 'messaging' | 'modules'

export const SETTINGS_TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'branding', label: 'الهوية والعلامة', icon: 'badge' },
  { id: 'regional', label: 'الإقليم والتنسيق', icon: 'language' },
  { id: 'sales', label: 'المبيعات والتقسيط', icon: 'point_of_sale' },
  { id: 'messaging', label: 'رسائل واتساب', icon: 'chat' },
  { id: 'security', label: 'الأمان والجلسات', icon: 'shield' },
  { id: 'modules', label: 'الوحدات', icon: 'widgets' },
]

export const DEFAULT_GENERAL: GeneralSettings = {
  logo_url: null,
  theme_color: '#2563eb',
  website: null,
  tax_number: null,
  commercial_register: null,
  currency: 'EGP',
  timezone: 'Africa/Cairo',
  default_locale: 'ar',
  date_format: 'Y/m/d',
  time_format: '12h',
  fiscal_year_start_month: 1,
}

export const DEFAULT_SALES: SalesSettings = {
  invoice_prefix: 'INV',
  require_invoice_review: true,
  review_installment_order: 'after_installments',
  block_contract_on_review: false,
  allow_negative_inventory: false,
  default_payment_term: 'installment',
  max_installment_months: 24,
  installment_interval_days: 30,
  overdue_grace_days: 3,
  late_fee_mode: 'daily_fixed',
  late_fee_daily_amount: 10,
  late_fee_percent: 0,
  min_down_payment_percent: 10,
  enable_installation_fee: true,
  default_installation_fee: 500,
  allow_disable_installation_fee_in_sale: true,
}

export const DEFAULT_SECURITY: SecuritySettings = {
  session_timeout_minutes: 480,
  password_min_length: 8,
  force_password_change_on_first_login: false,
  audit_log_retention_days: 365,
  log_ip_addresses: true,
}

export const DEFAULT_MESSAGING: MessagingSettings = {
  whatsapp_enabled: false,
  reminder_days_before: 1,
  send_contract_welcome: true,
  send_contract_approved: true,
  send_installment_reminder: true,
  send_installment_paid: true,
  templates: {
    contract_welcome:
      'مرحباً {customer_name}،\nتم تسجيل تعاقدكم رقم {invoice_number} بإجمالي {total} ج.م.\n{review_note}\n{org_name}',
    contract_approved:
      'عزيزي {customer_name}،\nتم اعتماد تعاقدكم رقم {invoice_number}.\nالمقدم: {down_payment} ج.م\nعدد الأقساط: {installment_count}\nقيمة القسط: {installment_amount} ج.م\nأول استحقاق: {due_date}',
    installment_reminder:
      'تذكير: قسط مستحق لـ {customer_name}\nفاتورة {invoice_number}\nالمبلغ: {installment_amount} ج.م\nتاريخ الاستحقاق: {due_date}',
    installment_paid:
      'شكراً {customer_name}،\nتم استلام {paid_amount} ج.م لفاتورة {invoice_number}.\n{next_installment_note}',
  },
}

export const MESSAGING_PLACEHOLDERS =
  '{customer_name}, {invoice_number}, {total}, {down_payment}, {installment_amount}, {installment_count}, {due_date}, {paid_amount}, {next_installment_note}, {org_name}, {org_phone}'

export const CURRENCY_OPTIONS = [
  { value: 'EGP', label: 'جنيه مصري (EGP)' },
  { value: 'SAR', label: 'ريال سعودي (SAR)' },
  { value: 'AED', label: 'درهم إماراتي (AED)' },
  { value: 'USD', label: 'دولار أمريكي (USD)' },
]

export const TIMEZONE_OPTIONS = [
  { value: 'Africa/Cairo', label: 'القاهرة (Africa/Cairo)' },
  { value: 'Asia/Riyadh', label: 'الرياض (Asia/Riyadh)' },
  { value: 'Asia/Dubai', label: 'دبي (Asia/Dubai)' },
  { value: 'UTC', label: 'UTC' },
]

export const PAYMENT_TERM_OPTIONS = [
  { value: 'cash', label: 'نقدي' },
  { value: 'credit', label: 'آجل' },
  { value: 'installment', label: 'تقسيط' },
]

export interface ModuleDefinition {
  key: string
  label: string
  description: string
  settingsPath?: string
  alwaysOn?: boolean
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key: 'sales',
    label: 'المبيعات الأساسية',
    description: 'نقطة البيع، الفواتير، الأقساط، والعملاء',
    alwaysOn: true,
  },
  {
    key: 'crm',
    label: 'قسم المبيعات',
    description: 'العملاء المحتملون، الحملات، والعروض',
    settingsPath: '/crm/settings',
  },
  {
    key: 'hrm',
    label: 'الموارد البشرية',
    description: 'الموظفون، الحضور، الإجازات، والرواتب',
    settingsPath: '/hrm/settings',
  },
  {
    key: 'accounting',
    label: 'المحاسبة',
    description: 'دليل الحسابات، القيود، والتقارير المالية',
    settingsPath: '/accounting/settings',
  },
]

export function mergeSettings<T extends object>(defaults: T, partial?: Partial<T>): T {
  return { ...defaults, ...partial }
}
