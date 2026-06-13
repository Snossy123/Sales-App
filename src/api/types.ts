export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface Department {
  id: number
  name: string
  name_ar?: string | null
  code: string
  is_active?: boolean
  department_stock?: DepartmentStock
}

export interface DepartmentStock {
  department_id: number
  quantity: number
  pending: number
  distributed?: number
}

export interface InventoryOverviewRow {
  row_type: 'department_pending' | 'branch'
  department_id: number
  department_name_ar: string
  branch_id?: number
  branch_name_ar?: string
  quantity: number
  reserved: number
  sold: number
  pending?: number
}

export interface Branch {
  id: number
  department_id?: number
  name: string
  name_ar?: string | null
  code: string
  address?: string | null
  phone?: string | null
  is_active?: boolean
  department?: Department
  warehouses?: Warehouse[]
}

export interface Warehouse {
  id: number
  branch_id: number
  name: string
  name_ar?: string | null
  code: string
  is_active?: boolean
  branch?: Branch
}

export interface Role {
  id: number
  name: string
}

export type DemoRole =
  | 'super_admin'
  | 'admin'
  | 'sales'
  | 'reviewer'
  | 'collector'
  | 'crm'
  | 'hr_manager'
  | 'accountant'
export type UserSection = 'sales' | 'review' | 'collection'

export interface AuthUser {
  id: number
  name: string
  email: string
  organization_id: number
  department_id?: number | null
  branch_id?: number | null
  branch?: Branch | null
  organization?: { id: number; name: string; name_ar?: string }
  roles?: Role[]
  demo_role?: DemoRole
  section?: UserSection
}

export interface LoginResponse {
  token: string
  token_type: string
  user: AuthUser
}

export interface DashboardStats {
  sales_today: number
  invoices_today: number
  customers_count: number
  available_units: number
  pending_reviews?: number
  overdue_installments: number
  due_this_week: number
  outstanding_balance: number
}

export interface GpsProduct {
  id: number
  name: string
  name_ar?: string | null
  brand?: string | null
  model_code?: string | null
  sell_price: number
  cost_price?: number | null
}

export interface GpsStock {
  id: number
  warehouse_id: number
  branch_id: number
  quantity: number
  reserved: number
  sold: number
  product?: GpsProduct
  warehouse?: Warehouse
  available?: number
}

export interface ProductModel {
  id: number
  name: string
  name_ar?: string | null
  brand?: string | null
}

export interface ProductUnit {
  id: number
  product_model_id: number
  warehouse_id: number
  imei: string
  serial_number?: string | null
  state: string
  cost_price?: string | number | null
  sell_price?: string | number | null
  notes?: string | null
  product_model?: ProductModel
  warehouse?: Warehouse
}

export interface Customer {
  id: number
  branch_id?: number | null
  name: string
  phone: string
  national_id?: string | null
  address?: string | null
  city?: string | null
  status: string
  credit_score?: number | null
  notes?: string | null
  branch?: Branch
  guarantors?: Guarantor[]
  sales_invoices?: SalesInvoice[]
}

export interface Guarantor {
  id: number
  name: string
  phone: string
  relationship?: string | null
}

export interface InstallmentItem {
  id: number
  sales_invoice_id?: number
  installment_plan_id?: number
  installment_number: number
  due_date: string
  amount: string | number
  paid_amount: string | number
  status: string
  customer_name?: string
  customer_phone?: string
  invoice_number?: string
  remaining?: number
}

export interface InstallmentPlan {
  id: number
  down_payment: string | number
  installment_count: number
  interval_days?: number
  first_due_date?: string
  status?: string
  items?: InstallmentItem[]
}

export type InvoiceStatus = 'pending_review' | 'confirmed' | 'rejected'

export interface SalesInvoice {
  id: number
  invoice_number?: string
  invoice_date: string
  branch_id?: number
  warehouse_id?: number
  total: string | number
  paid_amount?: string | number
  balance_due: string | number
  payment_term: string
  payment_status: string
  status?: InvoiceStatus | string
  customer_id: number
  customer?: Customer
  branch?: Branch
  installment_plan?: InstallmentPlan | null
  lines?: SalesInvoiceLine[]
  notes?: string | null
  is_order_request?: boolean
  created_by?: number
  reviewed_by?: number
  reviewed_at?: string
  confirmed_at?: string
  rejection_reason?: string
}

export interface SalesInvoiceLine {
  id: number
  product_id?: number
  product_unit_id?: number
  quantity?: number
  unit_price: string | number
  product_name_ar?: string | null
  product_unit?: ProductUnit
}

export interface Employee {
  id: number
  employee_code: string
  name: string
  phone?: string | null
  job_title?: string | null
  salary?: string | number | null
  hire_date?: string | null
  status: string
  branch_id?: number | null
  department_id?: number | null
  user_id?: number | null
  branch?: Branch
  department?: { id: number; name: string; name_ar?: string }
  user?: { id: number; name: string; email?: string }
}

export interface Lead {
  id: number
  name: string
  phone: string
  source?: string | null
  status: string
  expected_value?: string | number | null
  notes?: string | null
  converted_on?: string | null
  converted_customer_id?: number | null
  branch?: Branch
  assignee?: { id: number; name: string }
}

export interface CheckoutPayload {
  customer_id: number
  warehouse_id: number
  branch_id?: number
  payment_term: 'cash' | 'credit' | 'installment'
  discount_amount?: number
  invoice_date?: string
  notes?: string
  lines: {
    product_unit_id?: number
    product_id?: number
    quantity?: number
    unit_price?: number
    discount?: number
  }[]
  installment_plan?: {
    down_payment: number
    installment_count: number
    interval_days?: number
    first_due_date: string
  }
}

export interface CollectInstallmentPayload {
  installment_item_id: number
  amount: number
}

// CRM module
export interface CrmDashboardStats {
  leads_by_status: Record<string, number>
  today_follow_ups: number
  converted_this_month: number
  conversion_rate: number
  organization_id?: number
}

export interface CrmSchedule {
  id: number
  organization_id?: number
  lead_id?: number | null
  customer_id?: number | null
  title: string
  status: string
  start_datetime?: string | null
  end_datetime?: string | null
  description?: string | null
  schedule_type?: 'call' | 'sms' | 'meeting' | 'email' | string
  followup_category_id?: number | null
  allow_notification?: boolean
  notify_via?: { sms?: number; mail?: number }
  notify_before?: number | null
  notify_type?: string | null
  created_by?: number
  is_recursive?: boolean
  recursion_days?: number | null
  lead?: Lead
  customer?: Customer
  users?: { id: number; name: string }[]
  logs?: CrmScheduleLog[]
}

export interface CrmScheduleLog {
  id: number
  crm_schedule_id: number
  log_type: string
  start_datetime: string
  end_datetime?: string | null
  subject?: string | null
  description?: string | null
  created_by?: number
}

export interface CrmCampaign {
  id: number
  organization_id?: number
  name: string
  campaign_type: 'sms' | 'email' | string
  subject?: string | null
  email_body?: string | null
  sms_body?: string | null
  sent_on?: string | null
  contact_ids?: number[]
  created_by?: number
  created_at?: string
}

export interface CrmProposal {
  id: number
  organization_id?: number
  customer_id?: number | null
  lead_id?: number | null
  subject: string
  body: string
  cc?: string | null
  bcc?: string | null
  sent_by?: number
  created_at?: string
  customer?: Customer
  lead?: Lead
}

export interface CrmProposalTemplate {
  id: number
  organization_id?: number
  subject: string
  body: string
  cc?: string | null
  bcc?: string | null
  created_by?: number
  created_at?: string
}

export interface CrmSettings {
  enable_order_request?: boolean
  order_request_prefix?: string
}

export interface CrmActivity {
  id: number
  lead_id?: number | null
  type: string
  subject?: string | null
  description?: string | null
  lead?: Lead
  user?: { id: number; name: string }
}

export interface CrmCallLog {
  id: number
  mobile_number?: string | null
  mobile_name?: string | null
  call_type?: string | null
  duration?: number | null
  lead?: Lead
  user?: { id: number; name: string }
}

export interface CrmMarketplace {
  id: number
  marketplace: string
  site_key?: string | null
  site_id?: string | null
}

export interface CrmReportRow {
  name?: string
  contact_name?: string
  total: number
}

export interface CrmLeadConversionReport {
  from: string
  to: string
  total_converted: number
  conversions: Lead[]
}

export interface PortalUser {
  id: number
  name: string
  email: string
  customer_id?: number | null
  customer?: Customer
}

export interface PortalLoginResponse {
  token: string
  user: PortalUser
}

export interface PortalDashboardData {
  recent_invoices: SalesInvoice[]
  total_balance_due: number | string
}

export type AccountPrimaryType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export interface AccountingAccountType {
  id: number
  name: string
  account_primary_type?: string | null
  account_type?: string | null
  parent_id?: number | null
}

export interface AccountingAccount {
  id: number
  name: string
  gl_code?: string | null
  account_primary_type: AccountPrimaryType
  account_sub_type_id?: number | null
  detail_type_id?: number | null
  parent_account_id?: number | null
  description?: string | null
  status: 'active' | 'inactive'
  account_sub_type?: AccountingAccountType | null
  detail_type?: AccountingAccountType | null
  parent_account?: AccountingAccount | null
  child_accounts?: AccountingAccount[]
}

export interface AccountingTransactionLine {
  id: number
  accounting_account_id: number
  acc_trans_mapping_id?: number
  amount: string | number
  type: 'debit' | 'credit'
  note?: string | null
  operation_date?: string
  map_type?: string | null
  account?: AccountingAccount
}

export interface AccountingAccTransMapping {
  id: number
  ref_no?: string | null
  type: 'journal_entry' | 'transfer' | string
  operation_date: string
  note?: string | null
  created_by?: number
  lines?: AccountingTransactionLine[]
}

export interface AccountingDashboard {
  balances_by_type: Record<string, number>
  total_accounts: number
  journal_entries_count: number
  transfers_count: number
  unmapped_sales: number
  recent_entries: AccountingAccTransMapping[]
}

export interface TrialBalanceRow {
  id: number
  name: string
  gl_code?: string | null
  account_primary_type: AccountPrimaryType
  total_debits: string | number
  total_credits: string | number
  balance: string | number
}

export interface TrialBalanceReport {
  start_date?: string | null
  end_date?: string | null
  accounts: TrialBalanceRow[]
  total_debits: number
  total_credits: number
}

export interface BalanceSheetReport {
  as_of_date: string
  assets: number
  liabilities: number
  equity: number
  liabilities_and_equity: number
  balanced: boolean
}

export interface IncomeStatementLine {
  id: number
  name: string
  gl_code?: string | null
  account_primary_type: AccountPrimaryType
  balance: string | number
}

export interface IncomeStatementReport {
  start_date?: string | null
  end_date?: string | null
  total_income: number
  total_expenses: number
  net_profit: number
  lines: IncomeStatementLine[]
}

export interface ArAgeingContactRow {
  contact_id?: number
  name: string
  '<1': number
  '1_30': number
  '31_60': number
  '61_90': number
  '>90': number
  total_due: number
}

export interface AccountingBudget {
  id: number
  accounting_account_id: number
  financial_year: number
  jan: string | number
  feb: string | number
  mar: string | number
  apr: string | number
  may: string | number
  jun: string | number
  jul: string | number
  aug: string | number
  sep: string | number
  oct: string | number
  nov: string | number
  dec: string | number
  quarter_1: string | number
  quarter_2: string | number
  quarter_3: string | number
  quarter_4: string | number
  yearly: string | number
  account?: AccountingAccount
}

export interface BranchAccountingMap {
  sale?: { deposit_to?: number | null; payment_account?: number | null }
  sell_payment?: { deposit_to?: number | null; payment_account?: number | null }
}

export interface AccountingSettings {
  module_settings: {
    journal_entry_prefix?: string
    transfer_prefix?: string
  }
  branches: Array<{
    id: number
    name: string
    code: string
    accounting_default_map?: BranchAccountingMap | null
  }>
  accounts: Array<Pick<AccountingAccount, 'id' | 'name' | 'gl_code' | 'account_primary_type'>>
}

export interface TransactionMapPayload {
  accounts: Array<Pick<AccountingAccount, 'id' | 'name' | 'gl_code' | 'account_primary_type'>>
  invoice?: SalesInvoice
  existing_map?: AccountingTransactionLine[]
}

// HRM module
export interface HrmDashboard {
  present_today: number
  clocked_in_now: number
  pending_leaves: number
  upcoming_leaves: HrmLeave[]
  employees_by_department: Record<string, number>
  payroll_due_total: number
  organization_id?: number
}

export interface HrmLeaveType {
  id: number
  leave_type: string
  max_leave_count?: number | null
  leave_count_interval?: 'year' | 'month' | string | null
}

export interface HrmLeave {
  id: number
  hrm_leave_type_id: number
  employee_id: number
  start_date: string
  end_date: string
  ref_no?: string | null
  status: string
  reason?: string | null
  status_note?: string | null
  changed_by?: number | null
  leaveType?: HrmLeaveType
  employee?: Employee
  changedBy?: { id: number; name: string }
}

export interface HrmAttendance {
  id: number
  employee_id: number
  date: string
  check_in?: string | null
  check_out?: string | null
  status?: string | null
  notes?: string | null
  clock_in_time?: string | null
  clock_out_time?: string | null
  hrm_shift_id?: number | null
  employee?: Employee
  shift?: HrmShift
}

export interface HrmShift {
  id: number
  name: string
  type?: 'fixed_shift' | 'flexible_shift' | string | null
  start_time?: string | null
  end_time?: string | null
  holidays?: string[] | null
  is_allowed_auto_clockout?: boolean
  auto_clockout_time?: string | null
  userShifts?: HrmUserShift[]
}

export interface HrmUserShift {
  id: number
  employee_id: number
  hrm_shift_id: number
  start_date: string
  end_date?: string | null
  employee?: Employee
}

export interface HrmHoliday {
  id: number
  name: string
  start_date: string
  end_date: string
  branch_id?: number | null
  note?: string | null
  branch?: Branch
}

export interface HrmPayrollRecord {
  id: number
  employee_id: number
  branch_id?: number | null
  ref_no?: string | null
  duration: string | number
  duration_unit?: string | null
  rate: string | number
  allowances?: Record<string, unknown>[] | null
  deductions?: Record<string, unknown>[] | null
  gross_total: string | number
  final_total: string | number
  payment_status: string
  created_by?: number | null
  employee?: Employee
  branch?: Branch
  creator?: { id: number; name: string }
}

export interface HrmAllowance {
  id: number
  description: string
  type: 'allowance' | 'deduction' | string
  amount: string | number
  amount_type?: 'fixed' | 'percent' | string
  applicable_date?: string | null
  employees?: Employee[]
}

export interface HrmPayrollGroup {
  id: number
  name: string
  branch_id?: number | null
  status: string
  payment_status?: string
  gross_total?: string | number
  payrollRecords?: HrmPayrollRecord[]
  branch?: Branch
  creator?: { id: number; name: string }
}

export interface AdminUser extends AuthUser {
  branch_id?: number | null
  roles?: (Role & { name: string })[]
}

export interface AdminRole {
  id: number
  name: string
  permissions?: { id: number; name: string }[]
  permissions_count?: number
}

export type PermissionGroups = Record<string, string[]>

export interface ActivityLogEntry {
  id: number
  log_name?: string | null
  description: string
  event?: string | null
  created_at?: string
  causer?: { id: number; name: string; email?: string }
  subject_type?: string | null
  subject_id?: number | null
  properties?: Record<string, unknown>
}

export interface OrganizationProfile {
  id: number
  name: string
  name_ar?: string | null
  code?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  enabled_modules?: string[]
  is_active?: boolean
}

export interface OrganizationSettings {
  organization: OrganizationProfile
  module_settings?: {
    crm?: CrmSettings
    hrm?: HrmSettings
    accounting?: Record<string, unknown>
  }
}

export interface HrmSettings {
  grace_before_checkin?: number
  grace_after_checkin?: number
  grace_before_checkout?: number
  grace_after_checkout?: number
  payroll_ref_no_prefix?: string
}
