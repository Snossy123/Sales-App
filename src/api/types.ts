export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface Branch {
  id: number
  name: string
  name_ar?: string | null
  code: string
  address?: string | null
  phone?: string | null
  is_active?: boolean
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

export interface AuthUser {
  id: number
  name: string
  email: string
  organization_id: number
  branch_id?: number | null
  branch?: Branch | null
  organization?: { id: number; name: string; name_ar?: string }
  roles?: Role[]
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
  overdue_installments: number
  due_this_week: number
  outstanding_balance: number
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
  installment_number: number
  due_date: string
  amount: string | number
  paid_amount: string | number
  status: string
}

export interface InstallmentPlan {
  id: number
  down_payment: string | number
  installment_count: number
  items?: InstallmentItem[]
}

export interface SalesInvoice {
  id: number
  invoice_number?: string
  invoice_date: string
  total: string | number
  balance_due: string | number
  payment_term: string
  payment_status: string
  customer_id: number
  customer?: Customer
  installment_plan?: InstallmentPlan | null
  lines?: SalesInvoiceLine[]
}

export interface SalesInvoiceLine {
  id: number
  product_unit_id: number
  unit_price: string | number
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
  lines: { product_unit_id: number; unit_price?: number; discount?: number }[]
  installment_plan?: {
    down_payment: number
    installment_count: number
    interval_days?: number
    first_due_date: string
  }
}
