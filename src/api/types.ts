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

export type DemoRole = 'super_admin' | 'admin' | 'sales' | 'reviewer' | 'collector'
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
  status?: InvoiceStatus
  customer_id: number
  customer?: Customer
  installment_plan?: InstallmentPlan | null
  lines?: SalesInvoiceLine[]
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
  branch?: Branch
  department?: { id: number; name: string; name_ar?: string }
}

export interface Lead {
  id: number
  name: string
  phone: string
  source?: string | null
  status: string
  expected_value?: string | number | null
  notes?: string | null
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
