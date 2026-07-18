export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface Administration {
  id: number
  name: string
  name_ar?: string | null
  code: string
  address?: string | null
  phone?: string | null
  is_active?: boolean
  department_stock?: DepartmentStock
  deletion_blockers?: AdministrationDeletionBlockers
}

export interface AdministrationDeletionBlockers {
  branch_count: number
  central_inventory_total: number
  central_inventory_clearable: number
  central_inventory_locked: number
}

/** Branch-level organizational unit (قسم) — maps to backend `departments` table. */
export interface Section {
  id: number
  branch_id?: number | null
  name: string
  name_ar?: string | null
  code: string
  branch?: Branch
}

export interface Department {
  id: number
  name: string
  name_ar?: string | null
  code: string
  address?: string | null
  phone?: string | null
  is_active?: boolean
  department_stock?: DepartmentStock
}

export interface DepartmentStock {
  department_id: number
  quantity: number
  pending: number
  distributed?: number
}

export interface StockReceipt {
  id: number
  administration_id: number
  warehouse_id: number
  product_model_id: number
  quantity: number
  received_by?: number | null
  notes?: string | null
  created_at?: string
  administration?: Administration
  received_by_user?: { id: number; name: string }
  receivedBy?: { id: number; name: string }
}

export interface StockTransfer {
  id: number
  transfer_number: string
  from_warehouse_id: number
  to_warehouse_id: number
  status: string
  transfer_kind?: string
  requested_by?: number | null
  completed_at?: string | null
  notes?: string | null
  created_at?: string
  from_warehouse?: Warehouse
  to_warehouse?: Warehouse
  requester?: { id: number; name: string }
  lines?: Array<{ id: number; product_unit_id: number }>
}

export interface DeviceMovementLine {
  id: number
  product_unit_id: number
  previous_state?: string | null
  product_unit?: ProductUnit
}

export interface DeviceMovement {
  id: number
  movement_number: string
  from_warehouse_id: number
  to_warehouse_id: number
  sender_user_id: number
  recipient_user_id: number
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | string
  notes?: string | null
  rejection_reason?: string | null
  confirmed_at?: string | null
  rejected_at?: string | null
  created_at?: string
  lines_count?: number
  from_warehouse?: Warehouse & { branch?: Branch }
  to_warehouse?: Warehouse & { branch?: Branch }
  sender?: { id: number; name: string }
  recipient?: { id: number; name: string }
  confirmer?: { id: number; name: string }
  lines?: DeviceMovementLine[]
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
  administration_id?: number
  /** @deprecated Use administration_id */
  department_id?: number
  name: string
  name_ar?: string | null
  code: string
  address?: string | null
  phone?: string | null
  is_active?: boolean
  administration?: Administration
  /** @deprecated Use administration */
  department?: Department
  warehouses?: Warehouse[]
}

export interface Warehouse {
  id: number
  branch_id?: number | null
  administration_id?: number | null
  name: string
  name_ar?: string | null
  code: string
  is_active?: boolean
  is_central?: boolean
  branch?: Branch
  administration?: Administration
}

export interface Role {
  id: number
  name: string
  name_ar?: string | null
}

export type DemoRole =
  | 'super_admin'
  | 'admin'
  | 'sales'
  | 'reviewer'
  | 'collector'
  | 'call_center'
  | 'crm'
  | 'hr_manager'
  | 'accountant'
  | 'support'
export type UserSection = 'sales' | 'review' | 'collection'

export type SupportTaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface SupportTask {
  id: number
  sales_invoice_id: number
  sales_invoice_line_id?: number | null
  customer_id?: number | null
  employee_id?: number | null
  status: SupportTaskStatus
  scheduled_at?: string | null
  completed_at?: string | null
  executed_at?: string | null
  notes?: string | null
  created_at?: string | null
  employee_name?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  invoice_number?: string | null
  serial_number?: string | null
  vehicle_info?: string | null
  vehicle_type?: string | null
}

export type ServiceEvaluationAnswerType = 'text' | 'rating' | 'yes_no'

export type ServiceEvaluationRequestStatus = 'pending' | 'completed' | 'unreachable'

export interface ServiceEvaluationQuestion {
  id: number
  question_ar: string
  answer_type: ServiceEvaluationAnswerType
  sort_order?: number
  is_active?: boolean
}

export interface ServiceEvaluationAnswer {
  id?: number
  service_evaluation_question_id: number
  answer_text?: string | null
  answer_rating?: number | null
  question_ar?: string | null
  answer_type?: ServiceEvaluationAnswerType
}

export interface ServiceEvaluationRequest {
  id: number
  support_task_id: number
  sales_invoice_id: number
  sales_invoice_line_id?: number | null
  customer_id: number
  executed_at?: string | null
  status: ServiceEvaluationRequestStatus
  overall_rating?: number | null
  notes?: string | null
  completed_at?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  invoice_number?: string | null
  vehicle_info?: string | null
  serial_number?: string | null
  technician_name?: string | null
  recorded_by_name?: string | null
  answers?: ServiceEvaluationAnswer[]
  call_log?: {
    id: number
    mobile_number?: string | null
    mobile_name?: string | null
    duration?: number | null
    start_time?: string | null
    audio_url?: string | null
  } | null
}

export type SubscriptionRenewalStatus = 'overdue' | 'due_soon' | 'upcoming'

export interface SubscriptionRenewalQueueItem {
  id: number
  sales_invoice_id: number
  customer_id?: number | null
  invoice_number?: string | null
  subscription_renewal_date?: string | null
  days_until_renewal?: number | null
  renewal_status?: SubscriptionRenewalStatus | null
  renewal_type?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  customer_phone_2?: string | null
  serial_number?: string | null
  sim_number?: string | null
  username?: string | null
  vehicle_type?: string | null
  vehicle_plate_letters?: string | null
  vehicle_plate_numbers?: string | null
  chassis_number?: string | null
  engine_number?: string | null
  vehicle_info?: string | null
  branch_name?: string | null
  confirmed_at?: string | null
}

export type SubscriptionRenewalCandidate = SubscriptionRenewalQueueItem

export interface AuthUser {
  id: number
  name: string
  email: string
  organization_id: number
  administration_id?: number | null
  /** @deprecated Use administration_id */
  department_id?: number | null
  branch_id?: number | null
  section_id?: number | null
  administration?: Administration | null
  branch?: Branch | null
  section?: Section | null
  organization?: { id: number; name: string; name_ar?: string }
  roles?: Role[]
  permissions?: string[]
  data_scope?: 'organization' | 'administration' | 'branches' | 'branch' | 'none'
  data_scope_label?: string | null
  allowed_branch_ids?: number[]
  active_branch_id?: number | null
  branches?: Branch[]
  preferences?: UserPreferences
  demo_role?: DemoRole
  workflow_section?: UserSection
}

export interface UserPreferences {
  tours?: Partial<Record<string, boolean>>
  active_branch_id?: number | null
}

export interface LoginResponse {
  token: string
  token_type: string
  user: AuthUser
}

export interface DashboardStats {
  period?: string
  branch_id?: number | null
  sales_today: number
  invoices_today: number
  customers_count: number
  available_units: number
  pending_reviews?: number
  overdue_installments: number
  due_this_week: number
  outstanding_balance: number
  recent_invoices?: DashboardInvoiceSummary[]
  overdue_installments_list?: DashboardInstallmentSummary[]
  pending_review_invoices?: DashboardInvoiceSummary[]
}

export interface DashboardInvoiceSummary {
  id: number
  invoice_number?: string
  invoice_date: string
  total: string | number
  status: string
  payment_term?: string
  customer?: { id: number; name: string; phone?: string }
  lines?: Array<{ id?: number }>
}

export interface DashboardInstallmentSummary {
  id: number
  due_date: string
  amount: string | number
  paid_amount: string | number
  status: string
  remaining?: number
  installment_number?: number
  installment_count?: number
  days_overdue?: number
  customer_name?: string
  customer_phone?: string
  invoice_number?: string
  sales_invoice_id?: number
  sales_invoice?: {
    id: number
    invoice_number?: string
    customer?: { id: number; name: string; phone?: string }
  }
}

export interface GpsProduct {
  id: number
  name: string
  name_ar?: string | null
  brand?: string | null
  model_code?: string | null
  sell_price: number
  cash_price: number
  installment_price: number
  cash_annual_price?: number
  cash_permanent_price?: number
  installment_annual_price?: number
  installment_permanent_price?: number
  annual_renewal_price?: number
  external_cash_annual_price?: number
  external_cash_permanent_price?: number
  external_installment_annual_price?: number
  external_installment_permanent_price?: number
  device_debt_price?: number
  monthly_interest_amount?: number
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
  model_code?: string | null
  kind?: 'device' | 'accessory' | string
  sell_price?: number | string
  cost_price?: number | string | null
  is_active?: boolean
  product_category_id?: number | null
  warehouse_stocks?: AccessoryWarehouseStock[]
}

export interface AccessoryWarehouseStock {
  id: number
  organization_id?: number
  warehouse_id: number
  product_model_id: number
  quantity: number
  reserved: number
  available?: number
  product_model?: ProductModel
  warehouse?: Warehouse
}

export interface AccessoryPackageItem {
  id?: number
  accessory_package_id?: number
  product_model_id: number
  quantity: number
  product_model?: ProductModel
}

export interface AccessoryPackage {
  id: number
  name_ar: string
  name?: string | null
  sell_price: number | string
  cost_price?: number | string | null
  is_active: boolean
  items?: AccessoryPackageItem[]
}

export interface AccessoryCheckoutPayload {
  customer_id: number
  distributor_id?: number
  sales_user_id?: number
  branch_id?: number
  warehouse_id: number
  invoice_date?: string
  notes?: string
  distributor_balance_amount?: number
  lines: {
    line_type: 'accessory' | 'package'
    product_model_id?: number
    accessory_package_id?: number
    description?: string
    quantity: number
    unit_price?: number
    payment_term?: 'cash' | 'installment'
    cash_schedule?: 'immediate' | 'month_1' | 'month_2' | 'month_3'
    down_payment?: number
  }[]
}

export interface ProductUnit {
  id: number
  product_model_id: number
  warehouse_id: number
  imei: string
  serial_number?: string | null
  state: string
  inventory_bucket?: string | null
  custody_employee_id?: number | null
  custody_employee?: { id: number; name: string } | null
  cost_price?: string | number | null
  sell_price?: string | number | null
  notes?: string | null
  product_model?: ProductModel
  warehouse?: Warehouse
}

export interface Customer {
  id: number
  branch_id?: number | null
  distributor_id?: number | null
  sales_user_id?: number | null
  acquisition_source?: 'customer_referral' | 'social' | null
  referred_by_customer_id?: number | null
  name: string
  phone: string
  phone_label?: string | null
  phone_2?: string | null
  phone_2_label?: string | null
  phone_3?: string | null
  phone_3_label?: string | null
  extra_phones?: { number: string; label?: string | null }[] | null
  sim_number?: string | null
  username?: string | null
  device_serial?: string | null
  national_id?: string | null
  address?: string | null
  distinctive_mark?: string | null
  city?: string | null
  status: string
  credit_score?: number | null
  notes?: string | null
  profile_photo_url?: string | null
  branch?: Branch
  distributor?: Distributor
  distributor_profile?: Distributor | null
  sales_user?: { id: number; name: string; branch_id?: number | null }
  referred_by_customer?: Pick<Customer, 'id' | 'name' | 'phone'> | null
  guarantors?: Guarantor[]
  media?: MediaFile[]
  sales_invoices?: SalesInvoice[]
  ownership_transfers_from?: OwnershipTransfer[]
  ownership_transfers_to?: OwnershipTransfer[]
}

export interface OwnershipTransferPaidInstallment {
  sequence: number
  due_date?: string | null
  amount: number
  paid_amount: number
  paid_at?: string | null
  status: string
}

export interface OwnershipTransfer {
  id: number
  source_sales_invoice_id: number
  transfer_sales_invoice_id?: number | null
  from_customer_id: number
  to_customer_id: number
  transferred_at?: string | null
  paid_total_at_transfer?: string | number
  remaining_balance_at_transfer?: string | number
  paid_installments_snapshot?: OwnershipTransferPaidInstallment[]
  notes?: string | null
  from_customer?: Pick<Customer, 'id' | 'name' | 'phone'>
  to_customer?: Pick<Customer, 'id' | 'name' | 'phone'>
  source_invoice?: Pick<
    SalesInvoice,
    'id' | 'invoice_number' | 'payment_term' | 'total' | 'paid_amount' | 'balance_due' | 'lines'
  >
  transfer_invoice?: Pick<SalesInvoice, 'id' | 'invoice_number'>
}

export interface Distributor {
  id: number
  branch_id: number
  code: string
  name: string
  name_ar?: string | null
  phone?: string | null
  address?: string | null
  type?: DistributorType | null
  customer_id?: number | null
  status: string
  agreed_amount?: string | number | null
  commission_balance?: string | number | null
  commission_percent?: string | number | null
  commission_tier_threshold?: number | null
  commission_tier_increment?: string | number | null
  confirmed_transactions_count?: number | null
  notes?: string | null
  profile_photo_url?: string | null
  branch?: Branch
  customer?: Customer | null
  customers_count?: number
  contract_customers_count?: number
  sales_invoices_count?: number
  customers?: Customer[]
  sales_invoices?: SalesInvoice[]
}

export interface DistributorCommissionLedgerEntry {
  id: number
  distributor_id: number
  type: 'credit' | 'debit'
  amount: string | number
  balance_after: string | number
  sales_invoice_id?: number | null
  payment_transaction_id?: number | null
  notes?: string | null
  created_at?: string
  sales_invoice?: { id: number; invoice_number?: string }
  payment_transaction?: { id: number; transaction_number?: string }
  user?: { id: number; name: string }
}

export type DistributorType = 'center' | 'free'

export type ServiceCategory =
  | 'maintenance'
  | 'software'
  | 'subscription'
  | 'installation'
  | 'uninstall'
  | 'transfer'
  | 'other'

export interface Service {
  id: number
  code?: string | null
  name: string
  name_ar?: string | null
  category: ServiceCategory
  default_price: string | number
  cash_price?: string | number
  installment_price?: string | number
  is_active: boolean
  description?: string | null
  contract_template_key?: string | null
}

export interface ContractTemplate {
  key: string
  name_ar: string
  description_ar: string
  category?: string | null
}

export interface Guarantor {
  id: number
  name: string
  phone: string
  national_id?: string | null
  address?: string | null
  relationship?: string | null
}

export interface MediaFile {
  id: number
  file_name: string
  mime_type?: string | null
  size: number
  description?: string | null
  url: string
  uploaded_by?: number | null
  created_at?: string | null
}

export interface InstallmentItem {
  id: number
  sales_invoice_id?: number
  installment_plan_id?: number
  installment_number?: number
  sequence?: number
  due_date: string
  amount: string | number
  paid_amount: string | number
  paid_at?: string | null
  status: string
  display_tier?: 'upcoming' | 'grace' | 'overdue' | 'paid' | 'suspended'
  late_fee_accrued?: string | number
  late_fee_waived_at?: string | null
  total_due?: number
  customer_id?: number
  customer_name?: string
  customer_phone?: string
  customer_phones?: string[]
  username?: string | null
  serial_number?: string | null
  invoice_number?: string
  remaining?: number
  remaining_installments?: number
  has_open_reconciliation?: boolean
  open_reconciliation_id?: number | null
  branch_id?: number
  unpaid_reason?: string | null
  suspended_at?: string | null
  is_suspended?: boolean
  device_in_custody?: boolean
  collection_status?: string | null
  collection_reminder_at?: string | null
  collection_notes?: string | null
}

export interface CollectionPaymentAccount {
  id: number
  phone: string | null
  payment_method: 'wallet' | 'instapay' | 'bank_transfer'
  account_number: string | null
  beneficiary_name: string
  bank_name?: string | null
  is_active: boolean
  amount_limit?: number | null
  collected_amount?: number | string | null
}

export interface InstallmentReconciliation {
  id: number
  installment_item_id: number
  responsible_user_id: number
  late_fee_waived: string | number
  notes?: string | null
  status: 'open' | 'closed'
  closed_at?: string | null
  closed_by?: number | null
}

export interface InstallmentPlan {
  id: number
  sales_invoice_line_id?: number | null
  down_payment: string | number
  installment_count: number
  installment_amount?: string | number | null
  interval_days?: number
  interval_type?: 'monthly' | 'weekly'
  first_due_date?: string
  status?: string
  items?: InstallmentItem[]
}

export type InvoiceStatus = 'pending_review' | 'confirmed' | 'rejected'

export type ContractKind =
  | 'new_contract'
  | 'subscription_renewal'
  | 'external_device'
  | 'ownership_transfer'

export interface SalesInvoice {
  id: number
  invoice_number?: string
  invoice_date: string
  branch_id?: number
  warehouse_id?: number
  total: string | number
  subtotal?: string | number
  discount_amount?: string | number
  paid_amount?: string | number
  balance_due: string | number
  payment_term: string
  payment_status: string
  status?: InvoiceStatus | string
  review_status?: 'pending' | 'approved' | 'rejected'
  sale_category?: 'accessories' | 'maintenance' | string
  contract_kind?: ContractKind | string
  source_sales_invoice_id?: number | null
  ownership_transferred_at?: string | null
  source_invoice?: SalesInvoice | null
  customer_id: number
  distributor_id?: number | null
  sales_user_id?: number | null
  customer?: Customer
  distributor?: Distributor
  sales_user?: { id: number; name: string; branch_id?: number | null }
  branch?: Branch
  installment_plan?: InstallmentPlan | null
  installment_plans?: InstallmentPlan[]
  lines?: SalesInvoiceLine[]
  notes?: string | null
  technician_name?: string | null
  technician_id?: number | null
  vehicle_info?: string | null
  vehicle_type?: 'car' | 'tuk_tuk' | 'motorcycle' | 'other' | null
  vehicle_plate_letters?: string | null
  vehicle_plate_numbers?: string | null
  chassis_number?: string | null
  engine_number?: string | null
  subscription_renewal_date?: string | null
  renewal_type?: 'annual' | 'permanent' | null
  installation_fee?: string | number | null
  transportation_fee?: string | number | null
  is_order_request?: boolean
  created_by?: number
  reviewed_by?: number
  reviewed_at?: string
  confirmed_at?: string
  rejection_reason?: string
  contract_status?: 'active' | 'in_problem' | 'returned' | 'exchanged' | 'cancelled' | string
  problem_reason?: string | null
  collection_review_status?: 'pending' | 'reviewed' | string | null
  collection_reviewed_at?: string | null
  collection_reviewed_by?: number | null
  collection_review_notes?: string | null
  collection_reviewer?: { id?: number; name?: string } | null
  installment_items?: InstallmentItem[]
  payment_transactions?: PaymentTransaction[]
}

export interface PaymentTransaction {
  id: number
  transaction_number?: string
  installment_item_id?: number | null
  amount?: string | number
  paid_at?: string | null
  status?: string
  payment_method?: string
  payment_source?: string
  collection_channel?: string
  sender_transfer_number?: string | null
  beneficiary_name?: string | null
  bank_name?: string | null
  account_number?: string | null
  customer?: { id?: number; name?: string; phone?: string | null }
  sales_invoice?: {
    id?: number
    invoice_number?: string
    branch?: { id?: number; name?: string; name_ar?: string | null }
  }
  installment_item?: { id?: number; sequence?: number; installment_number?: number }
  user?: { id?: number; name?: string }
  notes?: string | null
  collection_payment_account?: { id?: number; phone?: string; beneficiary_name?: string }
}

export type PaymentTransactionReceipt = PaymentTransaction

export interface SalesInvoiceLine {
  id: number
  line_type?: 'device' | 'service' | 'accessory' | 'package'
  product_id?: number
  product_unit_id?: number
  product_model_id?: number | null
  service_id?: number | null
  accessory_package_id?: number | null
  description?: string | null
  quantity?: number
  unit_price: string | number
  discount?: string | number
  line_total?: string | number
  payment_term?: 'cash' | 'installment' | null
  cash_schedule?: 'immediate' | 'month_1' | 'month_2' | 'month_3' | null
  cash_due_date?: string | null
  technician_id?: number | null
  username?: string | null
  technician?: { id: number; name: string; job_title?: string | null } | null
  installment_plan?: InstallmentPlan | null
  product_name_ar?: string | null
  product_unit?: ProductUnit
  product_model?: ProductModel
  accessory_package?: AccessoryPackage | null
  service?: Service | null
  serial_number?: string | null
  sim_number?: string | null
  vehicle_type?: 'car' | 'tuk_tuk' | 'motorcycle' | 'other' | null
  vehicle_plate_letters?: string | null
  vehicle_plate_numbers?: string | null
  chassis_number?: string | null
  engine_number?: string | null
  vehicle_info?: string | null
  renewal_type?: 'annual' | 'permanent' | null
  subscription_renewal_date?: string | null
}

export interface DailyReportTransaction {
  customer_name?: string
  promoter_name?: string
  distributor_id?: number | null
  transaction_type?: string
  amount?: number | string
}

export interface DailyReportTransfer {
  customer_name?: string
  amount?: number | string
  reference?: string
}

export interface DailyReportAttendance {
  employee_name?: string
  check_in?: string
  check_out?: string
}

export interface DailyReportExpenseLine {
  description?: string
  amount?: number | string
}

export interface DailyReportMovement {
  description?: string
}

export interface DailyBranchReport {
  id: number
  branch_id: number
  report_date: string
  total_amount: number | string
  expenses_total: number | string
  net_amount: number | string
  installations_count?: number
  devices_actual?: number
  devices_reserved?: number
  devices_customer?: number
  devices_software?: number
  accessories_tape?: number
  accessories_cable_ties?: number
  accessories_bulb?: number
  percentage?: string | null
  devices_entering_count?: number | null
  notes?: string | null
  vodafone_transfers_count?: number
  vodafone_transfers_total?: number | string
  vodafone_other_notes?: string | null
  renewal_notes?: string | null
  reviewer_name?: string | null
  branch_manager_name?: string | null
  attendance?: DailyReportAttendance[]
  transactions?: DailyReportTransaction[]
  transfers?: DailyReportTransfer[]
  expense_lines?: DailyReportExpenseLine[]
  movements?: DailyReportMovement[]
  branch?: Branch
}

export interface HrmUserSalesTarget {
  id: number
  employee_id: number
  target_start: string
  target_end: string
  target_count?: number
  achieved_count?: number
  commission_percent?: string | number | null
}

export interface PriceCatalogItem {
  id: number
  item_type: string
  reference_id?: number | null
  name_ar: string
  base_price: number | string
  cost_price?: number | string | null
  is_active: boolean
}

export interface Promotion {
  id: number
  name_ar: string
  promotion_type: string
  discount_value: number | string
  applies_to: string
  start_date: string
  end_date: string
  min_quantity?: number
  max_uses?: number | null
  uses_count?: number
  is_active: boolean
}

export interface ChatMessage {
  id: number
  conversation_id: number
  sender_id: number
  body: string
  created_at?: string
  sender?: { id: number; name: string; email?: string }
}

export interface ChatConversationSummary {
  id: number
  type: string
  other_user?: { id: number; name: string; email?: string }
  last_message?: ChatMessage
  unread_count: number
  updated_at?: string
}

export interface Employee {
  id: number
  employee_code: string
  zk_pin?: string | null
  name: string
  phone?: string | null
  national_id?: string | null
  job_title?: string | null
  hrm_job_id?: number | null
  salary?: string | number | null
  hire_date?: string | null
  status: string
  profile_photo_url?: string | null
  branch_id?: number | null
  department_id?: number | null
  user_id?: number | null
  branch?: Branch
  department?: { id: number; name: string; name_ar?: string }
  job?: HrmJob
  user?: { id: number; name: string; email?: string }
}

export interface Lead {
  id: number
  name: string
  phone: string
  source?: string | null
  status: string
  expected_value?: string | number | null
  device_count?: number | null
  notes?: string | null
  converted_on?: string | null
  converted_customer_id?: number | null
  branch?: Branch
  assignee?: { id: number; name: string }
}

export interface SalesRep {
  id: number
  name: string
  branch_id?: number | null
}

export interface CheckoutPayload {
  customer_id: number
  distributor_id?: number
  sales_user_id?: number
  promotion_id?: number
  warehouse_id?: number
  branch_id?: number
  contract_kind?: ContractKind
  source_sales_invoice_id?: number
  payment_term?: 'cash' | 'credit' | 'installment' | 'mixed'
  discount_amount?: number
  installation_fee?: number
  transportation_fee?: number
  invoice_date?: string
  notes?: string
  distributor_balance_amount?: number
  lines: {
    line_type?: 'device' | 'service'
    product_unit_id?: number
    product_id?: number
    service_id?: number
    description?: string
    service_category?: string
    quantity?: number
    unit_price?: number
    discount?: number
    serial_number?: string
    sim_number?: string
    username?: string
    payment_term?: 'cash' | 'installment'
    cash_schedule?: 'immediate' | 'month_1' | 'month_2' | 'month_3'
    down_payment?: number
    technician_id?: number
    vehicle_type?: 'car' | 'tuk_tuk' | 'motorcycle' | 'other'
    vehicle_plate_letters?: string
    vehicle_plate_numbers?: string
    chassis_number?: string
    engine_number?: string
    renewal_type?: 'annual' | 'permanent'
    subscription_renewal_date?: string
    installment_plan?: {
      down_payment?: number
      installment_count: number
      installment_amount?: number
      interval_type?: 'monthly' | 'weekly'
      interval_days?: number
      first_due_date: string
    }
  }[]
  installment_plan?: {
    down_payment?: number
    installment_count: number
    installment_amount?: number
    interval_type?: 'monthly' | 'weekly'
    interval_days?: number
    first_due_date: string
  }
}

export interface ServiceCheckoutPayload {
  customer_id: number
  distributor_id?: number
  sales_user_id?: number
  branch_id?: number
  sale_category: 'accessories' | 'maintenance'
  invoice_date?: string
  notes?: string
  distributor_balance_amount?: number
  items: {
    service_id?: number
    description: string
    quantity?: number
    unit_price: number
    payment_term?: 'cash' | 'installment'
    cash_schedule?: 'immediate' | 'month_1' | 'month_2' | 'month_3'
    down_payment?: number
    installment_plan?: {
      down_payment: number
      installment_amount: number
      installment_count: number
      interval_type?: 'monthly' | 'weekly'
      interval_days?: number
      first_due_date: string
    }
  }[]
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
  start_time?: string | null
  customer_id?: number | null
  service_evaluation_request_id?: number | null
  audio_url?: string | null
  service_evaluation_request?: { id: number; status?: string; executed_at?: string | null }
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

export type ReferralLeadStatus =
  | 'no_answer'
  | 'not_interested'
  | 'installation_scheduled'
  | 'installed'

export interface ReferralLead {
  id: number
  organization_id?: number
  branch_id?: number | null
  phone: string
  name?: string | null
  status: ReferralLeadStatus
  referred_by_customer_id?: number | null
  referred_by_referral_lead_id?: number | null
  follow_up_at?: string | null
  installation_scheduled_at?: string | null
  installed_at?: string | null
  created_by?: number | null
  assigned_to?: number | null
  converted_customer_id?: number | null
  notes?: string | null
  created_at?: string
  referred_by_customer?: Customer
  referred_by_referral_lead?: ReferralLead
  child_referrals?: ReferralLead[]
  converted_customer?: Customer
  creator?: { id: number; name: string }
  assignee?: { id: number; name: string }
  status_logs?: ReferralLeadStatusLog[]
}

export type ReferralReferrerOption =
  | {
      kind: 'customer'
      id: number
      label: string
      customer: Customer
    }
  | {
      kind: 'referral_lead'
      id: number
      label: string
      referral_lead: ReferralLead
    }

export interface ReferralLeadStatusLog {
  id: number
  referral_lead_id: number
  status: ReferralLeadStatus
  notes?: string | null
  user_id?: number | null
  created_at?: string
  user?: { id: number; name: string }
}

export interface ReferralLeadReportSummary {
  total: number
  no_answer: number
  not_interested: number
  installation_scheduled: number
  installed: number
  conversion_rate: number
}

export interface ReferralLeadReportByUser {
  user_id: number
  user_name: string
  total: number
  no_answer: number
  not_interested: number
  installation_scheduled: number
  installed: number
}

export interface ReferralLeadReport {
  from: string
  to: string
  summary: ReferralLeadReportSummary
  by_user: ReferralLeadReportByUser[]
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
  branch_id?: number | null
  collection_payment_account_id?: number | null
  description?: string | null
  status: 'active' | 'inactive'
  balance?: number
  account_sub_type?: AccountingAccountType | null
  detail_type?: AccountingAccountType | null
  parent_account?: AccountingAccount | null
  child_accounts?: AccountingAccount[]
  branch?: { id: number; name: string; code?: string } | null
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
  unmapped_branches?: Array<{ id: number; name: string; code: string }>
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
  branch_id?: number | null
  assets: number
  liabilities: number
  equity: number
  liabilities_and_equity: number
  balanced: boolean
  accounts?: BalanceSheetAccountRow[]
}

export interface BalanceSheetAccountRow {
  id: number
  name: string
  gl_code?: string | null
  account_primary_type: AccountPrimaryType
  branch_id?: number | null
  balance: number
}

export interface GeneralLedgerEntry {
  account_id: number
  account_name: string
  gl_code?: string | null
  transaction_id: number
  operation_date: string
  ref_no?: string | null
  sub_type?: string | null
  type: 'debit' | 'credit'
  amount: number
  running_balance: number
  note?: string | null
}

export interface BudgetVarianceRow {
  account_id: number
  account_name: string
  gl_code?: string | null
  months: Array<{ month: string; budget: number; actual: number; variance: number }>
  yearly_budget: number
  yearly_actual: number
}

export interface ArReconciliationReport {
  as_of_date: string
  branch_id?: number | null
  gl_ar_balance: number
  operational_balance_due: number
  difference: number
  reconciled: boolean
}

export interface CashStatementEntry {
  account_id: number
  account_name: string
  gl_code?: string | null
  operation_date: string
  ref_no?: string | null
  sub_type?: string | null
  type: 'debit' | 'credit'
  amount: number
  signed_amount: number
  note?: string | null
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
  accounts: Array<
    Pick<AccountingAccount, 'id' | 'name' | 'gl_code' | 'account_primary_type' | 'branch_id' | 'parent_account_id'>
  >
  collection_accounts?: Array<{
    id: number
    beneficiary_name?: string | null
    bank_name?: string | null
    payment_method?: string | null
    phone?: string | null
    account_number?: string | null
  }>
  collection_gl_maps?: Array<{
    id: number
    name: string
    gl_code?: string | null
    collection_payment_account_id: number
  }>
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
  /** Leave requests grouped by status (e.g. pending/approved/rejected). */
  leaves_by_status?: Record<string, number>
  /** Present-employee count per day for the last 7 days, keyed by ISO date. */
  attendance_trend?: Record<string, number>
  /** Total headcount (all statuses). */
  total_employees?: number
  /** Active headcount. */
  active_employees?: number
}

export interface HrmLeaveType {
  id: number
  leave_type: string
  max_leave_count?: number | null
  leave_count_interval?: 'year' | 'month' | string | null
}

export interface HrmJob {
  id: number
  name: string
  description?: string | null
  status: string
  employees_count?: number
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
  clock_in_note?: string | null
  clock_out_note?: string | null
  clock_in_branch_id?: number | null
  clock_out_branch_id?: number | null
  clock_in_branch?: Branch | null
  clock_out_branch?: Branch | null
  hrm_shift_id?: number | null
  employee?: Employee
  shift?: HrmShift
}

export interface ZkDevice {
  id: number
  branch_id: number
  name: string
  ip_address: string
  port?: number
  comm_key?: string | null
  last_sync_at?: string | null
  last_sync_status?: string | null
  last_sync_message?: string | null
  is_active?: boolean
  branch?: Branch
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
  administration_id?: number | null
  branch_id?: number | null
  section_id?: number | null
  roles?: (Role & { name: string })[]
}

export interface AdminRole {
  id: number
  name: string
  name_ar?: string | null
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
  updated_at?: string
}

export interface GeneralSettings {
  logo_url?: string | null
  theme_color?: string
  website?: string | null
  tax_number?: string | null
  commercial_register?: string | null
  currency?: string
  timezone?: string
  default_locale?: 'ar' | 'en'
  date_format?: string
  time_format?: '12h' | '24h'
  fiscal_year_start_month?: number
}

export interface SalesSettings {
  invoice_prefix?: string
  require_invoice_review?: boolean
  review_installment_order?: 'before_installments' | 'after_installments'
  block_contract_on_review?: boolean
  allow_negative_inventory?: boolean
  default_payment_term?: 'cash' | 'credit' | 'installment'
  max_installment_months?: number
  installment_interval_days?: number
  overdue_grace_days?: number
  late_fee_mode?: 'daily_fixed' | 'percent'
  late_fee_daily_amount?: number
  late_fee_percent?: number
  min_down_payment_percent?: number
  enable_installation_fee?: boolean
  default_installation_fee?: number
  allow_disable_installation_fee_in_sale?: boolean
}

export interface AppNotification {
  id: string
  type?: string
  title: string
  message: string
  data?: Record<string, unknown>
  read_at?: string | null
  created_at?: string
}

export interface SecuritySettings {
  session_timeout_minutes?: number
  password_min_length?: number
  force_password_change_on_first_login?: boolean
  audit_log_retention_days?: number
  log_ip_addresses?: boolean
}

export interface CollectionActionsSummary {
  customer_status: string
  portal_blocked: boolean
  device_disable_note?: {
    logged_at: string
    notes?: string | null
  } | null
  whatsapp_warnings?: Record<
    number,
    {
      logged_at?: string
      sales_invoice_id: number
    }
  >
}

export interface MessagingTemplateSettings {
  contract_welcome?: string
  contract_approved?: string
  installment_reminder?: string
  installment_paid?: string
  collection_warning?: string
}

export interface MessagingSettings {
  whatsapp_enabled?: boolean
  reminder_days_before?: number
  send_contract_welcome?: boolean
  send_contract_approved?: boolean
  send_installment_reminder?: boolean
  send_installment_paid?: boolean
  send_collection_warning?: boolean
  templates?: MessagingTemplateSettings
}

export interface CustomerMessageLogEntry {
  id: number
  message_type: string
  phone?: string | null
  body: string
  status: string
  error?: string | null
  sent_at?: string | null
  created_at?: string
  customer?: { id: number; name: string; phone?: string }
  sales_invoice?: { id: number; invoice_number?: string }
}

export interface OrganizationSettings {
  organization: OrganizationProfile
  settings: {
    general: GeneralSettings
    sales: SalesSettings
    security: SecuritySettings
    messaging?: MessagingSettings
  }
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
