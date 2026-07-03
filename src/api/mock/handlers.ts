import type { AxiosRequestConfig } from 'axios'
import type {
  AccountingDashboard,
  AccountingSettings,
  BranchAccountingMap,
  BalanceSheetReport,
  IncomeStatementReport,
  ArAgeingContactRow,
  AccountingAccTransMapping,
  AccountingAccount,
  AccountingBudget,
  AccountingTransactionLine,
  Branch,
  CheckoutPayload,
  Customer,
  DailyBranchReport,
  DashboardStats,
  Department,
  Distributor,
  Service,
  GpsStock,
  InventoryOverviewRow,
  LoginResponse,
  PaginatedResponse,
  CrmMarketplace,
  SalesInvoice,
  SalesInvoiceLine,
  ServiceCheckoutPayload,
  InstallmentPlan,
  InstallmentItem,
  TransactionMapPayload,
  TrialBalanceReport,
  MediaFile,
  Guarantor,
} from '../types'
import { loadState, mutateState, resetState, saveState } from './store'
import type { AuthUser } from '../types'
import { getScopedBranchIds as resolveUserBranchIds, getScopedDepartmentId } from '../../lib/dataScope'
import { customerAllPhoneNumbers } from '../../lib/customerForm'
import { isSuperAdmin } from '../../lib/access'
import { CONTRACT_TEMPLATES, mockContractPreviewHtml } from '../../lib/contractTemplates'
import type { DemoState, DemoUser } from './seed'
import { tryHandleChatRequest } from './chatHandlers'
import { tryHandleHrmRequest } from './hrmHandlers'
import { applyPromotionDiscount, tryHandlePricingRequest } from './pricingHandlers'
import {
  cashDueDate,
  cashRemainder,
  isDeferredCashSchedule,
  linePaidNow,
  type CashSchedule,
} from '../../lib/cashSchedule'

interface MockContext {
  branchId?: number
  warehouseId?: number
  departmentId?: number
  organizationId?: number
  user?: AuthUser
}

function getApiDepartmentScope(ctx: MockContext): number | null {
  if (!ctx.user) return null
  return getScopedDepartmentId(ctx.user)
}

function getScopedBranchIds(state: DemoState, ctx: MockContext): number[] | null {
  if (!ctx.user) return null
  return resolveUserBranchIds(ctx.user, state.branches)
}

function isBranchInScope(state: DemoState, ctx: MockContext, branchId?: number | null): boolean {
  const branchIds = getScopedBranchIds(state, ctx)
  if (branchIds == null) return true
  if (branchId == null) return false
  return branchIds.includes(branchId)
}

function matchesBranchAdministration(
  state: DemoState,
  branchId: number | null | undefined,
  administrationId: number,
): boolean {
  if (branchId == null) return false
  const branch = state.branches.find((b) => b.id === branchId)
  const adminId = branch?.administration_id ?? branch?.department_id
  return adminId === administrationId
}

function mockAccrueDistributorCommission(
  state: DemoState,
  invoice: { id: number; distributor_id?: number | null },
): void {
  if (!invoice.distributor_id) return
  const distributor = state.distributors.find((d) => d.id === invoice.distributor_id)
  if (!distributor) return
  const amount = Number(distributor.agreed_amount ?? 0)
  if (amount <= 0) return
  const ledger = state.distributorCommissionLedger ?? []
  if (ledger.some((e) => e.sales_invoice_id === invoice.id && e.type === 'credit')) return
  distributor.commission_balance = Number(distributor.commission_balance ?? 0) + amount
  if (!state.distributorCommissionLedger) state.distributorCommissionLedger = []
  if (state.counters.commissionLedger == null) state.counters.commissionLedger = 1
  state.distributorCommissionLedger.push({
    id: state.counters.commissionLedger++,
    distributor_id: distributor.id,
    type: 'credit',
    amount,
    balance_after: Number(distributor.commission_balance),
    sales_invoice_id: invoice.id,
    notes: 'عمولة عقد',
    created_at: new Date().toISOString(),
  })
}

function mockDebitDistributorBalance(
  state: DemoState,
  customerId: number,
  amount: number,
  salesInvoiceId?: number,
  paymentTransactionId?: number,
): void {
  const distributor = state.distributors.find((d) => d.customer_id === customerId)
  if (!distributor) throw mockError(422, 'العميل غير مربوط بموزع')
  const debit = Math.round(amount * 100) / 100
  if (debit <= 0) return
  if (debit > Number(distributor.commission_balance ?? 0) + 0.009) {
    throw mockError(422, 'رصيد عمولة الموزع غير كافٍ')
  }
  distributor.commission_balance = Number(distributor.commission_balance ?? 0) - debit
  if (!state.distributorCommissionLedger) state.distributorCommissionLedger = []
  if (state.counters.commissionLedger == null) state.counters.commissionLedger = 1
  state.distributorCommissionLedger.push({
    id: state.counters.commissionLedger++,
    distributor_id: distributor.id,
    type: 'debit',
    amount: debit,
    balance_after: Number(distributor.commission_balance),
    sales_invoice_id: salesInvoiceId,
    payment_transaction_id: paymentTransactionId,
    notes: 'خصم من رصيد العمولة',
    created_at: new Date().toISOString(),
  })
}

function resolveMockInvoiceLineType(line: SalesInvoiceLine): 'device' | 'service' {
  if (line.line_type === 'service' || line.line_type === 'device') {
    return line.line_type
  }
  if (line.service_id) return 'service'
  if (line.product_unit_id) return 'device'
  if (line.serial_number || line.sim_number || line.renewal_type) return 'device'
  return line.description ? 'service' : 'device'
}

function enrichMockInvoiceLine(state: DemoState, line: SalesInvoiceLine): SalesInvoiceLine {
  const lineType = resolveMockInvoiceLineType(line)
  const service = line.service_id
    ? (state.services ?? []).find((item) => item.id === line.service_id)
    : undefined

  return {
    ...line,
    line_type: lineType,
    description:
      line.description ??
      service?.name_ar ??
      service?.name ??
      (lineType === 'service' ? line.product_name_ar ?? null : line.product_name_ar),
    service,
    installment_plan: line.installment_plan
      ? { ...line.installment_plan, items: line.installment_plan.items ?? [] }
      : null,
  }
}

function enrichSection(state: DemoState, section: import('./seed').DemoState['sections'][0]) {
  const branch = section.branch_id
    ? state.branches.find((b) => b.id === section.branch_id)
    : undefined
  return {
    ...section,
    branch: branch ? enrichBranch(state, branch) : undefined,
  }
}

function enrichBranch(state: DemoState, branch: Branch): Branch {
  const adminId = branch.administration_id ?? branch.department_id
  const administration = adminId
    ? state.departments.find((d) => d.id === adminId)
    : undefined

  return {
    ...branch,
    administration_id: adminId ?? branch.administration_id,
    department_id: adminId ?? branch.department_id,
    administration: administration as Branch['administration'],
    department: administration,
  }
}

function paginate<T>(items: T[], params?: Record<string, unknown>): PaginatedResponse<T> {
  const page = Number(params?.page ?? 1)
  const perPage = Number(params?.per_page ?? 50)
  const start = (page - 1) * perPage
  const slice = items.slice(start, start + perPage)
  return {
    data: slice,
    current_page: page,
    last_page: Math.max(1, Math.ceil(items.length / perPage)),
    per_page: perPage,
    total: items.length,
  }
}

function getParams(config?: AxiosRequestConfig): Record<string, string> {
  const p = config?.params
  if (!p) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(p)) {
    if (v != null) out[k] = String(v)
  }
  return out
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getCustomerMedia(state: DemoState): (MediaFile & { customer_id: number })[] {
  const extended = state as DemoState & { customerMedia?: (MediaFile & { customer_id: number })[] }
  if (!extended.customerMedia) extended.customerMedia = []
  return extended.customerMedia
}

function enrichCustomer(
  state: DemoState,
  customer: Customer,
  invoiceStatus: 'confirmed' | 'unconfirmed' | 'all' = 'all',
): Customer {
  const assignedDistributor = customer.distributor_id
    ? state.distributors.find((d) => d.id === customer.distributor_id)
    : undefined
  const distributorProfile = state.distributors.find((d) => d.customer_id === customer.id)
  let invoices = state.invoices.filter((i) => i.customer_id === customer.id)

  if (invoiceStatus === 'confirmed') {
    invoices = invoices.filter((i) => i.status === 'confirmed')
  } else if (invoiceStatus === 'unconfirmed') {
    invoices = invoices.filter((i) => i.status !== 'confirmed')
  }

  const salesInvoices = invoices.map((inv) => {
    const lines = (inv.lines ?? []).map((line) => ({
      ...line,
      installment_plan: line.installment_plan
        ? { ...line.installment_plan, items: line.installment_plan.items ?? [] }
        : null,
    }))
    return {
      ...inv,
      lines,
      customer: undefined,
      installment_plan: inv.installment_plan
        ? { ...inv.installment_plan, items: inv.installment_plan.items ?? [] }
        : lines.find((l) => l.installment_plan)?.installment_plan ?? null,
    }
  })

  return {
    ...customer,
    branch: customer.branch_id
      ? state.branches.find((b) => b.id === customer.branch_id)
      : undefined,
    distributor: assignedDistributor
      ? {
          ...assignedDistributor,
          branch: state.branches.find((b) => b.id === assignedDistributor.branch_id),
        }
      : undefined,
    distributor_profile: distributorProfile
      ? enrichDistributor(state, distributorProfile)
      : undefined,
    sales_invoices: salesInvoices,
  }
}

function enrichDistributor(state: DemoState, distributor: Distributor): Distributor {
  const customer = distributor.customer_id
    ? state.customers.find((c) => c.id === distributor.customer_id)
    : undefined
  const customers = state.customers.filter((c) => c.distributor_id === distributor.id)
  const salesInvoices = state.invoices
    .filter((i) => i.distributor_id === distributor.id)
    .map((inv) => ({
      ...inv,
      customer: state.customers.find((c) => c.id === inv.customer_id),
    }))
  const contractCustomersCount = new Set(
    salesInvoices.map((invoice) => invoice.customer_id).filter((id): id is number => id != null),
  ).size

  return {
    ...distributor,
    customer,
    profile_photo_url: customer?.profile_photo_url ?? null,
    customers_count: customers.length,
    contract_customers_count: contractCustomersCount,
    sales_invoices_count: salesInvoices.length,
    customers,
    sales_invoices: salesInvoices,
  }
}

function getStock(state: DemoState, warehouseId: number): GpsStock | undefined {
  return state.stocks.find((s) => s.warehouse_id === warehouseId)
}

function getStockByBranch(state: DemoState, branchId: number): GpsStock | undefined {
  return state.stocks.find((s) => s.branch_id === branchId)
}

function getDeptStock(state: DemoState, departmentId: number) {
  let ds = state.departmentStocks.find((d) => d.department_id === departmentId)
  if (!ds) {
    ds = { department_id: departmentId, quantity: 0, pending: 0, distributed: 0 }
    state.departmentStocks.push(ds)
  }
  return ds
}

function calcDistributed(state: DemoState, departmentId: number): number {
  const branchIds = state.branches.filter((b) => b.department_id === departmentId).map((b) => b.id)
  return state.stocks
    .filter((s) => branchIds.includes(s.branch_id))
    .reduce((sum, s) => sum + s.quantity + s.reserved + s.sold, 0)
}

function enrichDepartment(state: DemoState, dept: Department) {
  const ds = getDeptStock(state, dept.id)
  const distributed = calcDistributed(state, dept.id)
  return {
    ...dept,
    department_stock: { ...ds, distributed },
  }
}

function buildDeletionBlockers(state: DemoState, administrationId: number) {
  const linkedBranches = state.branches.filter(
    (b) => b.department_id === administrationId || b.administration_id === administrationId,
  )
  const ds = getDeptStock(state, administrationId)
  const centralWarehouse = state.warehouses.find(
    (w) => w.is_central && w.administration_id === administrationId,
  )
  const centralStock = centralWarehouse ? getStock(state, centralWarehouse.id) : undefined
  const locked = (centralStock?.sold ?? 0) + (centralStock?.reserved ?? 0)
  const clearable = ds.pending ?? 0

  return {
    branch_count: linkedBranches.length,
    central_inventory_total: clearable + locked,
    central_inventory_clearable: clearable,
    central_inventory_locked: locked,
  }
}

function enrichAdminUser(state: DemoState, user: Omit<import('./seed').DemoUser, 'password'>) {
  const administration = user.administration_id
    ? state.departments.find((d) => d.id === user.administration_id)
    : null
  const branch = user.branch_id ? state.branches.find((b) => b.id === user.branch_id) : null
  const section = user.section_id ? state.sections.find((s) => s.id === user.section_id) : null
  const allowedBranchIds = user.allowed_branch_ids ?? []
  const branches = allowedBranchIds
    .map((id) => state.branches.find((b) => b.id === id))
    .filter(Boolean)
  return {
    ...user,
    department_id: user.administration_id ?? user.department_id ?? null,
    administration: administration ?? null,
    branch: branch ?? null,
    branches,
    section: section ?? null,
  }
}

function buildInventoryOverview(
  state: DemoState,
  departmentFilter?: number,
): InventoryOverviewRow[] {
  const rows: InventoryOverviewRow[] = []
  const depts = departmentFilter
    ? state.departments.filter((d) => d.id === departmentFilter)
    : state.departments

  for (const dept of depts) {
    const ds = getDeptStock(state, dept.id)
    if (ds.pending > 0) {
      rows.push({
        row_type: 'department_pending',
        department_id: dept.id,
        department_name_ar: dept.name_ar || dept.name,
        quantity: ds.pending,
        reserved: 0,
        sold: 0,
        pending: ds.pending,
      })
    }

    const deptBranches = state.branches.filter((b) => b.department_id === dept.id)
    for (const branch of deptBranches) {
      const stock = getStockByBranch(state, branch.id)
      rows.push({
        row_type: 'branch',
        department_id: dept.id,
        department_name_ar: dept.name_ar || dept.name,
        branch_id: branch.id,
        branch_name_ar: branch.name_ar || branch.name,
        quantity: stock?.quantity ?? 0,
        reserved: stock?.reserved ?? 0,
        sold: stock?.sold ?? 0,
      })
    }
  }
  return rows
}

function findInstallmentItem(
  invoice: SalesInvoice,
  itemId: number,
): { item: InstallmentItem; plan: InstallmentPlan } | undefined {
  for (const line of invoice.lines ?? []) {
    const plan = line.installment_plan
    const item = plan?.items?.find((i) => i.id === itemId)
    if (item && plan) return { item, plan }
  }
  const plan = invoice.installment_plan
  const item = plan?.items?.find((i) => i.id === itemId)
  if (item && plan) return { item, plan }
  return undefined
}

function refreshInvoicePayment(invoice: SalesInvoice): void {
  if (invoice.payment_term === 'cash' && invoice.status === 'confirmed') {
    invoice.paid_amount = Number(invoice.total)
    invoice.balance_due = 0
    invoice.payment_status = 'paid'
    return
  }

  const plans: InstallmentPlan[] = []
  for (const line of invoice.lines ?? []) {
    if (line.installment_plan) plans.push(line.installment_plan)
  }
  if (invoice.installment_plan && !plans.some((p) => p.id === invoice.installment_plan?.id)) {
    plans.push(invoice.installment_plan)
  }

  if (plans.length === 0) {
    invoice.paid_amount = invoice.payment_term === 'installment' ? 0 : 0
    invoice.balance_due = Number(invoice.total) - Number(invoice.paid_amount)
    invoice.payment_status =
      invoice.balance_due <= 0 ? 'paid' : invoice.paid_amount > 0 ? 'partial' : 'unpaid'
    return
  }

  let down = 0
  let itemsPaid = 0
  for (const plan of plans) {
    down += Number(plan.down_payment ?? 0)
    itemsPaid += (plan.items ?? []).reduce((sum, installment) => sum + Number(installment.paid_amount), 0)
  }

  invoice.paid_amount = down + itemsPaid
  invoice.balance_due = Math.max(0, Number(invoice.total) - invoice.paid_amount)
  if (invoice.balance_due <= 0) invoice.payment_status = 'paid'
  else if (invoice.paid_amount > 0) invoice.payment_status = 'partial'
  else invoice.payment_status = 'unpaid'
}

function generateInstallmentItems(
  state: DemoState,
  invoice: SalesInvoice,
  line?: SalesInvoiceLine,
  planOverride?: InstallmentPlan,
): void {
  const plan = planOverride ?? line?.installment_plan ?? invoice.installment_plan
  if (!plan) return

  const financedBase = line
    ? Number(line.line_total ?? 0)
    : Number(invoice.total)
  const financed = financedBase - Number(plan.down_payment)
  const count = plan.installment_count
  const fixedAmount = plan.installment_amount != null ? Number(plan.installment_amount) : null
  const base = fixedAmount ?? Math.floor((financed / count) * 100) / 100
  let remainder = fixedAmount
    ? Math.round((financed - base * count) * 100) / 100
    : Math.round((financed - base * count) * 100) / 100
  const items = []

  for (let i = 0; i < count; i++) {
    const amount = i === count - 1 ? base + remainder : base
    const dueDate = addDays(plan.first_due_date ?? new Date().toISOString().split('T')[0], i * (plan.interval_days ?? 30))
    const isPast = new Date(dueDate) < new Date()
    items.push({
      id: state.counters.installmentItem++,
      sales_invoice_id: invoice.id,
      installment_plan_id: plan.id,
      installment_number: i + 1,
      due_date: dueDate,
      amount,
      paid_amount: 0,
      status: isPast ? 'overdue' : 'pending',
    })
  }

  plan.items = items
  plan.status = 'active'
  refreshInvoicePayment(invoice)
}

export function handleMockRequest(
  method: string,
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
  ctx: MockContext = {},
): unknown {
  const path = url.replace(/^\//, '')
  const params = getParams(config)
  const state = loadState()
  const m = method.toUpperCase()

  if (m === 'POST' && path === 'auth/login') {
    const body = data as { email?: string; password?: string }
    const user = state.users.find(
      (u) => u.email === body.email && u.password === body.password,
    )
    if (!user) {
      throw mockError(401, 'بيانات الدخول غير صحيحة.')
    }
    const { password: _, ...authUser } = user
    const response: LoginResponse = {
      token: `demo-token-${user.id}`,
      token_type: 'Bearer',
      user: authUser,
    }
    return response
  }

  if (m === 'POST' && path === 'auth/logout') {
    return { message: 'ok' }
  }

  if (m === 'GET' && path === 'auth/me') {
    if (!ctx.user) throw mockError(401, 'غير مصرح')
    const { password: _, ...authUser } = ctx.user as DemoUser & { password?: string }
    return authUser
  }

  if ((m === 'PATCH' || m === 'POST') && path === 'auth/me/preferences') {
    if (!ctx.user) throw mockError(401, 'غير مصرح')
    const body = (data ?? {}) as { tours?: Record<string, boolean>; active_branch_id?: number | null }
    const userIndex = state.users.findIndex((u) => u.id === ctx.user!.id)
    if (userIndex < 0) throw mockError(404, 'المستخدم غير موجود')

    const currentPrefs = state.users[userIndex].preferences ?? {}
    const nextPrefs = {
      ...currentPrefs,
      tours: {
        ...(currentPrefs.tours ?? {}),
        ...(body.tours ?? {}),
      },
    }

    if (Object.prototype.hasOwnProperty.call(body, 'active_branch_id')) {
      if (body.active_branch_id == null) {
        delete nextPrefs.active_branch_id
      } else if (!isBranchInScope(state, ctx, body.active_branch_id)) {
        throw mockError(422, 'الفرع خارج النطاق المسموح')
      } else {
        nextPrefs.active_branch_id = body.active_branch_id
      }
    }

    state.users[userIndex].preferences = nextPrefs
    if (nextPrefs.active_branch_id != null) {
      state.users[userIndex].active_branch_id = nextPrefs.active_branch_id
    } else {
      delete state.users[userIndex].active_branch_id
    }
    saveState(state)

    const { password: _, ...authUser } = state.users[userIndex]
    return authUser
  }

  if (m === 'GET' && path === 'dashboard') {
    const scopedBranchIds = getScopedBranchIds(state, ctx)
    const warehouseId = ctx.warehouseId
    const period = String(params.period ?? 'day')
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const inPeriod = (dateStr: string): boolean => {
      const d = new Date(dateStr)
      if (period === 'all') return true
      if (period === 'day') return dateStr === todayStr
      if (period === 'week') {
        const start = new Date(today)
        start.setDate(today.getDate() - today.getDay())
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        return d >= start && d <= end
      }
      if (period === 'month') {
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
      }
      if (period === 'year') {
        return d.getFullYear() === today.getFullYear()
      }
      return dateStr === todayStr
    }

    const branchInvoices = state.invoices.filter((i) => {
      if (scopedBranchIds) return i.branch_id != null && scopedBranchIds.includes(i.branch_id)
      return true
    })
    const periodInvoices = branchInvoices.filter((i) => inPeriod(i.invoice_date))
    const confirmed = branchInvoices.filter((i) => i.status === 'confirmed')

    let outstanding = 0
    let overdue = 0
    let dueWeek = 0
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() + 7)
    const overdueList: DashboardStats['overdue_installments_list'] = []

    for (const inv of confirmed) {
      outstanding += Number(inv.balance_due)
      for (const item of inv.installment_plan?.items ?? []) {
        const due = new Date(item.due_date)
        const remaining = Number(item.amount) - Number(item.paid_amount)
        const isOverdue =
          remaining > 0 &&
          (item.status === 'overdue' || (item.status !== 'paid' && due < new Date()))
        if (isOverdue) {
          overdue++
          if (overdueList.length < 10) {
            const customer = state.customers.find((c) => c.id === inv.customer_id)
            const planCount = inv.installment_plan?.installment_count
            const daysOverdue = Math.max(
              0,
              Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)),
            )
            overdueList.push({
              id: item.id,
              due_date: item.due_date,
              amount: item.amount,
              paid_amount: item.paid_amount,
              status: 'overdue',
              remaining,
              installment_number: item.installment_number,
              installment_count: planCount,
              days_overdue: daysOverdue,
              customer_name: customer?.name,
              customer_phone: customer?.phone,
              invoice_number: inv.invoice_number,
              sales_invoice_id: inv.id,
              sales_invoice: {
                id: inv.id,
                invoice_number: inv.invoice_number,
                customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : undefined,
              },
            })
          }
        }
        if (due >= new Date() && due <= weekEnd && item.status !== 'paid') dueWeek++
      }
    }

    const stock = warehouseId ? getStock(state, warehouseId) : null
    const availableQty = stock ? stock.quantity - stock.reserved : state.stocks.reduce((s, x) => s + x.quantity - x.reserved, 0)

    const stats: DashboardStats = {
      period,
      sales_today: periodInvoices
        .filter((i) => i.status === 'confirmed')
        .reduce((s, i) => s + Number(i.total), 0),
      invoices_today: periodInvoices.length,
      customers_count: state.customers.filter((c) => {
        if (!c.branch_id) return false
        if (scopedBranchIds) return scopedBranchIds.includes(c.branch_id)
        return true
      }).length,
      available_units: availableQty,
      pending_reviews: branchInvoices.filter((i) => i.status === 'pending_review' && inPeriod(i.invoice_date)).length,
      overdue_installments: overdue,
      due_this_week: dueWeek,
      outstanding_balance: outstanding,
      recent_invoices: branchInvoices
        .filter((i) => inPeriod(i.invoice_date))
        .slice(0, 5)
        .map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        total: inv.total,
        status: inv.status ?? 'pending_review',
        payment_term: inv.payment_term,
        customer: state.customers.find((c) => c.id === inv.customer_id),
      })),
      pending_review_invoices: branchInvoices
        .filter((i) => i.status === 'pending_review' && inPeriod(i.invoice_date))
        .slice(0, 5)
        .map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          total: inv.total,
          status: inv.status ?? 'pending_review',
          payment_term: inv.payment_term,
          customer: state.customers.find((c) => c.id === inv.customer_id),
        })),
      overdue_installments_list: overdueList,
    }
    return stats
  }

  if (m === 'GET' && path === 'administrations') {
    const scope = getApiDepartmentScope(ctx)
    let items = state.departments
    if (scope != null) items = items.filter((d) => d.id === scope)
    const enriched = items.map((d) => enrichDepartment(state, d))
    return paginate(enriched, params)
  }

  if (m === 'GET' && path.match(/^administrations\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const scope = getApiDepartmentScope(ctx)
    if (scope != null && scope !== id) throw mockError(403, 'غير مصرح بعرض هذه الإدارة')
    const dept = state.departments.find((d) => d.id === id)
    if (!dept) throw mockError(404, 'الإدارة غير موجودة')
    return {
      ...enrichDepartment(state, dept),
      deletion_blockers: buildDeletionBlockers(state, id),
    }
  }

  if (m === 'POST' && path === 'administrations/ensure-hubs') {
    if (ctx.user && !isSuperAdmin(ctx.user)) throw mockError(403, 'غير مصرح')
    const results: Array<{ administration_id: number; warehouse_id: number; warehouse_code: string }> = []
    mutateState((s) => {
      for (const dept of s.departments) {
        const hubCode = `WH-HQ-${dept.id}`
        const existing = s.warehouses.find((w) => w.is_central && w.administration_id === dept.id)
        if (existing) {
          results.push({ administration_id: dept.id, warehouse_id: existing.id, warehouse_code: existing.code })
          continue
        }
        const hubWarehouseId = s.counters.warehouse++
        s.warehouses.push({
          id: hubWarehouseId,
          administration_id: dept.id,
          branch_id: null,
          name: dept.name_ar ?? dept.name,
          name_ar: dept.name_ar ?? dept.name,
          code: hubCode,
          is_active: true,
          is_central: true,
        })
        results.push({ administration_id: dept.id, warehouse_id: hubWarehouseId, warehouse_code: hubCode })
      }
    })
    return { message: 'تم التأكد من المخازن المركزية لجميع الإدارات', count: results.length, data: results }
  }

  if (m === 'POST' && path === 'administrations') {
    if (ctx.user && !isSuperAdmin(ctx.user)) throw mockError(403, 'غير مصرح بإنشاء إدارات')
    const body = data as Partial<Department>
    let created: Department | undefined
    mutateState((s) => {
      const id = s.counters.department++
      const dept: Department = {
        id,
        name: body.name_ar ?? body.name ?? '',
        name_ar: body.name_ar ?? body.name ?? '',
        code: body.code ?? `D${id}`,
        address: body.address ?? null,
        phone: body.phone ?? null,
        is_active: body.is_active ?? true,
      }
      s.departments.push(dept)
      s.departmentStocks.push({ department_id: id, quantity: 0, pending: 0, distributed: 0 })
      const hubWarehouseId = s.counters.warehouse++
      s.warehouses.push({
        id: hubWarehouseId,
        administration_id: id,
        branch_id: null,
        name: dept.name_ar ?? dept.name,
        name_ar: dept.name_ar ?? dept.name,
        code: `WH-HQ-${id}`,
        is_active: true,
        is_central: true,
      })
      created = enrichDepartment(s, dept)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^administrations\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const scope = getApiDepartmentScope(ctx)
    if (scope != null && scope !== id) throw mockError(403, 'غير مصرح بتعديل هذه الإدارة')
    const body = data as Partial<Department>
    let updated: Department | undefined
    mutateState((s) => {
      const dept = s.departments.find((d) => d.id === id)
      if (!dept) throw mockError(404, 'الإدارة غير موجودة')
      if (body.name_ar != null) {
        dept.name_ar = body.name_ar
        dept.name = body.name_ar
      }
      if (body.address != null) dept.address = body.address
      if (body.phone != null) dept.phone = body.phone
      if (body.is_active != null) dept.is_active = body.is_active
      updated = enrichDepartment(s, dept)
    })
    return updated
  }

  if (m === 'DELETE' && path.match(/^administrations\/\d+$/)) {
    if (ctx.user && !isSuperAdmin(ctx.user)) throw mockError(403, 'غير مصرح بحذف إدارات')
    const id = Number(path.split('/')[1])
    const deleteBranches = params.delete_branches === '1' || params.delete_branches === 'true'
    const clearCentralInventory = params.clear_central_inventory === '1' || params.clear_central_inventory === 'true'
    mutateState((s) => {
      const blockers = buildDeletionBlockers(s, id)
      if (blockers.branch_count > 0 && !deleteBranches) {
        throw mockError(422, 'لا يمكن حذف إدارة مرتبطة بفروع')
      }
      if (blockers.central_inventory_clearable > 0 && !clearCentralInventory) {
        throw mockError(422, 'لا يمكن حذف إدارة لها مخزون مركزي')
      }
      if (blockers.central_inventory_locked > 0) {
        throw mockError(422, 'لا يمكن حذف إدارة لها مخزون مركزي مباع أو قيد النقل')
      }
      const linkedBranches = s.branches.filter((b) => b.department_id === id || b.administration_id === id)
      if (deleteBranches) {
        s.branches = s.branches.filter((b) => b.department_id !== id && b.administration_id !== id)
        s.sections = s.sections.filter((section) => {
          const branch = linkedBranches.find((b) => b.id === section.branch_id)
          return !branch
        })
      }
      if (clearCentralInventory) {
        const ds = getDeptStock(s, id)
        ds.quantity = Math.max(0, ds.quantity - ds.pending)
        ds.pending = 0
        ds.distributed = calcDistributed(s, id)
        const centralWarehouse = s.warehouses.find((w) => w.is_central && w.administration_id === id)
        if (centralWarehouse) {
          const stock = getStock(s, centralWarehouse.id)
          if (stock) {
            stock.quantity = 0
          }
        }
      }
      s.departments = s.departments.filter((d) => d.id !== id)
      s.departmentStocks = s.departmentStocks.filter((d) => d.department_id !== id)
      s.warehouses = s.warehouses.filter((w) => !(w.is_central && w.administration_id === id))
    })
    return { message: 'تم الحذف' }
  }

  if (m === 'GET' && path === 'departments') {
    const branchFilter = params['filter[branch_id]']
    let items = state.sections.map((s) => enrichSection(state, s))
    if (branchFilter) {
      items = items.filter((s) => s.branch_id === Number(branchFilter))
    } else {
      const scope = getApiDepartmentScope(ctx)
      if (scope != null) {
        const branchIds = state.branches
          .filter((b) => (b.administration_id ?? b.department_id) === scope)
          .map((b) => b.id)
        items = items.filter((s) => s.branch_id != null && branchIds.includes(s.branch_id))
      }
    }
    return paginate(items, params)
  }

  if (m === 'GET' && path.match(/^departments\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const admin = state.departments.find((d) => d.id === id)
    if (admin) {
      const scope = getApiDepartmentScope(ctx)
      if (scope != null && scope !== id) throw mockError(403, 'غير مصرح بعرض هذه الإدارة')
      return enrichDepartment(state, admin)
    }
    const section = state.sections.find((s) => s.id === id)
    if (!section) throw mockError(404, 'القسم غير موجود')
    return enrichSection(state, section)
  }

  if (m === 'POST' && path === 'departments') {
    const body = data as Partial<Department> & { branch_id?: number }
    if (body.branch_id) {
      let created: ReturnType<typeof enrichSection> | undefined
      mutateState((s) => {
        const id = s.counters.section = (s.counters.section ?? 6) + 1
        const section = {
          id,
          branch_id: body.branch_id,
          name: body.name_ar ?? body.name ?? '',
          name_ar: body.name_ar ?? body.name ?? '',
          code: body.code ?? `S${id}`,
        }
        s.sections.push(section)
        created = enrichSection(s, section)
      })
      return created
    }

    if (ctx.user && !isSuperAdmin(ctx.user)) throw mockError(403, 'غير مصرح بإنشاء إدارات')
    let createdAdmin: Department | undefined
    mutateState((s) => {
      const id = s.counters.department++
      const dept: Department = {
        id,
        name: body.name_ar ?? body.name ?? '',
        name_ar: body.name_ar ?? body.name ?? '',
        code: body.code ?? `D${id}`,
        address: body.address ?? null,
        phone: body.phone ?? null,
        is_active: body.is_active ?? true,
      }
      s.departments.push(dept)
      s.departmentStocks.push({ department_id: id, quantity: 0, pending: 0, distributed: 0 })
      createdAdmin = enrichDepartment(s, dept)
    })
    return createdAdmin
  }

  if (m === 'PUT' && path.match(/^departments\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const body = data as Partial<Department> & { branch_id?: number }
    const section = state.sections.find((s) => s.id === id)
    if (section || body.branch_id != null) {
      let updated: (typeof state.sections)[0] | undefined
      mutateState((s) => {
        const sec = s.sections.find((item) => item.id === id)
        if (!sec) throw mockError(404, 'القسم غير موجود')
        if (body.name_ar != null) {
          sec.name_ar = body.name_ar
          sec.name = body.name_ar
        }
        if (body.branch_id != null) sec.branch_id = body.branch_id
        updated = enrichSection(s, sec)
      })
      return updated
    }

    const scope = getApiDepartmentScope(ctx)
    if (scope != null && scope !== id) throw mockError(403, 'غير مصرح بتعديل هذه الإدارة')
    let updatedAdmin: Department | undefined
    mutateState((s) => {
      const dept = s.departments.find((d) => d.id === id)
      if (!dept) throw mockError(404, 'الإدارة غير موجودة')
      if (body.name_ar != null) {
        dept.name_ar = body.name_ar
        dept.name = body.name_ar
      }
      if (body.address != null) dept.address = body.address
      if (body.phone != null) dept.phone = body.phone
      if (body.is_active != null) dept.is_active = body.is_active
      updatedAdmin = enrichDepartment(s, dept)
    })
    return updatedAdmin
  }

  if (m === 'DELETE' && path.match(/^departments\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const section = state.sections.find((s) => s.id === id)
    if (section) {
      mutateState((s) => {
        s.sections = s.sections.filter((item) => item.id !== id)
      })
      return { message: 'تم الحذف' }
    }

    if (ctx.user && !isSuperAdmin(ctx.user)) throw mockError(403, 'غير مصرح بحذف إدارات')
    const deleteBranches = params.delete_branches === '1' || params.delete_branches === 'true'
    const clearCentralInventory = params.clear_central_inventory === '1' || params.clear_central_inventory === 'true'
    mutateState((s) => {
      const blockers = buildDeletionBlockers(s, id)
      if (blockers.branch_count > 0 && !deleteBranches) {
        throw mockError(422, 'لا يمكن حذف إدارة مرتبطة بفروع')
      }
      if (blockers.central_inventory_clearable > 0 && !clearCentralInventory) {
        throw mockError(422, 'لا يمكن حذف إدارة لها مخزون مركزي')
      }
      if (blockers.central_inventory_locked > 0) {
        throw mockError(422, 'لا يمكن حذف إدارة لها مخزون مركزي مباع أو قيد النقل')
      }
      const linkedBranches = s.branches.filter((b) => b.department_id === id || b.administration_id === id)
      if (deleteBranches) {
        s.branches = s.branches.filter((b) => b.department_id !== id && b.administration_id !== id)
        s.sections = s.sections.filter((section) => {
          const branch = linkedBranches.find((b) => b.id === section.branch_id)
          return !branch
        })
      }
      if (clearCentralInventory) {
        const ds = getDeptStock(s, id)
        ds.quantity = Math.max(0, ds.quantity - ds.pending)
        ds.pending = 0
        ds.distributed = calcDistributed(s, id)
        const centralWarehouse = s.warehouses.find((w) => w.is_central && w.administration_id === id)
        if (centralWarehouse) {
          const stock = getStock(s, centralWarehouse.id)
          if (stock) {
            stock.quantity = 0
          }
        }
      }
      s.departments = s.departments.filter((d) => d.id !== id)
      s.departmentStocks = s.departmentStocks.filter((d) => d.department_id !== id)
      s.warehouses = s.warehouses.filter((w) => !(w.is_central && w.administration_id === id))
    })
    return { message: 'تم الحذف' }
  }

  if (m === 'GET' && path.match(/^branches\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const branch = state.branches.find((b) => b.id === id)
    if (!branch) throw mockError(404, 'الفرع غير موجود')
    const scope = getApiDepartmentScope(ctx)
    const adminId = branch.administration_id ?? branch.department_id
    if (scope != null && adminId !== scope) {
      throw mockError(403, 'غير مصرح بعرض هذا الفرع')
    }
    return {
      ...enrichBranch(state, branch),
      warehouses: state.warehouses.filter((w) => w.branch_id === branch.id),
    }
  }

  if (m === 'GET' && path === 'branches') {
    let items = [...state.branches]
    const scope = getApiDepartmentScope(ctx)
    if (scope != null) {
      items = items.filter((b) => (b.administration_id ?? b.department_id) === scope)
    }
    const deptFilter = params['filter[department_id]']
    const adminFilter = params['filter[administration_id]'] ?? deptFilter
    if (adminFilter) {
      items = items.filter((b) => (b.administration_id ?? b.department_id) === Number(adminFilter))
    }
    return paginate(
      items.map((b) => ({
        ...enrichBranch(state, b),
        warehouses: state.warehouses.filter((w) => w.branch_id === b.id),
      })),
      params,
    )
  }

  if (m === 'POST' && path === 'branches') {
    const body = data as Partial<Branch>
    const adminId = body.administration_id ?? body.department_id
    const scope = getApiDepartmentScope(ctx)
    if (scope != null) {
      if (adminId != null && adminId !== scope) {
        throw mockError(403, 'لا يمكن إنشاء فرع خارج إدارتك')
      }
      body.administration_id = scope
      body.department_id = scope
    }
    let created: Branch | undefined
    mutateState((s) => {
      const resolvedAdminId = body.administration_id ?? body.department_id
      if (!resolvedAdminId) throw mockError(422, 'يجب اختيار الإدارة')
      const id = s.counters.branch++
      const whId = s.counters.warehouse++
      const branch: Branch = {
        id,
        administration_id: resolvedAdminId,
        department_id: resolvedAdminId,
        name: body.name_ar ?? body.name ?? '',
        name_ar: body.name_ar ?? body.name ?? '',
        code: body.code ?? `B${id}`,
        address: body.address ?? null,
        phone: body.phone ?? null,
        is_active: body.is_active ?? true,
      }
      s.branches.push(branch)
      s.warehouses.push({
        id: whId,
        branch_id: id,
        name: `${branch.name} Store`,
        name_ar: `مخزن ${branch.name_ar}`,
        code: `WH-${branch.code}`,
        is_active: true,
        is_central: false,
      })
      s.stocks.push({
        id: whId,
        warehouse_id: whId,
        branch_id: id,
        quantity: 0,
        reserved: 0,
        sold: 0,
      })
      created = enrichBranch(s, branch)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^branches\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const body = data as Partial<Branch>
    let updated: Branch | undefined
    mutateState((s) => {
      const branch = s.branches.find((b) => b.id === id)
      if (!branch) throw mockError(404, 'الفرع غير موجود')
      if (body.name_ar != null) {
        branch.name_ar = body.name_ar
        branch.name = body.name_ar
      }
      if (body.address != null) branch.address = body.address
      if (body.phone != null) branch.phone = body.phone
      if (body.is_active != null) branch.is_active = body.is_active
      const adminId = body.administration_id ?? body.department_id
      if (adminId != null) {
        branch.administration_id = adminId
        branch.department_id = adminId
      }
      updated = enrichBranch(s, branch)
    })
    return updated
  }

  if (m === 'DELETE' && path.match(/^branches\/\d+$/)) {
    const id = Number(path.split('/')[1])
    mutateState((s) => {
      const stock = getStockByBranch(s, id)
      if (stock && (stock.quantity > 0 || stock.reserved > 0 || stock.sold > 0)) {
        throw mockError(422, 'لا يمكن حذف فرع له مخزون أو حركات')
      }
      const hasInvoices = s.invoices.some((i) => i.branch_id === id)
      if (hasInvoices) throw mockError(422, 'لا يمكن حذف فرع مرتبط بفواتير')
      s.branches = s.branches.filter((b) => b.id !== id)
      s.warehouses = s.warehouses.filter((w) => w.branch_id !== id)
      s.stocks = s.stocks.filter((st) => st.branch_id !== id)
    })
    return { message: 'تم الحذف' }
  }

  if (m === 'POST' && path === 'department-stock/add') {
    const body = data as { department_id: number; quantity: number }
    let result: ReturnType<typeof enrichDepartment> & { stock_receipt?: unknown } | undefined
    mutateState((s) => {
      const ds = getDeptStock(s, body.department_id)
      ds.quantity += body.quantity
      ds.pending += body.quantity
      ds.distributed = calcDistributed(s, body.department_id)
      const dept = s.departments.find((d) => d.id === body.department_id)
      if (!dept) throw mockError(404, 'الإدارة غير موجودة')
      const receiptId = s.counters.stockReceipt = (s.counters.stockReceipt ?? 0) + 1
      const receipt = {
        id: receiptId,
        administration_id: body.department_id,
        quantity: body.quantity,
        received_by: ctx.user?.id ?? null,
        created_at: new Date().toISOString(),
        administration: { id: dept.id, name: dept.name, name_ar: dept.name_ar, code: dept.code },
        receivedBy: ctx.user ? { id: ctx.user.id, name: ctx.user.name } : undefined,
      }
      if (!s.stockReceipts) s.stockReceipts = []
      s.stockReceipts.unshift(receipt)
      result = { ...enrichDepartment(s, dept), stock_receipt: receipt }
    })
    return result
  }

  if (m === 'GET' && path === 'stock-receipts') {
    const items = (state.stockReceipts ?? []).map((receipt) => ({
      ...receipt,
      administration: state.departments.find((d) => d.id === receipt.administration_id),
      receivedBy: receipt.receivedBy,
    }))
    return paginate(items, params)
  }

  if (m === 'GET' && path === 'stock-transfers') {
    let items = [...(state.stockTransfers ?? [])]
    const kind = params['filter[transfer_kind]']
    if (kind) {
      items = items.filter((transfer) => transfer.transfer_kind === kind)
    }
    return paginate(items, params)
  }

  if (m === 'POST' && path === 'department-stock/distribute') {
    const body = data as { department_id: number; branch_id: number; quantity: number }
    let result: GpsStock & { transfer?: unknown } | undefined
    mutateState((s) => {
      const branch = s.branches.find((b) => b.id === body.branch_id)
      if (!branch || branch.department_id !== body.department_id) {
        throw mockError(422, 'الفرع غير تابع لهذه الإدارة')
      }
      const ds = getDeptStock(s, body.department_id)
      if (body.quantity <= 0 || body.quantity > ds.pending) {
        throw mockError(422, `الكمية المعلقة المتاحة ${ds.pending} قطعة فقط`)
      }
      ds.pending -= body.quantity

      let stock = getStockByBranch(s, body.branch_id)
      if (!stock) {
        const wh = s.warehouses.find((w) => w.branch_id === body.branch_id)
        if (!wh) throw mockError(404, 'مخزن الفرع غير موجود')
        stock = {
          id: wh.id,
          warehouse_id: wh.id,
          branch_id: body.branch_id,
          quantity: 0,
          reserved: 0,
          sold: 0,
        }
        s.stocks.push(stock)
      }
      stock.quantity += body.quantity
      ds.distributed = calcDistributed(s, body.department_id)
      const transferId = s.counters.stockTransfer = (s.counters.stockTransfer ?? 0) + 1
      const dept = s.departments.find((d) => d.id === body.department_id)
      const transfer = {
        id: transferId,
        transfer_number: `TRF-${String(transferId).padStart(6, '0')}`,
        transfer_kind: 'distribution',
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        from_warehouse: {
          administration: dept ? { id: dept.id, name: dept.name, name_ar: dept.name_ar } : undefined,
        },
        to_warehouse: {
          branch: branch ? { id: branch.id, name: branch.name, name_ar: branch.name_ar } : undefined,
        },
        requester: ctx.user ? { id: ctx.user.id, name: ctx.user.name } : undefined,
        lines: Array.from({ length: body.quantity }, (_, index) => ({ id: index + 1, product_unit_id: index + 1 })),
      }
      if (!s.stockTransfers) s.stockTransfers = []
      s.stockTransfers.unshift(transfer)
      result = {
        ...stock,
        available: stock.quantity - stock.reserved,
        transfer: {
          id: transfer.id,
          transfer_number: transfer.transfer_number,
          completed_at: transfer.completed_at,
          quantity: body.quantity,
          transfer_kind: 'distribution',
        },
      }
    })
    return result
  }

  if (m === 'POST' && path === 'department-stock/return') {
    const body = data as { department_id: number; branch_id: number; quantity: number }
    let result: GpsStock & { transfer?: unknown; branch_available?: number; central_pending?: number } | undefined
    mutateState((s) => {
      const branch = s.branches.find((b) => b.id === body.branch_id)
      if (!branch || branch.department_id !== body.department_id) {
        throw mockError(422, 'الفرع غير تابع لهذه الإدارة')
      }
      const stock = getStockByBranch(s, body.branch_id)
      const available = stock ? stock.quantity - stock.reserved : 0
      if (body.quantity <= 0 || body.quantity > available) {
        throw mockError(422, `المخزون المتاح في الفرع ${available} قطعة فقط`)
      }

      const ds = getDeptStock(s, body.department_id)
      ds.pending += body.quantity
      if (stock) {
        stock.quantity -= body.quantity
      }
      ds.distributed = calcDistributed(s, body.department_id)

      const transferId = s.counters.stockTransfer = (s.counters.stockTransfer ?? 0) + 1
      const dept = s.departments.find((d) => d.id === body.department_id)
      const transfer = {
        id: transferId,
        transfer_number: `TRF-${String(transferId).padStart(6, '0')}`,
        transfer_kind: 'return',
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        from_warehouse: {
          branch: branch ? { id: branch.id, name: branch.name, name_ar: branch.name_ar } : undefined,
        },
        to_warehouse: {
          administration: dept ? { id: dept.id, name: dept.name, name_ar: dept.name_ar } : undefined,
        },
        requester: ctx.user ? { id: ctx.user.id, name: ctx.user.name } : undefined,
        lines: Array.from({ length: body.quantity }, (_, index) => ({ id: index + 1, product_unit_id: index + 1 })),
      }
      if (!s.stockTransfers) s.stockTransfers = []
      s.stockTransfers.unshift(transfer)

      const branchAvailable = stock ? stock.quantity - stock.reserved : 0
      result = {
        ...(stock ?? {
          id: 0,
          warehouse_id: 0,
          branch_id: body.branch_id,
          quantity: 0,
          reserved: 0,
          sold: 0,
        }),
        available: branchAvailable,
        branch_available: branchAvailable,
        central_pending: ds.pending,
        transfer: {
          id: transfer.id,
          transfer_number: transfer.transfer_number,
          completed_at: transfer.completed_at,
          quantity: body.quantity,
          transfer_kind: 'return',
        },
      }
    })
    return result
  }

  if (m === 'GET' && path === 'inventory/overview') {
    const scope = getApiDepartmentScope(ctx)
    const deptFilter = scope ?? (params['filter[department_id]']
      ? Number(params['filter[department_id]'])
      : undefined)
    const rows = buildInventoryOverview(state, deptFilter)
    return paginate(rows, params)
  }

  if (m === 'GET' && path === 'warehouses') {
    let items = [...state.warehouses]
    const branchFilter = params['filter[branch_id]']
    const administrationFilter = params['filter[administration_id]']
    if (branchFilter) {
      items = items.filter((w) => w.branch_id === Number(branchFilter))
    }
    if (administrationFilter) {
      const adminId = Number(administrationFilter)
      items = items.filter((w) => {
        if (w.is_central && w.administration_id === adminId) return true
        const branch = state.branches.find((b) => b.id === w.branch_id)
        return branch?.administration_id === adminId || branch?.department_id === adminId
      })
    }
    return paginate(items.map((w) => {
      const branch = w.branch_id != null ? state.branches.find((b) => b.id === w.branch_id) : undefined
      const administration = w.is_central && w.administration_id != null
        ? state.departments.find((d) => d.id === w.administration_id)
        : branch
          ? state.departments.find((d) => d.id === (branch.administration_id ?? branch.department_id))
          : undefined
      return {
        ...w,
        administration: administration
          ? { id: administration.id, name: administration.name, name_ar: administration.name_ar, code: administration.code }
          : undefined,
        branch: branch
          ? {
              ...branch,
              administration: administration
                ? { id: administration.id, name: administration.name, name_ar: administration.name_ar }
                : undefined,
            }
          : undefined,
      }
    }))
  }

  if (m === 'GET' && path === 'gps-product') {
    return state.gpsProduct
  }

  if (m === 'PUT' && path === 'gps-product') {
    const body = data as {
      name?: string
      name_ar?: string | null
      brand?: string | null
      model_code?: string
      cost_price?: number | null
      sell_price?: number
      cash_price?: number
      installment_price?: number
      external_cash_annual_price?: number
      external_cash_permanent_price?: number
      external_installment_annual_price?: number
      external_installment_permanent_price?: number
    }
    let updated = state.gpsProduct
    mutateState((s) => {
      const hasProduct = Boolean(s.gpsProduct?.id)
      const cashPrice = body.cash_price ?? body.sell_price
      const installmentPrice = body.installment_price ?? cashPrice

      if (!hasProduct) {
        if (!body.name_ar?.trim()) {
          throw mockError(422, 'اسم المنتج مطلوب')
        }
        if (cashPrice == null || cashPrice <= 0) {
          throw mockError(422, 'سعر البيع يجب أن يكون أكبر من صفر')
        }
        const nameAr = body.name_ar.trim()
        s.gpsProduct = {
          id: 1,
          name: nameAr,
          name_ar: nameAr,
          brand: body.brand ?? null,
          model_code: 'GPS-PRO',
          cost_price: null,
          sell_price: cashPrice,
          cash_price: cashPrice,
          installment_price: installmentPrice ?? cashPrice,
          external_cash_annual_price: body.external_cash_annual_price ?? cashPrice,
          external_cash_permanent_price: body.external_cash_permanent_price ?? cashPrice,
          external_installment_annual_price:
            body.external_installment_annual_price ?? installmentPrice ?? cashPrice,
          external_installment_permanent_price:
            body.external_installment_permanent_price ?? installmentPrice ?? cashPrice,
        }
        updated = { ...s.gpsProduct }
        return
      }

      if (cashPrice == null || cashPrice <= 0) {
        throw mockError(422, 'سعر البيع يجب أن يكون أكبر من صفر')
      }
      s.gpsProduct = {
        ...s.gpsProduct,
        name: body.name_ar?.trim() ?? body.name?.trim() ?? s.gpsProduct.name,
        name_ar: body.name_ar !== undefined ? body.name_ar : s.gpsProduct.name_ar,
        brand: body.brand !== undefined ? body.brand : s.gpsProduct.brand,
        cost_price: body.cost_price !== undefined ? body.cost_price : s.gpsProduct.cost_price,
        sell_price: cashPrice,
        cash_price: cashPrice,
        installment_price: installmentPrice ?? s.gpsProduct.installment_price ?? cashPrice,
        external_cash_annual_price:
          body.external_cash_annual_price ?? s.gpsProduct.external_cash_annual_price ?? cashPrice,
        external_cash_permanent_price:
          body.external_cash_permanent_price ?? s.gpsProduct.external_cash_permanent_price ?? cashPrice,
        external_installment_annual_price:
          body.external_installment_annual_price
          ?? s.gpsProduct.external_installment_annual_price
          ?? installmentPrice
          ?? cashPrice,
        external_installment_permanent_price:
          body.external_installment_permanent_price
          ?? s.gpsProduct.external_installment_permanent_price
          ?? installmentPrice
          ?? cashPrice,
      }
      updated = { ...s.gpsProduct }
    })
    return updated
  }

  if (m === 'GET' && path === 'gps-stock') {
    const warehouseId = Number(params['filter[warehouse_id]'] || ctx.warehouseId)
    const stock = getStock(state, warehouseId)
    if (!stock) throw mockError(404, 'المخزن غير موجود')
    return {
      ...stock,
      product: state.gpsProduct,
      warehouse: state.warehouses.find((w) => w.id === warehouseId),
      available: stock.quantity - stock.reserved,
    }
  }

  if (m === 'POST' && path === 'gps-stock/add') {
    throw mockError(422, 'أضف الكمية من صفحة الإدارات ثم وزّع على الفروع')
  }

  if (m === 'GET' && path === 'customers') {
    let items = [...state.customers]
    const scopedBranchIds = getScopedBranchIds(state, ctx)
    if (scopedBranchIds) {
      items = items.filter((c) => c.branch_id != null && scopedBranchIds.includes(c.branch_id))
    }
    const administrationFilter = params['filter[administration_id]']
    const branchFilter = params['filter[branch_id]']
    if (administrationFilter) {
      const adminId = Number(administrationFilter)
      items = items.filter((c) => matchesBranchAdministration(state, c.branch_id, adminId))
    } else if (branchFilter) {
      items = items.filter((c) => c.branch_id === Number(branchFilter))
    }
    const distributorFilter = params['filter[distributor_id]']
    if (distributorFilter) {
      items = items.filter((c) => c.distributor_id === Number(distributorFilter))
    }
    const statusFilter = params['filter[status]']
    if (statusFilter) items = items.filter((c) => c.status === statusFilter)
    const nameFilter = params['filter[name]']
    if (nameFilter) {
      const q = nameFilter.toLowerCase()
      items = items.filter((c) => c.name.toLowerCase().includes(q))
    }
    const phoneFilter = params['filter[phone]']
    if (phoneFilter) {
      const q = phoneFilter.replace(/\s/g, '')
      items = items.filter((c) =>
        customerAllPhoneNumbers(c).some((phone) => phone.replace(/\s/g, '').includes(q)),
      )
    }
    return paginate(
      items.map((customer) => {
        const distributor = state.distributors.find((d) => d.id === customer.distributor_id)
        const branch = state.branches.find((b) => b.id === customer.branch_id)
        return {
          ...customer,
          branch: branch ?? undefined,
          distributor: distributor
            ? { ...distributor, branch: state.branches.find((b) => b.id === distributor.branch_id) }
            : undefined,
        }
      }),
    )
  }

  if (m === 'POST' && path === 'customers') {
    const body = data as Partial<Customer> & { guarantors?: Omit<Guarantor, 'id'>[] }
    const branchId = body.branch_id ?? null
    if (branchId != null && !isBranchInScope(state, ctx, branchId)) {
      throw mockError(403, 'لا يمكنك إضافة عميل خارج إدارتك')
    }
    let created: Customer | undefined
    mutateState((s) => {
      const customer: Customer = {
        id: s.counters.customer++,
        branch_id: branchId,
        distributor_id: null,
        name: body.name ?? '',
        phone: body.phone ?? '',
        phone_label: body.phone_label ?? null,
        phone_2: body.phone_2 ?? null,
        phone_2_label: body.phone_2_label ?? null,
        phone_3: body.phone_3 ?? null,
        phone_3_label: body.phone_3_label ?? null,
        extra_phones: body.extra_phones ?? null,
        sim_number: body.sim_number ?? null,
        username: body.username ?? null,
        device_serial: body.device_serial ?? null,
        national_id: body.national_id ?? null,
        address: body.address ?? null,
        distinctive_mark: body.distinctive_mark ?? null,
        city: body.city ?? null,
        status: 'active',
        credit_score: 70,
        guarantors: (body.guarantors ?? []).map((g, index) => ({
          id: index + 1,
          name: g.name,
          phone: g.phone,
          national_id: g.national_id ?? null,
          address: g.address ?? null,
          relationship: g.relationship ?? null,
        })),
      }
      s.customers.push(customer)
      created = customer
    })
    return enrichCustomer(state, created!)
  }

  if (m === 'GET' && path.match(/^customers\/\d+\/media$/)) {
    const customerId = Number(path.split('/')[1])
    const customer = state.customers.find((c) => c.id === customerId)
    if (!customer) throw mockError(404, 'العميل غير موجود')
    const media = getCustomerMedia(state).filter((m) => m.customer_id === customerId)
    return { data: media }
  }

  if (m === 'POST' && path.match(/^customers\/\d+\/media$/)) {
    const customerId = Number(path.split('/')[1])
    const customer = state.customers.find((c) => c.id === customerId)
    if (!customer) throw mockError(404, 'العميل غير موجود')

    let fileName = 'attachment.pdf'
    let description: string | null = null
    if (data instanceof FormData) {
      const file = data.get('file')
      if (file && typeof file === 'object' && 'name' in file) {
        fileName = String((file as File).name)
      }
      const desc = data.get('description')
      if (typeof desc === 'string' && desc.trim()) description = desc.trim()
    }

    let created: MediaFile | undefined
    mutateState((s) => {
      const mediaCounter = (s.counters as { media?: number }).media ?? 0
      ;(s.counters as { media?: number }).media = mediaCounter + 1
      const item: MediaFile & { customer_id: number } = {
        id: mediaCounter + 1,
        customer_id: customerId,
        file_name: fileName,
        mime_type: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        size: 1024,
        description,
        url: `https://demo.local/media/${customerId}/${encodeURIComponent(fileName)}`,
        uploaded_by: ctx.user?.id ?? null,
        created_at: new Date().toISOString(),
      }
      getCustomerMedia(s).push(item)
      created = item
    })
    return created
  }

  if (m === 'DELETE' && path.match(/^customers\/\d+\/media\/\d+$/)) {
    const parts = path.split('/')
    const customerId = Number(parts[1])
    const mediaId = Number(parts[3])
    mutateState((s) => {
      const list = getCustomerMedia(s)
      const index = list.findIndex((m) => m.id === mediaId && m.customer_id === customerId)
      if (index === -1) throw mockError(404, 'المرفق غير موجود')
      list.splice(index, 1)
    })
    return { message: 'تم حذف المرفق.' }
  }

  if (m === 'POST' && path.match(/^customers\/\d+\/profile-photo$/)) {
    const customerId = Number(path.split('/')[1])
    let photoUrl: string | null = null
    mutateState((s) => {
      const customer = s.customers.find((c) => c.id === customerId)
      if (!customer) throw mockError(404, 'العميل غير موجود')
      const file = (data as FormData | undefined)?.get?.('photo')
      if (file && typeof file === 'object' && 'name' in file) {
        photoUrl = URL.createObjectURL(file as File)
      } else {
        photoUrl = `https://demo.local/profile/customer-${customerId}.jpg`
      }
      customer.profile_photo_url = photoUrl
    })
    return { profile_photo_url: photoUrl }
  }

  if (m === 'DELETE' && path.match(/^customers\/\d+\/profile-photo$/)) {
    const customerId = Number(path.split('/')[1])
    mutateState((s) => {
      const customer = s.customers.find((c) => c.id === customerId)
      if (!customer) throw mockError(404, 'العميل غير موجود')
      customer.profile_photo_url = null
    })
    return { profile_photo_url: null }
  }

  if (m === 'GET' && path.match(/^customers\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const customer = state.customers.find((c) => c.id === id)
    if (!customer) throw mockError(404, 'العميل غير موجود')
    if (!isBranchInScope(state, ctx, customer.branch_id)) throw mockError(404, 'العميل غير موجود')
    const invoiceStatus = (params.sales_invoice_status as 'confirmed' | 'unconfirmed' | 'all') || 'confirmed'
    return enrichCustomer(state, customer, invoiceStatus)
  }

  if ((m === 'PATCH' || m === 'PUT') && path.match(/^customers\/\d+$/)) {
    const customerId = Number(path.split('/')[1])
    const body = data as Partial<Customer> & { guarantors?: Omit<Guarantor, 'id'>[] }
    let updated: Customer | undefined
    mutateState((s) => {
      const customer = s.customers.find((c) => c.id === customerId)
      if (!customer) throw mockError(404, 'العميل غير موجود')
      if (body.branch_id !== undefined) {
        if (body.branch_id != null && !isBranchInScope(s, ctx, body.branch_id)) {
          throw mockError(403, 'لا يمكنك ربط العميل بهذا الفرع')
        }
        customer.branch_id = body.branch_id ?? null
      }
      if (body.name !== undefined) customer.name = body.name
      if (body.phone !== undefined) customer.phone = body.phone
      if (body.phone_label !== undefined) customer.phone_label = body.phone_label ?? null
      if (body.phone_2 !== undefined) customer.phone_2 = body.phone_2 ?? null
      if (body.phone_2_label !== undefined) customer.phone_2_label = body.phone_2_label ?? null
      if (body.phone_3 !== undefined) customer.phone_3 = body.phone_3 ?? null
      if (body.phone_3_label !== undefined) customer.phone_3_label = body.phone_3_label ?? null
      if (body.extra_phones !== undefined) customer.extra_phones = body.extra_phones ?? null
      if (body.national_id !== undefined) customer.national_id = body.national_id ?? null
      if (body.address !== undefined) customer.address = body.address ?? null
      if (body.distinctive_mark !== undefined) customer.distinctive_mark = body.distinctive_mark ?? null
      if (body.guarantors !== undefined) {
        customer.guarantors = body.guarantors.map((g, index) => ({
          id: index + 1,
          name: g.name,
          phone: g.phone,
          national_id: g.national_id ?? null,
          address: g.address ?? null,
          relationship: g.relationship ?? null,
        }))
      }
      updated = customer
    })
    return enrichCustomer(loadState(), updated!)
  }

  if (m === 'GET' && path === 'daily-branch-reports') {
    let items = [...(state.dailyBranchReports ?? [])]
    const scopedBranchIds = getScopedBranchIds(state, ctx)
    if (scopedBranchIds) {
      items = items.filter((r) => scopedBranchIds.includes(r.branch_id))
    }
    const branchFilter = params['filter[branch_id]']
    if (branchFilter) items = items.filter((r) => r.branch_id === Number(branchFilter))
    const dateFilter = params['filter[report_date]']
    if (dateFilter) items = items.filter((r) => r.report_date === dateFilter)
    return paginate(
      items.map((report) => ({
        ...report,
        branch: state.branches.find((b) => b.id === report.branch_id),
      })),
    )
  }

  if (m === 'GET' && path.match(/^daily-branch-reports\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const report = state.dailyBranchReports?.find((r) => r.id === id)
    if (!report) throw mockError(404, 'البيان غير موجود')
    if (!isBranchInScope(state, ctx, report.branch_id)) throw mockError(404, 'البيان غير موجود')
    return {
      ...report,
      branch: state.branches.find((b) => b.id === report.branch_id),
    }
  }

  if (m === 'POST' && path === 'daily-branch-reports') {
    const body = data as Partial<DailyBranchReport>
    const branchId = body.branch_id ?? ctx.branchId ?? 1
    if (!isBranchInScope(state, ctx, branchId)) throw mockError(403, 'خارج نطاق الفرع')
    let saved: DailyBranchReport | undefined
    mutateState((s) => {
      if (!s.dailyBranchReports) s.dailyBranchReports = []
      const existing = s.dailyBranchReports.find(
        (r) => r.branch_id === branchId && r.report_date === body.report_date,
      )
      if (existing) {
        Object.assign(existing, body, { branch_id: branchId })
        saved = existing
        return
      }
      saved = {
        id: s.counters.dailyBranchReport++,
        branch_id: branchId,
        report_date: body.report_date ?? new Date().toISOString().split('T')[0],
        total_amount: body.total_amount ?? 0,
        expenses_total: body.expenses_total ?? 0,
        net_amount: body.net_amount ?? 0,
        installations_count: body.installations_count ?? 0,
        devices_actual: body.devices_actual ?? 0,
        devices_reserved: body.devices_reserved ?? 0,
        devices_customer: body.devices_customer ?? 0,
        devices_software: body.devices_software ?? 0,
        accessories_tape: body.accessories_tape ?? 0,
        accessories_cable_ties: body.accessories_cable_ties ?? 0,
        accessories_bulb: body.accessories_bulb ?? 0,
        percentage: body.percentage ?? null,
        devices_entering_count: body.devices_entering_count ?? null,
        notes: body.notes ?? null,
        vodafone_transfers_count: body.vodafone_transfers_count ?? 0,
        vodafone_transfers_total: body.vodafone_transfers_total ?? 0,
        vodafone_other_notes: body.vodafone_other_notes ?? null,
        renewal_notes: body.renewal_notes ?? null,
        reviewer_name: body.reviewer_name ?? null,
        branch_manager_name: body.branch_manager_name ?? null,
        attendance: body.attendance ?? [],
        transactions: body.transactions ?? [],
        transfers: body.transfers ?? [],
        expense_lines: body.expense_lines ?? [],
        movements: body.movements ?? [],
      }
      s.dailyBranchReports.push(saved!)
    })
    return {
      ...saved!,
      branch: state.branches.find((b) => b.id === branchId),
    }
  }

  if (m === 'PUT' && path.match(/^daily-branch-reports\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const body = data as Partial<DailyBranchReport>
    let updated: DailyBranchReport | undefined
    mutateState((s) => {
      const report = s.dailyBranchReports?.find((r) => r.id === id)
      if (!report) throw mockError(404, 'البيان غير موجود')
      Object.assign(report, body)
      updated = report
    })
    return {
      ...updated!,
      branch: state.branches.find((b) => b.id === updated!.branch_id),
    }
  }

  if (m === 'GET' && path === 'distributors') {
    let items = [...state.distributors]
    const scopedBranchIds = getScopedBranchIds(state, ctx)
    if (scopedBranchIds) {
      items = items.filter((d) => scopedBranchIds.includes(d.branch_id))
    }
    const administrationFilter = params['filter[administration_id]']
    const branchFilter = params['filter[branch_id]']
    if (administrationFilter) {
      const adminId = Number(administrationFilter)
      items = items.filter((d) => matchesBranchAdministration(state, d.branch_id, adminId))
    } else if (branchFilter) {
      items = items.filter((d) => d.branch_id === Number(branchFilter))
    }
    const statusFilter = params['filter[status]']
    if (statusFilter) items = items.filter((d) => d.status === statusFilter)
    const typeFilter = params['filter[type]']
    if (typeFilter) items = items.filter((d) => d.type === typeFilter)
    const nameFilter = params['filter[name]']
    if (nameFilter) {
      const q = nameFilter.toLowerCase()
      items = items.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.name_ar ?? '').toLowerCase().includes(q),
      )
    }
    const codeFilter = params['filter[code]']
    if (codeFilter) {
      const q = codeFilter.toLowerCase()
      items = items.filter((d) => d.code.toLowerCase().includes(q))
    }

    return paginate(
      items.map((distributor) => enrichDistributor(state, distributor)),
    )
  }

  if (m === 'POST' && path === 'distributors') {
    const body = data as Partial<Distributor>
    const branchId = body.branch_id ?? ctx.branchId ?? 1
    if (!isBranchInScope(state, ctx, branchId)) {
      throw mockError(403, 'لا يمكنك إضافة موزع خارج إدارتك')
    }
    if (!body.code || !body.name) {
      throw mockError(422, 'كود الموزع والاسم مطلوبان')
    }
    if (state.distributors.some((d) => d.code === body.code)) {
      throw mockError(422, 'كود الموزع مستخدم بالفعل')
    }
    if (body.customer_id != null) {
      const linked = state.distributors.find((d) => d.customer_id === body.customer_id)
      if (linked) {
        throw mockError(422, 'هذا العميل مرتبط بموزع آخر بالفعل')
      }
    }

    let created: Distributor | undefined
    mutateState((s) => {
      created = {
        id: s.counters.distributor++,
        branch_id: branchId,
        code: body.code!,
        name: body.name!,
        name_ar: body.name_ar ?? null,
        phone: body.phone ?? null,
        address: body.address ?? null,
        type: body.type ?? 'free',
        customer_id: body.customer_id ?? null,
        status: body.status ?? 'active',
        agreed_amount: body.agreed_amount ?? 0,
        commission_percent: body.commission_percent ?? 0,
        notes: body.notes ?? null,
      }
      s.distributors.push(created)
    })
    return enrichDistributor(state, created!)
  }

  if ((m === 'PATCH' || m === 'PUT') && path.match(/^distributors\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const body = data as Partial<Distributor>
    const distributor = state.distributors.find((d) => d.id === id)
    if (!distributor) throw mockError(404, 'الموزع غير موجود')
    if (!isBranchInScope(state, ctx, distributor.branch_id)) {
      throw mockError(404, 'الموزع غير موجود')
    }
    if (body.customer_id != null) {
      const linked = state.distributors.find(
        (d) => d.customer_id === body.customer_id && d.id !== id,
      )
      if (linked) {
        throw mockError(422, 'هذا العميل مرتبط بموزع آخر بالفعل')
      }
    }

    let updated: Distributor | undefined
    mutateState((s) => {
      const index = s.distributors.findIndex((d) => d.id === id)
      if (index === -1) return
      updated = {
        ...s.distributors[index],
        ...body,
        id,
        branch_id: s.distributors[index].branch_id,
      }
      s.distributors[index] = updated
    })
    return enrichDistributor(state, updated!)
  }

  if (m === 'GET' && path.match(/^distributors\/\d+\/commission-ledger$/)) {
    const id = Number(path.split('/')[1])
    const distributor = state.distributors.find((d) => d.id === id)
    if (!distributor) throw mockError(404, 'الموزع غير موجود')
    const items = (state.distributorCommissionLedger ?? []).filter((e) => e.distributor_id === id)
    return paginate(items, params)
  }

  if (m === 'GET' && path.match(/^distributors\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const distributor = state.distributors.find((d) => d.id === id)
    if (!distributor) throw mockError(404, 'الموزع غير موجود')
    if (!isBranchInScope(state, ctx, distributor.branch_id)) {
      throw mockError(404, 'الموزع غير موجود')
    }
    return enrichDistributor(state, distributor)
  }

  if (m === 'GET' && path === 'contract-templates') {
    return CONTRACT_TEMPLATES
  }

  if (m === 'GET' && path.match(/^contract-templates\/[^/]+\/preview$/)) {
    const key = path.split('/')[1]
    if (!CONTRACT_TEMPLATES.some((template) => template.key === key)) {
      throw mockError(404, 'نموذج العقد غير موجود')
    }
    return mockContractPreviewHtml(key)
  }

  if (m === 'GET' && path === 'services') {
    let items = [...(state.services ?? [])]
    const categoryFilter = params['filter[category]']
    if (categoryFilter) items = items.filter((s) => s.category === categoryFilter)
    const activeFilter = params['filter[is_active]']
    if (activeFilter != null) {
      const active = activeFilter === '1' || activeFilter === 'true'
      items = items.filter((s) => s.is_active === active)
    }
    const nameFilter = params['filter[name]']
    if (nameFilter) {
      const q = nameFilter.toLowerCase()
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) || (s.name_ar ?? '').toLowerCase().includes(q),
      )
    }
    items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    return paginate(items, params)
  }

  if (m === 'POST' && path === 'services') {
    const body = data as Partial<Service>
    if (!body.name?.trim()) throw mockError(422, 'اسم الخدمة مطلوب')
    if (body.code && (state.services ?? []).some((s) => s.code === body.code)) {
      throw mockError(422, 'كود الخدمة مستخدم بالفعل')
    }
    let created: Service | undefined
    mutateState((s) => {
      if (!s.services) s.services = []
      created = {
        id: s.counters.service++,
        code: body.code?.trim() || null,
        name: body.name!.trim(),
        name_ar: body.name_ar?.trim() || body.name!.trim(),
        category: body.category ?? 'other',
        default_price: Number(body.default_price ?? 0),
        is_active: body.is_active ?? true,
        description: body.description?.trim() || null,
        contract_template_key: body.contract_template_key?.trim() || null,
      }
      s.services.push(created)
    })
    return created
  }

  if (m === 'GET' && path.match(/^services\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const service = (state.services ?? []).find((s) => s.id === id)
    if (!service) throw mockError(404, 'الخدمة غير موجودة')
    return service
  }

  if (m === 'PUT' && path.match(/^services\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const body = data as Partial<Service>
    if (
      body.code &&
      (state.services ?? []).some((s) => s.code === body.code && s.id !== id)
    ) {
      throw mockError(422, 'كود الخدمة مستخدم بالفعل')
    }
    let updated: Service | undefined
    mutateState((s) => {
      const service = (s.services ?? []).find((item) => item.id === id)
      if (!service) throw mockError(404, 'الخدمة غير موجودة')
      if (body.code !== undefined) service.code = body.code?.trim() || null
      if (body.name != null) service.name = body.name.trim()
      if (body.name_ar !== undefined) service.name_ar = body.name_ar?.trim() || null
      if (body.category != null) service.category = body.category
      if (body.default_price != null) service.default_price = Number(body.default_price)
      if (body.is_active != null) service.is_active = body.is_active
      if (body.description !== undefined) service.description = body.description?.trim() || null
      if (body.contract_template_key !== undefined) {
        service.contract_template_key = body.contract_template_key?.trim() || null
      }
      updated = service
    })
    return updated
  }

  if (m === 'DELETE' && path.match(/^services\/\d+$/)) {
    const id = Number(path.split('/')[1])
    mutateState((s) => {
      s.services = (s.services ?? []).filter((service) => service.id !== id)
    })
    return { message: 'تم حذف الخدمة' }
  }

  if (m === 'GET' && path === 'sales-invoices') {
    let items = [...state.invoices]
    const scopedBranchIds = getScopedBranchIds(state, ctx)
    if (scopedBranchIds != null) {
      items = items.filter((i) => i.branch_id != null && scopedBranchIds.includes(i.branch_id))
    }
    const branchFilter = params['filter[branch_id]']
    if (branchFilter) items = items.filter((i) => i.branch_id === Number(branchFilter))
    const statusFilter = params['filter[status]']
    if (statusFilter) items = items.filter((i) => i.status === statusFilter)
    const reviewStatusFilter = params['filter[review_status]']
    if (reviewStatusFilter) {
      items = items.filter((i) => (i.review_status ?? 'pending') === reviewStatusFilter)
    }
    const contractKindFilter = params['filter[contract_kind]']
    if (contractKindFilter) {
      items = items.filter((i) => (i.contract_kind ?? 'new_contract') === contractKindFilter)
    }
    const dateFrom = params['filter[invoice_date_from]']
    if (dateFrom) items = items.filter((i) => String(i.invoice_date) >= String(dateFrom))
    const dateTo = params['filter[invoice_date_to]']
    if (dateTo) items = items.filter((i) => String(i.invoice_date) <= String(dateTo))
    items.sort((a, b) => {
      const aTime = new Date(a.confirmed_at ?? a.invoice_date ?? 0).getTime()
      const bTime = new Date(b.confirmed_at ?? b.invoice_date ?? 0).getTime()
      return bTime - aTime || b.id - a.id
    })
    return paginate(
      items.map((inv) => ({
        ...inv,
        customer: state.customers.find((c) => c.id === inv.customer_id),
        distributor: state.distributors.find((d) => d.id === inv.distributor_id),
      })),
    )
  }

  if (m === 'GET' && path.match(/^sales-invoices\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const invoice = state.invoices.find((i) => i.id === id)
    if (!invoice) throw mockError(404, 'الفاتورة غير موجودة')
    const customer = state.customers.find((c) => c.id === invoice.customer_id)
    const lines = (invoice.lines ?? []).map((line) => enrichMockInvoiceLine(state, line))
    const installmentPlans = lines
      .map((line) => line.installment_plan)
      .filter((plan): plan is NonNullable<typeof plan> => plan != null)
    const invoicePlan = invoice.installment_plan
      ? { ...invoice.installment_plan, items: invoice.installment_plan.items ?? [] }
      : installmentPlans[0] ?? null

    return {
      ...invoice,
      lines,
      customer,
      source_invoice: invoice.source_sales_invoice_id
        ? (() => {
            const source = state.invoices.find((i) => i.id === invoice.source_sales_invoice_id)
            if (!source) return undefined
            return {
              ...source,
              customer: state.customers.find((c) => c.id === source.customer_id),
            }
          })()
        : undefined,
      distributor: state.distributors.find((d) => d.id === invoice.distributor_id),
      installment_plan: invoicePlan,
      installment_plans: installmentPlans.length > 0 ? installmentPlans : invoicePlan ? [invoicePlan] : [],
      payment_transactions: state.paymentTransactions
        .filter((p) => p.sales_invoice_id === invoice.id)
        .map((p) => ({
          id: p.id,
          installment_item_id: p.installment_item_id,
          amount: p.amount,
          paid_at: p.paid_at,
          status: p.status,
        })),
    }
  }

  if (m === 'GET' && path.match(/^sales-invoices\/\d+\/ownership-transfer-contract$/)) {
    return mockContractPreviewHtml('ownership_transfer')
  }

  if (m === 'GET' && path.match(/^sales-invoices\/\d+\/lines\/\d+\/contract$/)) {
    const parts = path.split('/')
    const invoiceId = Number(parts[1])
    const lineId = Number(parts[3])
    const invoice = state.invoices.find((i) => i.id === invoiceId)
    if (!invoice) throw mockError(404, 'الفاتورة غير موجودة')
    const line = invoice.lines?.find((l) => l.id === lineId)
    if (!line) throw mockError(404, 'البند غير موجود')
    if (line.product_unit_id) {
      throw mockError(422, 'هذا البند ليس خدمة — استخدم طباعة عقد الجهاز.')
    }

    const customer = state.customers.find((c) => c.id === invoice.customer_id)
    const service = line.service_id
      ? state.services.find((item) => item.id === line.service_id)
      : undefined
    const templateKey = service?.contract_template_key ?? 'service_receipt'
    const description = line.description ?? service?.name_ar ?? service?.name ?? 'خدمة'
    const lineTotal = Number(line.line_total ?? line.unit_price ?? 0)

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>عقد خدمة — ${description}</title>
  <link rel="stylesheet" href="/tamplates/contract.css">
</head>
<body>
  <article class="installment-contract">
    <h1 style="text-align:center;color:#c41e3a;">إيصال / عقد خدمة</h1>
    <p><strong>العميل:</strong> ${customer?.name ?? ''}</p>
    <p><strong>الهاتف:</strong> ${customer?.phone ?? ''}</p>
    <p><strong>التاريخ:</strong> ${invoice.invoice_date ?? ''}</p>
    <p><strong>الخدمة:</strong> ${description}</p>
    <p><strong>رقم الفاتورة:</strong> ${invoice.invoice_number ?? invoice.id}</p>
    <table border="1" cellpadding="8" cellspacing="0" width="100%" style="margin-top:1rem;border-collapse:collapse;">
      <thead><tr><th>البند</th><th>السعر</th><th>الإجمالي</th></tr></thead>
      <tbody>
        <tr>
          <td>${description}</td>
          <td>${Number(line.unit_price).toLocaleString('ar-EG')} ج.م</td>
          <td>${lineTotal.toLocaleString('ar-EG')} ج.م</td>
        </tr>
      </tbody>
    </table>
    <p style="margin-top:1rem;"><strong>الإجمالي:</strong> ${lineTotal.toLocaleString('ar-EG')} ج.م</p>
    <p style="font-size:12px;color:#666;">نموذج: ${templateKey}</p>
  </article>
</body>
</html>`

    return html
  }

  if (m === 'GET' && path === 'payment-transactions') {
    let rows = [...state.paymentTransactions]
    const customerId = params.customer_id ? Number(params.customer_id) : undefined
    const invoiceId = params.sales_invoice_id ? Number(params.sales_invoice_id) : undefined
    const installmentItemId = params.installment_item_id
      ? Number(params.installment_item_id)
      : undefined
    const status = params.status as string | undefined

    if (customerId) rows = rows.filter((p) => p.customer_id === customerId)
    if (invoiceId) rows = rows.filter((p) => p.sales_invoice_id === invoiceId)
    if (installmentItemId) rows = rows.filter((p) => p.installment_item_id === installmentItemId)
    if (status) rows = rows.filter((p) => p.status === status)

    const enriched = rows.map((payment) => ({
      ...payment,
      customer: state.customers.find((c) => c.id === payment.customer_id),
      sales_invoice: state.invoices.find((i) => i.id === payment.sales_invoice_id),
    }))

    return paginate(enriched, params)
  }

  if (m === 'GET' && path.match(/^payment-transactions\/\d+$/)) {
    const paymentId = Number(path.split('/')[1])
    const payment = state.paymentTransactions.find((p) => p.id === paymentId)
    if (!payment) throw mockError(404, 'عملية الدفع غير موجودة')
    const invoice = state.invoices.find((i) => i.id === payment.sales_invoice_id)
    return {
      ...payment,
      customer: state.customers.find((c) => c.id === payment.customer_id),
      sales_invoice: invoice
        ? {
            ...invoice,
            branch: state.branches.find((b) => b.id === invoice.branch_id),
          }
        : undefined,
      user: state.users.find((u) => u.id === (payment as { user_id?: number }).user_id),
    }
  }

  if (m === 'POST' && path === 'sales-invoices/checkout') {
    const body = data as CheckoutPayload & {
      lines: { product_id?: number; quantity?: number; unit_price?: number }[]
    }
    let created: SalesInvoice | undefined
    mutateState((s) => {
      const customer = s.customers.find((c) => c.id === body.customer_id)
      if (!customer) throw mockError(422, 'العميل غير موجود')
      const distributor = body.distributor_id
        ? s.distributors.find((d) => d.id === body.distributor_id)
        : undefined
      if (body.distributor_id && !distributor) throw mockError(422, 'الموزع غير موجود')

      const warehouseId = body.warehouse_id ?? ctx.warehouseId
      const contractKind = body.contract_kind ?? 'new_contract'
      const manualDeviceKind = contractKind !== 'new_contract'
      const hasDeviceLines = body.lines.some(
        (line) =>
          line.line_type === 'device' ||
          (line.line_type !== 'service' && (line.product_unit_id != null || manualDeviceKind)),
      )

      let stock: ReturnType<typeof getStock>
      if (hasDeviceLines && !manualDeviceKind) {
        if (warehouseId == null) throw mockError(422, 'المخزن مطلوب')
        stock = getStock(s, warehouseId)
        if (!stock) throw mockError(422, 'المخزن غير موجود')
      }

      body.lines.forEach((line, index) => {
        const isDeviceLine =
          line.line_type === 'device' ||
          (line.line_type !== 'service' && line.product_unit_id != null)
        if (isDeviceLine && !line.technician_id) {
          throw mockError(422, `جهاز ${index + 1}: الفني مطلوب`)
        }
      })

      const installationFeeGross =
        contractKind === 'new_contract' ? Number(body.installation_fee ?? 0) : 0
      const feeDiscount = Number(body.discount_amount ?? 0)
      const installationFeePerUnit = Math.max(0, installationFeeGross - feeDiscount)
      const deviceLineCount = body.lines.filter(
        (line) =>
          line.line_type === 'device' ||
          (line.line_type !== 'service' && line.product_unit_id != null),
      ).length
      const installationFee = installationFeePerUnit * deviceLineCount
      let subtotal = 0
      const invoiceLines: SalesInvoiceLine[] = body.lines.map((line, index) => {
        const isServiceLine =
          line.line_type === 'service' ||
          (line.line_type !== 'device' && !line.product_unit_id && Boolean(line.description))
        const price = Number(
          line.unit_price ?? (isServiceLine ? 0 : s.gpsProduct.sell_price),
        )
        const discount = Number(line.discount ?? 0)
        const quantity = line.quantity ?? 1
        const lineTotal = isServiceLine
          ? Math.max(0, price - discount)
          : Math.max(0, price - discount)
        subtotal += lineTotal
        const technician = line.technician_id
          ? s.employees.find((e) => e.id === line.technician_id)
          : undefined
        return {
          id: s.counters.invoice * 100 + index + 1,
          line_type: isServiceLine ? 'service' : 'device',
          product_id: isServiceLine ? undefined : s.gpsProduct.id,
          product_unit_id: isServiceLine ? undefined : line.product_unit_id,
          service_id: isServiceLine ? line.service_id : undefined,
          description: line.description,
          quantity,
          unit_price: price,
          discount,
          line_total: lineTotal,
          payment_term: line.payment_term ?? 'cash',
          cash_schedule: line.cash_schedule,
          technician_id: line.technician_id ?? null,
          username: line.username ?? null,
          technician: technician ? { id: technician.id, name: technician.name } : null,
          serial_number: line.serial_number ?? null,
          sim_number: line.sim_number ?? null,
          vehicle_type: line.vehicle_type ?? null,
          vehicle_plate_letters: line.vehicle_plate_letters ?? null,
          vehicle_plate_numbers: line.vehicle_plate_numbers ?? null,
          chassis_number: line.chassis_number ?? null,
          engine_number: line.engine_number ?? null,
          renewal_type: line.renewal_type ?? null,
          subscription_renewal_date: line.subscription_renewal_date ?? null,
          product_name_ar: isServiceLine ? line.description : s.gpsProduct.name_ar,
        }
      })

      if (hasDeviceLines && stock && !manualDeviceKind) {
        const available = stock.quantity - stock.reserved
        if (deviceLineCount > available) {
          throw mockError(422, `الكمية المتاحة ${available} قطعة فقط`)
        }

        stock.reserved += deviceLineCount
      }

      if (body.promotion_id) {
        subtotal = applyPromotionDiscount(s, body.promotion_id, subtotal)
        invoiceLines.forEach((line) => {
          if (invoiceLines.length === 1) {
            line.line_total = subtotal
          }
        })
      }

      const total = subtotal + installationFee

      const lineTerms = body.lines.map((l) => l.payment_term ?? 'cash')
      const uniqueTerms = [...new Set(lineTerms)]
      const paymentTerm =
        uniqueTerms.length > 1 ? 'mixed' : (uniqueTerms[0] as SalesInvoice['payment_term'])

      let paidAmount = installationFee
      body.lines.forEach((line, index) => {
        const lineTotal = Number(invoiceLines[index].line_total ?? 0)
        const term = line.payment_term ?? 'cash'
        const down =
          term === 'installment'
            ? Number(line.installment_plan?.down_payment ?? 0)
            : Number(line.down_payment ?? 0)
        paidAmount += linePaidNow(term, line.cash_schedule, lineTotal, down)
      })
      paidAmount = Math.round(paidAmount * 100) / 100

      const invoiceId = s.counters.invoice++
      const invoice: SalesInvoice = {
        id: invoiceId,
        invoice_number: `INV-2026-${String(invoiceId).padStart(4, '0')}`,
        invoice_date: body.invoice_date ?? new Date().toISOString().split('T')[0],
        branch_id:
          body.branch_id ?? distributor?.branch_id ?? ctx.branchId ?? stock?.branch_id ?? 1,
        warehouse_id: warehouseId ?? undefined,
        customer_id: body.customer_id,
        distributor_id: body.distributor_id ?? null,
        status: 'confirmed',
        review_status: 'pending',
        contract_kind: contractKind,
        source_sales_invoice_id: body.source_sales_invoice_id ?? null,
        payment_term: paymentTerm,
        payment_status: paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
        total,
        paid_amount: paidAmount,
        balance_due: Math.max(0, total - paidAmount),
        confirmed_at: new Date().toISOString(),
        technician_name: null,
        technician_id: null,
        subtotal,
        discount_amount: feeDiscount * Math.max(1, deviceLineCount),
        installation_fee: installationFee,
        lines: invoiceLines,
        created_by: 2,
      }

      body.lines.forEach((lineInput, index) => {
        if (lineInput.payment_term !== 'installment' || !lineInput.installment_plan) return
        const invLine = invoiceLines[index]
        const planData = lineInput.installment_plan
        const count = Number(planData.installment_count ?? 0)
        const amount = Number(planData.installment_amount ?? 0)
        const down =
          planData.down_payment != null
            ? Number(planData.down_payment)
            : Math.max(0, Math.round((Number(invLine.line_total) - amount * count) * 100) / 100)
        const plan: InstallmentPlan = {
          id: invoiceId * 10 + index + 1,
          down_payment: down,
          installment_count: count,
          installment_amount: planData.installment_amount,
          interval_type: planData.interval_type ?? 'monthly',
          interval_days: planData.interval_days ?? 30,
          first_due_date: planData.first_due_date,
          status: 'draft' as const,
          items: [],
        }
        invLine.installment_plan = plan
        generateInstallmentItems(s, invoice, invLine, plan)
      })

      const invoiceDate = body.invoice_date ?? new Date().toISOString().split('T')[0]
      body.lines.forEach((lineInput, index) => {
        if ((lineInput.payment_term ?? 'cash') !== 'cash') return
        const invLine = invoiceLines[index]
        const lineTotal = Number(invLine.line_total ?? 0)
        const down = Number(lineInput.down_payment ?? 0)
        const remainder = cashRemainder(lineTotal, down)
        if (remainder <= 0) return

        const schedule = (lineInput.cash_schedule ?? 'immediate') as CashSchedule
        const deferred = isDeferredCashSchedule(schedule)
        if (!deferred && down <= 0) return

        const dueDate = deferred ? cashDueDate(schedule, invoiceDate) : invoiceDate
        if (!dueDate) return

        const plan: InstallmentPlan = {
          id: invoiceId * 100 + index + 50,
          down_payment: down,
          installment_count: 1,
          installment_amount: remainder,
          interval_type: 'monthly',
          interval_days: 30,
          first_due_date: dueDate,
          status: 'draft' as const,
          items: [],
        }
        invLine.installment_plan = plan
        generateInstallmentItems(s, invoice, invLine, plan)
      })

      s.invoices.push(invoice)
      mockAccrueDistributorCommission(s, invoice)
      const balanceUse = Number((body as { distributor_balance_amount?: number }).distributor_balance_amount ?? 0)
      if (balanceUse > 0 && body.customer_id) {
        mockDebitDistributorBalance(s, body.customer_id, balanceUse, invoice.id)
      }
      created = {
        ...invoice,
        lines: invoiceLines.map((line) => enrichMockInvoiceLine(s, line)),
        customer,
        distributor: s.distributors.find((d) => d.id === invoice.distributor_id),
      }
    })
    return created
  }

  if (m === 'POST' && path === 'sales-invoices/service-checkout') {
    const body = data as ServiceCheckoutPayload
    for (const item of body.items) {
      if (item.payment_term === 'installment' && !item.installment_plan) {
        throw mockError(422, 'خطة التقسيط مطلوبة للبند')
      }
    }
    let created: SalesInvoice | undefined
    mutateState((s) => {
      const customer = s.customers.find((c) => c.id === body.customer_id)
      if (!customer) throw mockError(422, 'العميل غير موجود')
      if (!body.distributor_id && !body.branch_id && !body.sales_user_id) {
        throw mockError(422, 'يجب تحديد مصدر التعاقد')
      }

      const subtotal = body.items.reduce(
        (sum, item) => sum + Number(item.unit_price),
        0,
      )

      const lineTerms = body.items.map((item) => item.payment_term ?? 'cash')
      const uniqueTerms = [...new Set(lineTerms)]
      const paymentTerm =
        uniqueTerms.length > 1 ? 'mixed' : (uniqueTerms[0] ?? 'cash')

      let paidAmount = 0
      for (const item of body.items) {
        const lineTotal = Number(item.unit_price)
        const term = item.payment_term ?? 'cash'
        const down =
          term === 'installment'
            ? Number(item.installment_plan?.down_payment ?? 0)
            : Number(item.down_payment ?? 0)
        paidAmount += linePaidNow(term, item.cash_schedule, lineTotal, down)
      }

      const balanceDue = Math.max(0, subtotal - paidAmount)
      const invoiceId = s.counters.invoice++
      const invoiceLines = body.items.map((item, index) => {
        const lineId = invoiceId * 100 + index
        const lineTotal = Number(item.unit_price)
        const line: SalesInvoiceLine = {
          id: lineId,
          line_type: 'service',
          service_id: item.service_id,
          quantity: 1,
          unit_price: item.unit_price,
          line_total: lineTotal,
          product_name_ar: item.description,
          description: item.description,
          payment_term: item.payment_term ?? 'cash',
        }

        if (item.payment_term === 'installment' && item.installment_plan) {
          const plan: InstallmentPlan = {
            id: lineId,
            sales_invoice_line_id: lineId,
            down_payment: Number(item.installment_plan.down_payment),
            installment_count: Number(item.installment_plan.installment_count),
            installment_amount: Number(item.installment_plan.installment_amount),
            interval_days: item.installment_plan.interval_days ?? 30,
            interval_type: item.installment_plan.interval_type ?? 'monthly',
            first_due_date: item.installment_plan.first_due_date,
            status: 'active',
            items: [],
          }
          line.installment_plan = plan
        } else if ((item.payment_term ?? 'cash') === 'cash') {
          const down = Number(item.down_payment ?? 0)
          const remainder = cashRemainder(lineTotal, down)
          const schedule = (item.cash_schedule ?? 'immediate') as CashSchedule
          const deferred = isDeferredCashSchedule(schedule)
          if (remainder > 0 && (deferred || down > 0)) {
            const invoiceDate = body.invoice_date ?? new Date().toISOString().split('T')[0]
            const dueDate = deferred ? cashDueDate(schedule, invoiceDate) : invoiceDate
            if (dueDate) {
              const plan: InstallmentPlan = {
                id: lineId,
                sales_invoice_line_id: lineId,
                down_payment: down,
                installment_count: 1,
                installment_amount: remainder,
                interval_days: 30,
                interval_type: 'monthly',
                first_due_date: dueDate,
                status: 'active',
                items: [],
              }
              line.installment_plan = plan
            }
          }
        }

        return line
      })

      const invoice: SalesInvoice = {
        id: invoiceId,
        invoice_number: `SRV-2026-${String(invoiceId).padStart(4, '0')}`,
        invoice_date: body.invoice_date ?? new Date().toISOString().split('T')[0],
        branch_id: body.branch_id ?? ctx.branchId ?? 1,
        customer_id: body.customer_id,
        distributor_id: body.distributor_id ?? null,
        sales_user_id: body.sales_user_id ?? null,
        status: 'confirmed',
        sale_category: body.sale_category,
        payment_term: paymentTerm,
        payment_status:
          paymentTerm === 'cash' ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
        total: subtotal,
        paid_amount: paidAmount,
        balance_due: balanceDue,
        notes: body.notes ?? null,
        lines: invoiceLines,
      }

      const installmentPlans = invoiceLines
        .map((line) => line.installment_plan)
        .filter((plan): plan is InstallmentPlan => Boolean(plan))

      if (installmentPlans.length === 1 && paymentTerm !== 'mixed') {
        invoice.installment_plan = installmentPlans[0]
      }
      if (installmentPlans.length > 0) {
        invoice.installment_plans = installmentPlans
      }

      for (const line of invoiceLines) {
        if (line.installment_plan) {
          generateInstallmentItems(s, invoice, line, line.installment_plan)
        }
      }

      created = {
        ...invoice,
        lines: invoiceLines.map((line) => enrichMockInvoiceLine(s, line)),
        customer,
      }
      s.invoices.push(invoice)
      mockAccrueDistributorCommission(s, invoice)
      const balanceUse = Number(body.distributor_balance_amount ?? 0)
      if (balanceUse > 0) {
        mockDebitDistributorBalance(s, body.customer_id, balanceUse, invoice.id)
      }
    })
    return created
  }

  if (m === 'POST' && path.match(/^sales-invoices\/\d+\/approve$/)) {
    const id = Number(path.split('/')[2])
    let updated: SalesInvoice | undefined
    mutateState((s) => {
      const invoice = s.invoices.find((i) => i.id === id)
      if (!invoice) throw mockError(404, 'الفاتورة غير موجودة')
      if (invoice.status !== 'confirmed') {
        throw mockError(422, 'الفاتورة غير متاحة للمراجعة')
      }
      if (invoice.review_status === 'approved') return

      invoice.review_status = 'approved'
      invoice.reviewed_at = new Date().toISOString()
      invoice.reviewed_by = 3

      updated = invoice
    })
    return updated
  }

  if (m === 'POST' && path.match(/^sales-invoices\/\d+\/reject$/)) {
    const id = Number(path.split('/')[2])
    const body = data as { reason?: string }
    let updated: SalesInvoice | undefined
    mutateState((s) => {
      const invoice = s.invoices.find((i) => i.id === id)
      if (!invoice) throw mockError(404, 'الفاتورة غير موجودة')
      if (invoice.status !== 'confirmed') {
        throw mockError(422, 'الفاتورة غير متاحة للمراجعة')
      }

      invoice.review_status = 'rejected'
      invoice.rejection_reason = body.reason ?? 'مرفوضة'
      invoice.reviewed_at = new Date().toISOString()
      invoice.reviewed_by = 3
      updated = invoice
    })
    return updated
  }

  if (m === 'GET' && (path === 'installments' || path === 'installments/overdue')) {
    const branchFilter = params['filter[branch_id]']
      ? Number(params['filter[branch_id]'])
      : undefined
    const onlyOverdue = path === 'installments/overdue'
    const rows: Record<string, unknown>[] = []

    for (const inv of state.invoices) {
      if (inv.status !== 'confirmed' || inv.payment_term !== 'installment') continue
      if (branchFilter && inv.branch_id !== branchFilter) continue
      const customer = state.customers.find((c) => c.id === inv.customer_id)
      for (const item of inv.installment_plan?.items ?? []) {
        if (item.status === 'paid') continue
        const due = new Date(item.due_date)
        const isOverdue =
          item.status === 'overdue' ||
          (item.status !== 'paid' && due < new Date() && Number(item.paid_amount) < Number(item.amount))
        if (onlyOverdue && !isOverdue) continue
        rows.push({
          ...item,
          sales_invoice_id: inv.id,
          branch_id: inv.branch_id,
          invoice_number: inv.invoice_number,
          customer_id: inv.customer_id,
          customer_name: customer?.name,
          customer_phone: customer?.phone,
          remaining: Number(item.amount) - Number(item.paid_amount),
          remaining_installments: Math.max(
            0,
            (inv.installment_plan?.installment_count ?? 1) - (item.installment_number ?? 1),
          ),
          has_open_reconciliation: false,
          sales_invoice: {
            id: inv.id,
            invoice_number: inv.invoice_number,
            branch_id: inv.branch_id,
            customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : undefined,
          },
        })
      }
    }

    return paginate(rows, params)
  }

  if (m === 'POST' && path.match(/^sales-invoices\/\d+\/installments\/collect$/)) {
    const id = Number(path.split('/')[2])
    const body = data as {
      installment_item_id: number
      amount: number
      payment_method?: string
      distributor_balance_amount?: number
    }
    let result: { invoice: SalesInvoice; item: unknown } | undefined
    mutateState((s) => {
      const invoice = s.invoices.find((i) => i.id === id)
      if (!invoice || invoice.status !== 'confirmed') {
        throw mockError(422, 'الفاتورة غير متاحة للتحصيل')
      }
      const found = findInstallmentItem(invoice, body.installment_item_id)
      if (!found) throw mockError(404, 'القسط غير موجود')
      const { item } = found

      const remaining = Number(item.amount) - Number(item.paid_amount)
      if (body.amount <= 0 || body.amount > remaining) {
        throw mockError(422, `المبلغ المتبقي ${remaining} ج.م`)
      }

      const balanceAmount = Number(body.distributor_balance_amount ?? 0)
      if (balanceAmount > body.amount + 0.009) {
        throw mockError(422, 'مبلغ رصيد العمولة يتجاوز مبلغ التحصيل')
      }

      item.paid_amount = Number(item.paid_amount) + body.amount
      if (item.paid_amount >= Number(item.amount)) {
        item.status = 'paid'
        item.paid_at = new Date().toISOString()
      } else {
        item.status = 'partial'
      }

      refreshInvoicePayment(invoice)

      if (balanceAmount > 0 && invoice.customer_id) {
        const paymentId = s.counters.payment++
        mockDebitDistributorBalance(s, invoice.customer_id, balanceAmount, invoice.id, paymentId)
        s.paymentTransactions.push({
          id: paymentId,
          transaction_number: `PAY-${String(paymentId).padStart(6, '0')}`,
          sales_invoice_id: invoice.id,
          customer_id: invoice.customer_id,
          installment_item_id: item.id,
          amount: balanceAmount,
          status: 'active',
          payment_source: 'distributor_balance',
          payment_method: 'distributor_balance',
          paid_at: new Date().toISOString(),
        })
      }

      const cashAmount = body.amount - balanceAmount
      if (cashAmount > 0) {
        const paymentId = s.counters.payment++
        s.paymentTransactions.push({
          id: paymentId,
          transaction_number: `PAY-${String(paymentId).padStart(6, '0')}`,
          sales_invoice_id: invoice.id,
          customer_id: invoice.customer_id ?? 0,
          installment_item_id: item.id,
          amount: cashAmount,
          status: 'active',
          payment_source: 'installment',
          payment_method: body.payment_method ?? 'cash',
          paid_at: new Date().toISOString(),
        })
      }

      result = { invoice, item }
    })
    return result
  }

  if (m === 'GET' && path === 'accounting/dashboard') {
    const balances = state.accountingAccounts.reduce<Record<string, number>>((acc, account) => {
      acc[account.account_primary_type] = (acc[account.account_primary_type] ?? 0) + (account.id * 1000)
      return acc
    }, {})
    const recent = [...state.journalEntries, ...state.transfers]
      .sort((a, b) => String(b.operation_date).localeCompare(String(a.operation_date)))
      .slice(0, 5)
    const unmapped = state.invoices.filter(
      (i) => i.status === 'confirmed' && !state.mappedInvoiceIds.includes(i.id),
    ).length
    const payload: AccountingDashboard = {
      balances_by_type: balances,
      total_accounts: state.accountingAccounts.filter((a) => a.status === 'active').length,
      journal_entries_count: state.journalEntries.length,
      transfers_count: state.transfers.length,
      unmapped_sales: unmapped,
      unmapped_branches: [],
      recent_entries: recent,
    }
    return payload
  }

  if (m === 'GET' && path === 'accounting/chart-of-accounts') {
    let accounts = [...state.accountingAccounts]
    const status = params['filter[status]']
    const primaryType = params['filter[account_primary_type]']
    const branchId = params['filter[branch_id]']
    if (status) accounts = accounts.filter((a) => a.status === status)
    if (primaryType) accounts = accounts.filter((a) => a.account_primary_type === primaryType)
    if (branchId) accounts = accounts.filter((a) => !a.branch_id || String(a.branch_id) === String(branchId))
    if (params.with_balances) {
      accounts = accounts.map((a) => ({ ...a, balance: a.id * 100 }))
    }
    return paginate(accounts, params)
  }

  if (m === 'POST' && path === 'accounting/chart-of-accounts/seed-all-branches') {
    return { message: 'Branch accounts seeded.', branches: [] }
  }

  if (m === 'POST' && path === 'accounting/chart-of-accounts/create-default-accounts') {
    return { message: 'Default accounts created successfully.', accounts: state.accountingAccounts }
  }

  if (m === 'GET' && path === 'accounting/journal-entries') {
    return paginate(state.journalEntries, params)
  }

  if (m === 'POST' && path === 'accounting/journal-entries') {
    const body = data as {
      operation_date?: string
      note?: string
      lines: Array<{ accounting_account_id: number; amount: number; type: 'debit' | 'credit'; note?: string }>
    }
    let created!: AccountingAccTransMapping
    mutateState((s) => {
      s.counters.journalEntry = (s.counters.journalEntry ?? 0) + 1
      const id = s.counters.journalEntry
      const lines: AccountingTransactionLine[] = body.lines.map((line, idx) => ({
        id: id * 10 + idx,
        accounting_account_id: line.accounting_account_id,
        acc_trans_mapping_id: id,
        amount: line.amount,
        type: line.type,
        note: line.note,
        account: s.accountingAccounts.find((a) => a.id === line.accounting_account_id),
      }))
      created = {
        id,
        ref_no: `${s.accountingSettings.journal_entry_prefix ?? 'JE'}-${String(id).padStart(3, '0')}`,
        type: 'journal_entry',
        operation_date: body.operation_date ?? new Date().toISOString(),
        note: body.note,
        lines,
      }
      s.journalEntries.unshift(created)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^accounting\/journal-entries\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as {
      operation_date?: string
      note?: string
      lines: Array<{ accounting_account_id: number; amount: number; type: 'debit' | 'credit'; note?: string }>
    }
    let updated!: AccountingAccTransMapping
    mutateState((s) => {
      const idx = s.journalEntries.findIndex((e) => e.id === id)
      if (idx < 0) throw mockError(404, 'Journal entry not found')
      const lines: AccountingTransactionLine[] = body.lines.map((line, lineIdx) => ({
        id: id * 10 + lineIdx,
        accounting_account_id: line.accounting_account_id,
        acc_trans_mapping_id: id,
        amount: line.amount,
        type: line.type,
        note: line.note,
        account: s.accountingAccounts.find((a) => a.id === line.accounting_account_id),
      }))
      updated = {
        ...s.journalEntries[idx],
        operation_date: body.operation_date ?? s.journalEntries[idx].operation_date,
        note: body.note ?? s.journalEntries[idx].note,
        lines,
      }
      s.journalEntries[idx] = updated
    })
    return updated
  }

  if (m === 'DELETE' && path.match(/^accounting\/journal-entries\/\d+$/)) {
    const id = Number(path.split('/')[2])
    mutateState((s) => {
      s.journalEntries = s.journalEntries.filter((e) => e.id !== id)
    })
    return { message: 'Journal entry deleted.' }
  }

  if (m === 'GET' && path === 'accounting/transfers') {
    return paginate(state.transfers, params)
  }

  if (m === 'POST' && path === 'accounting/transfers') {
    const body = data as {
      from_account_id: number
      to_account_id: number
      amount: number
      operation_date?: string
      note?: string
    }
    let created!: AccountingAccTransMapping
    mutateState((s) => {
      s.counters.transfer = (s.counters.transfer ?? 0) + 1
      const id = s.counters.transfer
      const lines: AccountingTransactionLine[] = [
        {
          id: id * 10,
          accounting_account_id: body.to_account_id,
          acc_trans_mapping_id: id,
          amount: body.amount,
          type: 'debit',
          account: s.accountingAccounts.find((a) => a.id === body.to_account_id),
        },
        {
          id: id * 10 + 1,
          accounting_account_id: body.from_account_id,
          acc_trans_mapping_id: id,
          amount: body.amount,
          type: 'credit',
          account: s.accountingAccounts.find((a) => a.id === body.from_account_id),
        },
      ]
      created = {
        id,
        ref_no: `${s.accountingSettings.transfer_prefix ?? 'TR'}-${String(id).padStart(3, '0')}`,
        type: 'transfer',
        operation_date: body.operation_date ?? new Date().toISOString(),
        note: body.note,
        lines,
      }
      s.transfers.unshift(created)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^accounting\/transfers\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as {
      from_account_id: number
      to_account_id: number
      amount: number
      operation_date?: string
      note?: string
    }
    let updated!: AccountingAccTransMapping
    mutateState((s) => {
      const idx = s.transfers.findIndex((t) => t.id === id)
      if (idx < 0) throw mockError(404, 'Transfer not found')
      const lines: AccountingTransactionLine[] = [
        {
          id: id * 10,
          accounting_account_id: body.to_account_id,
          acc_trans_mapping_id: id,
          amount: body.amount,
          type: 'debit',
          account: s.accountingAccounts.find((a) => a.id === body.to_account_id),
        },
        {
          id: id * 10 + 1,
          accounting_account_id: body.from_account_id,
          acc_trans_mapping_id: id,
          amount: body.amount,
          type: 'credit',
          account: s.accountingAccounts.find((a) => a.id === body.from_account_id),
        },
      ]
      updated = {
        ...s.transfers[idx],
        operation_date: body.operation_date ?? s.transfers[idx].operation_date,
        note: body.note ?? s.transfers[idx].note,
        lines,
      }
      s.transfers[idx] = updated
    })
    return updated
  }

  if (m === 'DELETE' && path.match(/^accounting\/transfers\/\d+$/)) {
    const id = Number(path.split('/')[2])
    mutateState((s) => {
      s.transfers = s.transfers.filter((t) => t.id !== id)
    })
    return { message: 'Transfer deleted.' }
  }

  if (m === 'POST' && path === 'accounting/chart-of-accounts') {
    const body = data as Partial<AccountingAccount>
    let created!: AccountingAccount
    mutateState((s) => {
      s.counters.accountingAccount = (s.counters.accountingAccount ?? 0) + 1
      const id = s.counters.accountingAccount
      created = {
        id,
        name: body.name ?? 'حساب',
        gl_code: body.gl_code ?? null,
        account_primary_type: body.account_primary_type ?? 'asset',
        parent_account_id: body.parent_account_id ?? null,
        description: body.description ?? null,
        status: body.status ?? 'active',
      }
      s.accountingAccounts.push(created)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^accounting\/chart-of-accounts\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as Partial<AccountingAccount>
    let updated!: AccountingAccount
    mutateState((s) => {
      const idx = s.accountingAccounts.findIndex((a) => a.id === id)
      if (idx < 0) throw mockError(404, 'Account not found')
      updated = { ...s.accountingAccounts[idx], ...body, id }
      s.accountingAccounts[idx] = updated
    })
    return updated
  }

  if (m === 'PATCH' && path.match(/^accounting\/chart-of-accounts\/\d+\/toggle-status$/)) {
    const id = Number(path.split('/')[2])
    let updated!: AccountingAccount
    mutateState((s) => {
      const idx = s.accountingAccounts.findIndex((a) => a.id === id)
      if (idx < 0) throw mockError(404, 'Account not found')
      updated = {
        ...s.accountingAccounts[idx],
        status: s.accountingAccounts[idx].status === 'active' ? 'inactive' : 'active',
      }
      s.accountingAccounts[idx] = updated
    })
    return updated
  }

  if (m === 'GET' && path.match(/^accounting\/chart-of-accounts\/\d+\/ledger$/)) {
    const accountId = Number(path.split('/')[2])
    const account = state.accountingAccounts.find((a) => a.id === accountId)
    if (!account) throw mockError(404, 'Account not found')
    const allLines = [...state.journalEntries, ...state.transfers]
      .flatMap((m) => m.lines ?? [])
      .filter((l) => l.accounting_account_id === accountId)
    return {
      account,
      balance: allLines.reduce((sum, l) => sum + Number(l.amount) * (l.type === 'debit' ? 1 : -1), 0),
      transactions: paginate(allLines, params),
    }
  }

  if (m === 'POST' && path === 'accounting/opening-balance') {
    return handleMockRequest('POST', 'accounting/journal-entries', data, config, ctx)
  }

  if (m === 'POST' && path === 'accounting/budgets') {
    const body = data as Partial<AccountingBudget> & { accounting_account_id: number; financial_year: number }
    let created!: AccountingBudget
    mutateState((s) => {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const
      const monthValues = Object.fromEntries(months.map((m) => [m, Number(body[m] ?? 0)])) as Record<(typeof months)[number], number>
      const yearly = months.reduce((sum, m) => sum + monthValues[m], 0)
      s.counters.budget = (s.counters.budget ?? 0) + 1
      const id = s.counters.budget
      created = {
        id,
        accounting_account_id: body.accounting_account_id,
        financial_year: body.financial_year,
        ...monthValues,
        quarter_1: monthValues.jan + monthValues.feb + monthValues.mar,
        quarter_2: monthValues.apr + monthValues.may + monthValues.jun,
        quarter_3: monthValues.jul + monthValues.aug + monthValues.sep,
        quarter_4: monthValues.oct + monthValues.nov + monthValues.dec,
        yearly,
        account: s.accountingAccounts.find((a) => a.id === body.accounting_account_id),
      }
      s.budgets.push(created)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^accounting\/budgets\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as Partial<AccountingBudget>
    let updated!: AccountingBudget
    mutateState((s) => {
      const idx = s.budgets.findIndex((b) => b.id === id)
      if (idx < 0) throw mockError(404, 'Budget not found')
      updated = { ...s.budgets[idx], ...body, id }
      s.budgets[idx] = updated
    })
    return updated
  }

  if (m === 'GET' && path === 'accounting/reports/ar-ageing') {
    const report: ArAgeingContactRow[] = state.customers.slice(0, 3).map((c, idx) => ({
      contact_id: c.id,
      name: c.name,
      '<1': idx === 0 ? 5000 : 0,
      '1_30': idx === 1 ? 3000 : 0,
      '31_60': 0,
      '61_90': idx === 2 ? 2000 : 0,
      '>90': 0,
      total_due: [5000, 3000, 2000][idx] ?? 0,
    }))
    return { group_by: params.group_by ?? 'contact', as_of_date: new Date().toISOString().split('T')[0], report }
  }

  if (m === 'GET' && path === 'accounting/reports/income-statement') {
    const lines = state.accountingAccounts
      .filter((a) => a.account_primary_type === 'income' || a.account_primary_type === 'expense')
      .map((a, idx) => ({
        id: a.id,
        name: a.name,
        gl_code: a.gl_code,
        account_primary_type: a.account_primary_type,
        balance: a.account_primary_type === 'income' ? 120000 + idx * 5000 : -(45000 + idx * 2000),
      }))
    const report: IncomeStatementReport = {
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
      total_income: lines.filter((l) => l.account_primary_type === 'income').reduce((s, l) => s + Number(l.balance), 0),
      total_expenses: Math.abs(lines.filter((l) => l.account_primary_type === 'expense').reduce((s, l) => s + Number(l.balance), 0)),
      net_profit: 0,
      lines,
    }
    report.net_profit = report.total_income - report.total_expenses
    return report
  }

  if (m === 'POST' && path === 'accounting/settings/reset-data') {
    mutateState((s) => {
      s.journalEntries = []
      s.transfers = []
      s.mappedInvoiceIds = []
    })
    return { message: 'Accounting data reset.' }
  }

  if (m === 'GET' && path === 'accounting/transactions') {
    const unmappedOnly = params.unmapped_only !== '0' && params.unmapped_only !== 'false'
    let invoices = state.invoices.filter((i) => i.status === 'confirmed')
    if (unmappedOnly) {
      invoices = invoices.filter((i) => !state.mappedInvoiceIds.includes(i.id))
    }
    const enriched = invoices.map((inv) => ({
      ...inv,
      customer: state.customers.find((c) => c.id === inv.customer_id),
      branch: state.branches.find((b) => b.id === inv.branch_id),
    }))
    return paginate(enriched, params)
  }

  if (m === 'GET' && path === 'accounting/transactions/map') {
    const invoiceId = Number(params.sales_invoice_id)
    const invoice = state.invoices.find((i) => i.id === invoiceId)
    const payload: TransactionMapPayload = {
      accounts: state.accountingAccounts
        .filter((a) => a.status === 'active')
        .map(({ id, name, gl_code, account_primary_type }) => ({
          id,
          name,
          gl_code,
          account_primary_type,
        })),
    }
    if (invoice) {
      payload.invoice = {
        ...invoice,
        customer: state.customers.find((c) => c.id === invoice.customer_id),
      }
    }
    return payload
  }

  if (m === 'POST' && path === 'accounting/transactions/save-map') {
    const body = data as { sales_invoice_id: number; deposit_to: number; payment_account: number }
    mutateState((s) => {
      if (!s.mappedInvoiceIds.includes(body.sales_invoice_id)) {
        s.mappedInvoiceIds.push(body.sales_invoice_id)
      }
    })
    return { message: 'Sale invoice mapped successfully.', sales_invoice_id: body.sales_invoice_id }
  }

  if (m === 'GET' && path === 'accounting/reports/trial-balance') {
    const accounts = state.accountingAccounts
      .filter((a) => a.status === 'active')
      .map((a, idx) => ({
        id: a.id,
        name: a.name,
        gl_code: a.gl_code,
        account_primary_type: a.account_primary_type,
        total_debits: idx % 2 === 0 ? 10000 + idx * 500 : 0,
        total_credits: idx % 2 === 1 ? 8000 + idx * 400 : 0,
        balance: (idx % 2 === 0 ? 1 : -1) * (5000 + idx * 200),
      }))
    const report: TrialBalanceReport = {
      start_date: params.start_date ?? null,
      end_date: params.end_date ?? null,
      accounts,
      total_debits: accounts.reduce((s, r) => s + Number(r.total_debits), 0),
      total_credits: accounts.reduce((s, r) => s + Number(r.total_credits), 0),
    }
    return report
  }

  if (m === 'GET' && path === 'accounting/reports/balance-sheet') {
    const report: BalanceSheetReport = {
      as_of_date: params.as_of_date ?? new Date().toISOString().split('T')[0],
      assets: 125000,
      liabilities: 35000,
      equity: 90000,
      liabilities_and_equity: 125000,
      balanced: true,
      accounts: state.accountingAccounts
        .filter((a) => ['asset', 'liability', 'equity'].includes(a.account_primary_type))
        .map((a) => ({
          id: a.id,
          name: a.name,
          gl_code: a.gl_code,
          account_primary_type: a.account_primary_type,
          balance: a.account_primary_type === 'asset' ? 50000 : 25000,
        })),
    }
    return report
  }

  if (m === 'GET' && path === 'accounting/reports/general-ledger') {
    return { start_date: params.start_date ?? null, end_date: params.end_date ?? null, entries: [] }
  }

  if (m === 'GET' && path === 'accounting/reports/budget-variance') {
    return { financial_year: Number(params.financial_year ?? new Date().getFullYear()), rows: [] }
  }

  if (m === 'GET' && path === 'accounting/reports/ar-reconciliation') {
    return {
      as_of_date: params.as_of_date ?? new Date().toISOString().split('T')[0],
      gl_ar_balance: 8000,
      operational_balance_due: 8000,
      difference: 0,
      reconciled: true,
    }
  }

  if (m === 'GET' && path === 'accounting/reports/cash-statement') {
    return { start_date: params.start_date ?? null, end_date: params.end_date ?? null, entries: [] }
  }

  if (m === 'POST' && path === 'accounting/settings/setup-wizard') {
    return { message: 'Setup completed.', accounts_created: false, branches_seeded: state.branches.length, unmapped_branches: 0 }
  }

  if (m === 'GET' && path === 'accounting/budgets') {
    let budgets = [...state.budgets]
    const year = params['filter[financial_year]']
    if (year) budgets = budgets.filter((b) => String(b.financial_year) === year)
    return paginate(budgets, params)
  }

  if (m === 'GET' && path === 'accounting/settings') {
    const settings: AccountingSettings = {
      module_settings: state.accountingSettings,
      branches: state.branches.map((b) => ({
        id: b.id,
        name: b.name_ar || b.name,
        code: b.code,
        accounting_default_map: state.branchAccountingMaps[b.id] ?? null,
      })),
      accounts: state.accountingAccounts
        .filter((a) => a.status === 'active')
        .map(({ id, name, gl_code, account_primary_type, branch_id, parent_account_id }) => ({
          id,
          name,
          gl_code,
          account_primary_type,
          branch_id,
          parent_account_id,
        })),
      collection_accounts: [],
      collection_gl_maps: [],
    }
    return settings
  }

  if (m === 'PUT' && path === 'accounting/settings') {
    const body = data as {
      journal_entry_prefix?: string
      transfer_prefix?: string
      branch_maps?: Array<{ branch_id: number; accounting_default_map: Record<string, unknown> }>
    }
    mutateState((s) => {
      if (body.journal_entry_prefix) s.accountingSettings.journal_entry_prefix = body.journal_entry_prefix
      if (body.transfer_prefix) s.accountingSettings.transfer_prefix = body.transfer_prefix
      for (const map of body.branch_maps ?? []) {
        if (map.accounting_default_map) {
          s.branchAccountingMaps[map.branch_id] = map.accounting_default_map as BranchAccountingMap
        }
      }
    })
    return handleMockRequest('GET', '/accounting/settings', undefined, config, ctx)
  }

  if (m === 'POST' && path === 'demo/reset') {
    resetState()
    return { message: 'تم إعادة ضبط الديمو' }
  }

  // CRM module
  if (m === 'GET' && path === 'crm/dashboard') {
    const leadsByStatus: Record<string, number> = {}
    for (const lead of state.leads) {
      leadsByStatus[lead.status] = (leadsByStatus[lead.status] ?? 0) + 1
    }
    const today = new Date().toISOString().split('T')[0]
    const todayFollowUps = state.crmSchedules.filter((s) =>
      s.start_datetime?.startsWith(today),
    ).length
    const convertedThisMonth = state.leads.filter((l) => {
      if (!l.converted_on) return false
      const d = new Date(l.converted_on)
      return d.getMonth() === new Date().getMonth()
    }).length
    const totalLeads = state.leads.length
    const converted = state.leads.filter((l) => l.converted_customer_id).length
    return {
      leads_by_status: leadsByStatus,
      today_follow_ups: todayFollowUps,
      converted_this_month: convertedThisMonth,
      conversion_rate: totalLeads > 0 ? Math.round((converted / totalLeads) * 1000) / 10 : 0,
      organization_id: ctx.organizationId ?? 1,
    }
  }

  if (m === 'GET' && path === 'leads') {
    let leads = [...state.leads]
    const scopedBranchIds = getScopedBranchIds(state, ctx)
    if (scopedBranchIds) {
      leads = leads.filter((l) => l.branch?.id != null && scopedBranchIds.includes(l.branch.id))
    }
    const branchFilter = params['filter[branch_id]']
    if (branchFilter) {
      leads = leads.filter((l) => l.branch?.id === Number(branchFilter))
    }
    return paginate(leads, params)
  }

  if (m === 'PUT' && path.match(/^leads\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const body = data as { status?: string; device_count?: number }
    let updated = state.leads.find((l) => l.id === id)
    if (!updated) throw mockError(404, 'العميل المحتمل غير موجود')
    mutateState((s) => {
      const lead = s.leads.find((l) => l.id === id)!
      if (body.status) lead.status = body.status
      if (body.device_count != null) lead.device_count = body.device_count
      updated = lead
    })
    return updated
  }

  if (m === 'GET' && path === 'crm/follow-ups') {
    return paginate(state.crmSchedules, params)
  }

  if (m === 'POST' && path === 'crm/follow-ups') {
    const body = data as Record<string, unknown>
    let created: (typeof state.crmSchedules)[0] | undefined
    mutateState((s) => {
      s.counters.crmSchedule = (s.counters.crmSchedule ?? 3) + 1
      created = {
        id: s.counters.crmSchedule,
        title: String(body.title ?? ''),
        status: String(body.status ?? 'scheduled'),
        schedule_type: String(body.schedule_type ?? 'call'),
        start_datetime: body.start_datetime ? String(body.start_datetime) : new Date().toISOString(),
        description: body.description ? String(body.description) : null,
        users: ctx.user ? [{ id: ctx.user.id, name: ctx.user.name }] : [],
      }
      s.crmSchedules.unshift(created)
    })
    return created
  }

  if (m === 'GET' && path === 'crm/campaigns') {
    return paginate(state.crmCampaigns, params)
  }

  if (m === 'POST' && path === 'crm/campaigns') {
    const body = data as Record<string, unknown>
    let created: (typeof state.crmCampaigns)[0] | undefined
    mutateState((s) => {
      s.counters.crmCampaign = (s.counters.crmCampaign ?? 2) + 1
      created = {
        id: s.counters.crmCampaign,
        name: String(body.name ?? ''),
        campaign_type: String(body.campaign_type ?? 'sms'),
        subject: body.subject ? String(body.subject) : null,
        email_body: body.email_body ? String(body.email_body) : null,
        sms_body: body.sms_body ? String(body.sms_body) : null,
        contact_ids: (body.contact_ids as number[]) ?? [],
        created_by: ctx.user?.id ?? 1,
      }
      s.crmCampaigns.unshift(created)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^crm\/campaigns\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as Record<string, unknown>
    let updated: (typeof state.crmCampaigns)[0] | undefined
    mutateState((s) => {
      const campaign = s.crmCampaigns.find((c) => c.id === id)
      if (!campaign) throw mockError(404, 'الحملة غير موجودة')
      Object.assign(campaign, body)
      updated = campaign
    })
    return updated
  }

  if (m === 'POST' && path.match(/^crm\/campaigns\/\d+\/send$/)) {
    const id = Number(path.split('/')[2])
    let updated: (typeof state.crmCampaigns)[0] | undefined
    mutateState((s) => {
      const campaign = s.crmCampaigns.find((c) => c.id === id)
      if (!campaign) throw mockError(404, 'الحملة غير موجودة')
      campaign.sent_on = new Date().toISOString()
      updated = campaign
    })
    return { message: 'Campaign queued for delivery', campaign: updated }
  }

  if (m === 'GET' && path === 'crm/proposals') {
    return paginate(state.crmProposals, params)
  }

  if (m === 'POST' && path === 'crm/proposals') {
    const body = data as Record<string, unknown>
    let created: (typeof state.crmProposals)[0] | undefined
    mutateState((s) => {
      s.counters.crmProposal = (s.counters.crmProposal ?? 1) + 1
      created = {
        id: s.counters.crmProposal,
        subject: String(body.subject ?? ''),
        body: String(body.body ?? ''),
        cc: body.cc ? String(body.cc) : null,
        bcc: body.bcc ? String(body.bcc) : null,
        sent_by: ctx.user?.id ?? 1,
        created_at: new Date().toISOString(),
      }
      s.crmProposals.unshift(created)
    })
    return created
  }

  if (m === 'GET' && path === 'crm/proposal-templates') {
    return state.crmProposalTemplates
  }

  if (m === 'POST' && path === 'crm/proposal-templates') {
    const body = data as Record<string, unknown>
    let created: (typeof state.crmProposalTemplates)[0] | undefined
    mutateState((s) => {
      s.counters.crmProposalTemplate = (s.counters.crmProposalTemplate ?? 1) + 1
      created = {
        id: s.counters.crmProposalTemplate,
        subject: String(body.subject ?? ''),
        body: String(body.body ?? ''),
        cc: body.cc ? String(body.cc) : null,
        bcc: body.bcc ? String(body.bcc) : null,
        created_by: ctx.user?.id ?? 1,
      }
      s.crmProposalTemplates.unshift(created)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^crm\/proposal-templates\/\d+$/)) {
    const id = Number(path.split('/')[3])
    const body = data as Record<string, unknown>
    let updated: (typeof state.crmProposalTemplates)[0] | undefined
    mutateState((s) => {
      const template = s.crmProposalTemplates.find((t) => t.id === id)
      if (!template) throw mockError(404, 'القالب غير موجود')
      Object.assign(template, body)
      updated = template
    })
    return updated
  }

  if (m === 'GET' && path === 'crm/reports/follow-ups-by-user') {
    return [{ name: 'ليلى — CRM', total: state.crmSchedules.length }]
  }

  if (m === 'GET' && path === 'crm/reports/follow-ups-by-contact') {
    return state.crmSchedules.map((s) => ({
      contact_name: s.lead?.name ?? s.customer?.name ?? 'Unknown',
      total: 1,
    }))
  }

  if (m === 'GET' && path === 'crm/reports/lead-to-customer') {
    const from = params.from ?? new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
    const to = params.to ?? new Date().toISOString().split('T')[0]
    const conversions = state.leads.filter((l) => l.converted_on)
    return {
      from,
      to,
      total_converted: conversions.length,
      conversions,
    }
  }

  if (m === 'GET' && path === 'crm/marketplace') {
    return paginate(state.crmMarketplaces ?? [], params)
  }

  if (m === 'POST' && path === 'crm/marketplace') {
    const body = data as { marketplace?: string; site_key?: string; site_id?: string }
    let created: CrmMarketplace | undefined
    mutateState((s) => {
      const row: CrmMarketplace = {
        id: (s.crmMarketplaces?.length ?? 0) + 1,
        marketplace: body.marketplace ?? 'facebook_leads',
        site_key: body.site_key ?? null,
        site_id: body.site_id ?? null,
      }
      s.crmMarketplaces = [...(s.crmMarketplaces ?? []), row]
      created = row
    })
    return created
  }

  if (m === 'DELETE' && path.startsWith('crm/marketplace/')) {
    const id = Number(path.split('/').pop())
    mutateState((s) => {
      s.crmMarketplaces = (s.crmMarketplaces ?? []).filter((row) => row.id !== id)
    })
    return { message: 'deleted' }
  }

  if (m === 'GET' && path === 'crm/order-requests') {
    const rows = state.invoices.filter((inv) => inv.is_order_request)
    return paginate(rows, params)
  }

  if (m === 'PUT' && path.startsWith('crm/order-requests/')) {
    const id = Number(path.split('/').pop())
    const body = data as { status?: string }
    let updated: SalesInvoice | undefined
    mutateState((s) => {
      const idx = s.invoices.findIndex((inv) => inv.id === id && inv.is_order_request)
      if (idx >= 0 && body.status) {
        s.invoices[idx] = { ...s.invoices[idx], status: body.status }
        updated = s.invoices[idx]
      }
    })
    if (!updated) return { status: 404, body: { message: 'Not found' } }
    return updated
  }

  if (m === 'GET' && path === 'crm/settings') {
    return state.crmSettings
  }

  if (m === 'PUT' && path === 'crm/settings') {
    const body = data as Record<string, unknown>
    mutateState((s) => {
      s.crmSettings = { ...s.crmSettings, ...body }
    })
    return loadState().crmSettings
  }

  if (m === 'GET' && path === 'hrm/settings') {
    return state.hrmSettings
  }

  if (m === 'PUT' && path === 'hrm/settings') {
    const body = data as Record<string, unknown>
    mutateState((s) => {
      s.hrmSettings = { ...s.hrmSettings, ...body }
    })
    return loadState().hrmSettings
  }

  if (m === 'GET' && path === 'admin/users') {
    let staff = state.users.map(({ password: _, ...u }) => enrichAdminUser(state, u))
    const scope = getApiDepartmentScope(ctx)
    if (scope != null) {
      staff = staff.filter((u) => u.administration_id === scope)
    }
    const nameFilter = params['filter[name]']
    if (nameFilter) {
      staff = staff.filter((u) => u.name.includes(nameFilter))
    }
    const emailFilter = params['filter[email]']
    if (emailFilter) {
      staff = staff.filter((u) => u.email.includes(emailFilter))
    }
    const adminFilter = params['filter[administration_id]']
    if (adminFilter) {
      staff = staff.filter((u) => u.administration_id === Number(adminFilter))
    }
    const branchFilter = params['filter[branch_id]']
    if (branchFilter) {
      staff = staff.filter((u) => u.branch_id === Number(branchFilter))
    }
    const sectionFilter = params['filter[section_id]']
    if (sectionFilter) {
      staff = staff.filter((u) => u.section_id === Number(sectionFilter))
    }
    return paginate(staff, params)
  }

  if (m === 'POST' && path === 'admin/users') {
    const body = data as Record<string, unknown>
    const scope = getApiDepartmentScope(ctx)
    if (scope != null) {
      body.administration_id = scope
      if (body.branch_id != null && !isBranchInScope(state, ctx, Number(body.branch_id))) {
        throw mockError(403, 'لا يمكنك ربط المستخدم بفرع خارج إدارتك')
      }
      if (Array.isArray(body.role_names)) {
        body.role_names = (body.role_names as string[]).filter(
          (role) => !['Admin', 'AdministrationManager', 'Super Admin'].includes(role),
        )
      }
    }
    let created: (typeof state.users)[0] | undefined
    mutateState((s) => {
      s.counters.adminUser = (s.counters.adminUser ?? 7) + 1
      const roleNames = (body.role_names as string[]) ?? []
      created = {
        id: s.counters.adminUser,
        name: String(body.name ?? ''),
        email: String(body.email ?? ''),
        password: String(body.password ?? 'demo'),
        organization_id: 1,
        administration_id: body.administration_id ? Number(body.administration_id) : null,
        department_id: body.administration_id ? Number(body.administration_id) : null,
        branch_id: body.branch_id ? Number(body.branch_id) : null,
        allowed_branch_ids: Array.isArray(body.branch_ids)
          ? (body.branch_ids as number[]).map(Number)
          : [],
        section_id: body.section_id ? Number(body.section_id) : null,
        demo_role: 'sales',
        organization: s.organizationProfile
          ? { id: s.organizationProfile.id, name: s.organizationProfile.name, name_ar: s.organizationProfile.name_ar ?? undefined }
          : undefined,
        administration: body.administration_id
          ? s.departments.find((d) => d.id === Number(body.administration_id)) ?? null
          : null,
        branch: s.branches.find((b) => b.id === Number(body.branch_id)),
        section: body.section_id
          ? s.sections.find((sec) => sec.id === Number(body.section_id)) ?? null
          : null,
        roles: s.adminRoles.filter((r) => roleNames.includes(r.name)).map((r) => ({ id: r.id, name: r.name })),
      }
      s.users.push(created!)
      s.adminActivityLogs.unshift({
        id: (s.counters.activityLog = (s.counters.activityLog ?? 3) + 1),
        log_name: 'admin',
        description: 'User created',
        created_at: new Date().toISOString(),
        causer: ctx.user ? { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email } : undefined,
      })
    })
    const { password: __, ...authUser } = created!
    return authUser
  }

  if (m === 'PUT' && path.match(/^admin\/users\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as Record<string, unknown>
    let updated: (typeof state.users)[0] | undefined
    mutateState((s) => {
      const user = s.users.find((u) => u.id === id)
      if (!user) throw mockError(404, 'المستخدم غير موجود')
      if (body.name) user.name = String(body.name)
      if (body.email) user.email = String(body.email)
      if (body.password) user.password = String(body.password)
      if (body.administration_id != null) {
        user.administration_id = body.administration_id ? Number(body.administration_id) : null
        user.department_id = user.administration_id
        user.administration = user.administration_id
          ? s.departments.find((d) => d.id === user.administration_id) ?? null
          : null
      }
      if (body.branch_id != null) {
        user.branch_id = body.branch_id ? Number(body.branch_id) : null
        user.branch = user.branch_id ? s.branches.find((b) => b.id === user.branch_id) : undefined
      }
      if (Array.isArray(body.branch_ids)) {
        user.allowed_branch_ids = (body.branch_ids as number[]).map(Number)
      }
      if (body.section_id != null) {
        user.section_id = body.section_id ? Number(body.section_id) : null
        user.section = user.section_id ? s.sections.find((sec) => sec.id === user.section_id) ?? null : null
      }
      if (Array.isArray(body.role_names)) {
        user.roles = s.adminRoles
          .filter((r) => (body.role_names as string[]).includes(r.name))
          .map((r) => ({ id: r.id, name: r.name }))
      }
      updated = user
    })
    const { password: __, ...authUser } = updated!
    return authUser
  }

  if (m === 'GET' && path === 'admin/roles') {
    return state.adminRoles
  }

  if (m === 'GET' && path.match(/^admin\/roles\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const role = state.adminRoles.find((r) => r.id === id)
    if (!role) throw mockError(404, 'الدور غير موجود')
    return role
  }

  if (m === 'POST' && path === 'admin/roles') {
    const body = data as { name?: string; name_ar?: string; permissions?: string[] }
    let created: (typeof state.adminRoles)[0] | undefined
    mutateState((s) => {
      s.counters.adminRole = (s.counters.adminRole ?? 3) + 1
      const perms = (body.permissions ?? []).map((name, idx) => ({ id: 100 + idx, name }))
      const slug = body.name?.trim() || `custom_${Date.now()}`
      created = {
        id: s.counters.adminRole,
        name: slug,
        name_ar: String(body.name_ar ?? body.name ?? slug),
        permissions: perms,
        permissions_count: perms.length,
      }
      s.adminRoles.push(created)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^admin\/roles\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as { name?: string; name_ar?: string; permissions?: string[] }
    let updated: (typeof state.adminRoles)[0] | undefined
    mutateState((s) => {
      const role = s.adminRoles.find((r) => r.id === id)
      if (!role) throw mockError(404, 'الدور غير موجود')
      if (body.name_ar) role.name_ar = body.name_ar
      if (body.name) role.name = body.name
      if (body.permissions) {
        role.permissions = body.permissions.map((name, idx) => ({ id: 200 + idx, name }))
        role.permissions_count = role.permissions.length
      }
      updated = role
    })
    return updated
  }

  if (m === 'GET' && path === 'admin/permissions') {
    const allKeys = [
      'dashboard.view', 'branches.manage', 'warehouses.manage', 'inventory.manage', 'stock.transfer',
      'customers.manage', 'sales.pos', 'sales.invoices.view',
      'review.view_queue', 'review.view_contracts', 'review.view_detail',
      'review.approve', 'review.reject', 'review.print',
      'installments.collect', 'installments.view',
      'installments.reconcile', 'external_collections.collect', 'collection_accounts.manage',
      'users.manage', 'roles.manage', 'audit.view', 'settings.manage', 'reports.financial',
      'crm.access_all_leads', 'crm.access_own_leads', 'crm.access_all_schedule', 'crm.access_own_schedule',
      'crm.access_all_campaigns', 'crm.access_own_campaigns', 'crm.access_contact_login', 'crm.access_sources',
      'crm.access_life_stage', 'crm.access_proposal', 'crm.view_all_call_log', 'crm.view_own_call_log',
      'crm.access_b2b_marketplace', 'crm.leads.manage', 'crm.activities.manage',
      'hrm.leave.manage', 'hrm.leave.approve', 'hrm.attendance.manage', 'hrm.payroll.manage',
      'hrm.shift.manage', 'hrm.holiday.manage', 'hrm.allowance.manage', 'hrm.sales_target.manage',
      'hr.employees.manage', 'hr.attendance.manage',
      'accounting.access_accounting_module', 'accounting.manage_accounts', 'accounting.view_journal',
      'accounting.add_journal', 'accounting.edit_journal', 'accounting.delete_journal',
      'accounting.map_transactions', 'accounting.view_transfer', 'accounting.add_transfer',
      'accounting.edit_transfer', 'accounting.delete_transfer', 'accounting.manage_budget',
      'accounting.view_reports',
    ]
    const grouped: Record<string, string[]> = {}
    for (const perm of allKeys) {
      const group = perm.split('.')[0]
      if (!grouped[group]) grouped[group] = []
      grouped[group].push(perm)
    }
    return grouped
  }

  if (m === 'GET' && path === 'admin/activity-log') {
    let logs = [...(state.adminActivityLogs ?? [])]
    if (params.search) {
      logs = logs.filter((l) => l.description.toLowerCase().includes(String(params.search).toLowerCase()))
    }
    if (params.log_name) logs = logs.filter((l) => l.log_name === params.log_name)
    if (params.causer_id) logs = logs.filter((l) => l.causer?.id === Number(params.causer_id))
    if (params.from) {
      const from = new Date(String(params.from))
      logs = logs.filter((l) => l.created_at && new Date(l.created_at) >= from)
    }
    if (params.to) {
      const to = new Date(String(params.to))
      to.setHours(23, 59, 59, 999)
      logs = logs.filter((l) => l.created_at && new Date(l.created_at) <= to)
    }
    logs.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    return paginate(logs, params)
  }

  if (m === 'GET' && path === 'messaging/logs') {
    const logs = [...state.customerMessageLogs].sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    )
    return paginate(logs, params)
  }

  if (m === 'GET' && path === 'admin/settings') {
    return {
      organization: state.organizationProfile,
      settings: {
        general: state.generalSettings,
        sales: state.salesSettings,
        security: state.securitySettings,
        messaging: state.messagingSettings,
      },
      module_settings: {
        crm: state.crmSettings,
        hrm: state.hrmSettings,
        accounting: state.accountingSettings,
      },
    }
  }

  if (m === 'PUT' && path === 'admin/settings') {
    const body = data as Record<string, unknown>
    mutateState((s) => {
      s.organizationProfile = {
        ...s.organizationProfile,
        ...(body.name !== undefined ? { name: String(body.name) } : {}),
        ...(body.name_ar !== undefined ? { name_ar: body.name_ar as string | null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone as string | null } : {}),
        ...(body.email !== undefined ? { email: body.email as string | null } : {}),
        ...(body.address !== undefined ? { address: body.address as string | null } : {}),
        ...(body.enabled_modules !== undefined
          ? { enabled_modules: body.enabled_modules as string[] }
          : {}),
        ...(body.is_active !== undefined ? { is_active: Boolean(body.is_active) } : {}),
        updated_at: new Date().toISOString(),
      }
      const settings = body.settings as Record<string, Record<string, unknown>> | undefined
      if (settings?.general) s.generalSettings = { ...s.generalSettings, ...settings.general }
      if (settings?.sales) s.salesSettings = { ...s.salesSettings, ...settings.sales }
      if (settings?.security) s.securitySettings = { ...s.securitySettings, ...settings.security }
      if (settings?.messaging) {
        const m = settings.messaging
        s.messagingSettings = {
          ...s.messagingSettings,
          ...m,
          templates: {
            ...s.messagingSettings.templates,
            ...(m.templates as Record<string, string> | undefined),
          },
        }
      }
      s.adminActivityLogs.unshift({
        id: (s.counters.activityLog = (s.counters.activityLog ?? 3) + 1),
        log_name: 'admin',
        description: 'Organization settings updated',
        created_at: new Date().toISOString(),
        causer: ctx.user ? { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email } : undefined,
      })
    })
    const s = loadState()
    return {
      organization: s.organizationProfile,
      settings: {
        general: s.generalSettings,
        sales: s.salesSettings,
        security: s.securitySettings,
        messaging: s.messagingSettings,
      },
      module_settings: { crm: s.crmSettings, hrm: s.hrmSettings, accounting: s.accountingSettings },
    }
  }

  if (m === 'POST' && path === 'admin/settings/logo') {
    const file = (data as FormData | undefined)?.get?.('logo')
    let logoUrl: string | null = null
    if (file instanceof Blob) {
      logoUrl = URL.createObjectURL(file)
    }
    mutateState((s) => {
      s.generalSettings = { ...s.generalSettings, logo_url: logoUrl }
      s.organizationProfile.updated_at = new Date().toISOString()
    })
    const s = loadState()
    return {
      logo_url: logoUrl,
      organization: s.organizationProfile,
      settings: {
        general: s.generalSettings,
        sales: s.salesSettings,
        security: s.securitySettings,
        messaging: s.messagingSettings,
      },
      module_settings: { crm: s.crmSettings, hrm: s.hrmSettings, accounting: s.accountingSettings },
    }
  }

  if (m === 'GET' && path === 'staff-options') {
    return {
      data: state.users.map((u) => ({ id: u.id, name: u.name })),
    }
  }

  if (m === 'GET' && path === 'notifications') {
    return { data: [], unread_count: 0 }
  }

  if (m === 'POST' && path === 'notifications/read-all') {
    return { ok: true }
  }

  if (m === 'POST' && path.match(/^installments\/\d+\/reconcile$/)) {
    return { id: 1, status: 'open', late_fee_waived: 0 }
  }

  if (m === 'POST' && path.match(/^installments\/reconciliations\/\d+\/close$/)) {
    return { id: 1, status: 'closed', late_fee_waived: 0 }
  }

  if (m === 'GET' && path === 'collection-accounts/active') {
    return {
      data: [
        {
          id: 1,
          phone: '01099998888',
          payment_method: 'bank_transfer',
          account_number: '1234567890',
          beneficiary_name: 'حساب تجريبي',
          bank_name: 'البنك الأهلي',
          is_active: true,
        },
      ],
    }
  }

  if (m === 'GET' && path === 'collection-accounts') {
    return paginate([], params)
  }

  if (m === 'POST' && path === 'external-collections/collect') {
    return { id: 1, collection_channel: 'external', amount: (data as { amount?: number }).amount ?? 0 }
  }

  const chatResult = tryHandleChatRequest(m, path, data as Record<string, unknown> | undefined, ctx.user?.id)
  if (chatResult !== null) return chatResult

  const hrmResult = tryHandleHrmRequest(m, path, data, params, ctx)
  if (hrmResult !== undefined) return hrmResult

  const pricingResult = tryHandlePricingRequest(m, path, data as Record<string, unknown> | undefined, params)
  if (pricingResult !== null) return pricingResult

  throw mockError(404, `Mock endpoint not found: ${m} ${path}`)
}

function mockError(status: number, message: string): Error & { response: { status: number; data: { message: string } } } {
  const err = new Error(message) as Error & {
    response: { status: number; data: { message: string } }
    isAxiosError: boolean
  }
  err.response = { status, data: { message } }
  err.isAxiosError = true
  return err
}
