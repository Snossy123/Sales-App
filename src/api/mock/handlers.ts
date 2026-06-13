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
  DashboardStats,
  Department,
  GpsStock,
  InventoryOverviewRow,
  LoginResponse,
  PaginatedResponse,
  SalesInvoice,
  TransactionMapPayload,
  TrialBalanceReport,
} from '../types'
import { loadState, mutateState, resetState } from './store'
import type { AuthUser } from '../types'
import { getScopedDepartmentId, isSuperAdmin } from '../../lib/access'
import type { DemoState } from './seed'
import { tryHandleHrmRequest } from './hrmHandlers'

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
  const scope = getApiDepartmentScope(ctx)
  if (scope == null) return null
  return state.branches
    .filter((b) => (b.administration_id ?? b.department_id) === scope)
    .map((b) => b.id)
}

function isBranchInScope(state: DemoState, ctx: MockContext, branchId?: number | null): boolean {
  const branchIds = getScopedBranchIds(state, ctx)
  if (branchIds == null) return true
  if (branchId == null) return false
  return branchIds.includes(branchId)
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

function enrichCustomer(state: DemoState, customer: Customer): Customer {
  const invoices = state.invoices
    .filter((i) => i.customer_id === customer.id && i.status === 'confirmed')
    .map((inv) => ({
      ...inv,
      customer: undefined,
      installment_plan: inv.installment_plan
        ? { ...inv.installment_plan, items: inv.installment_plan.items ?? [] }
        : null,
    }))
  return { ...customer, sales_invoices: invoices }
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

function enrichAdminUser(state: DemoState, user: Omit<import('./seed').DemoUser, 'password'>) {
  const administration = user.administration_id
    ? state.departments.find((d) => d.id === user.administration_id)
    : null
  const branch = user.branch_id ? state.branches.find((b) => b.id === user.branch_id) : null
  const section = user.section_id ? state.sections.find((s) => s.id === user.section_id) : null
  return {
    ...user,
    department_id: user.administration_id ?? user.department_id ?? null,
    administration: administration ?? null,
    branch: branch ?? null,
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

function refreshInvoicePayment(invoice: SalesInvoice): void {
  if (invoice.payment_term === 'cash' && invoice.status === 'confirmed') {
    invoice.paid_amount = Number(invoice.total)
    invoice.balance_due = 0
    invoice.payment_status = 'paid'
    return
  }

  const plan = invoice.installment_plan
  if (!plan?.items?.length) {
    invoice.paid_amount = invoice.payment_term === 'installment' ? Number(plan?.down_payment ?? 0) : 0
    invoice.balance_due = Number(invoice.total) - Number(invoice.paid_amount)
    invoice.payment_status = invoice.balance_due <= 0 ? 'paid' : invoice.paid_amount > 0 ? 'partial' : 'unpaid'
    return
  }

  const down = Number(plan.down_payment ?? 0)
  const itemsPaid = plan.items.reduce((s, i) => s + Number(i.paid_amount), 0)
  invoice.paid_amount = down + itemsPaid
  invoice.balance_due = Math.max(0, Number(invoice.total) - invoice.paid_amount)
  if (invoice.balance_due <= 0) invoice.payment_status = 'paid'
  else if (invoice.paid_amount > 0) invoice.payment_status = 'partial'
  else invoice.payment_status = 'unpaid'
}

function generateInstallmentItems(
  state: DemoState,
  invoice: SalesInvoice,
): void {
  const plan = invoice.installment_plan
  if (!plan) return

  const financed = Number(invoice.total) - Number(plan.down_payment)
  const count = plan.installment_count
  const base = Math.floor((financed / count) * 100) / 100
  let remainder = Math.round((financed - base * count) * 100) / 100
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

  if (m === 'GET' && path === 'dashboard') {
    const branchId = ctx.branchId
    const warehouseId = ctx.warehouseId
    const today = new Date().toISOString().split('T')[0]

    const branchInvoices = state.invoices.filter(
      (i) => !branchId || i.branch_id === branchId,
    )
    const todayInvoices = branchInvoices.filter((i) => i.invoice_date === today)
    const confirmed = branchInvoices.filter((i) => i.status === 'confirmed')

    let outstanding = 0
    let overdue = 0
    let dueWeek = 0
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() + 7)

    for (const inv of confirmed) {
      outstanding += Number(inv.balance_due)
      for (const item of inv.installment_plan?.items ?? []) {
        if (item.status === 'overdue') overdue++
        const due = new Date(item.due_date)
        if (due >= new Date() && due <= weekEnd && item.status !== 'paid') dueWeek++
      }
    }

    const stock = warehouseId ? getStock(state, warehouseId) : null
    const availableQty = stock ? stock.quantity - stock.reserved : state.stocks.reduce((s, x) => s + x.quantity - x.reserved, 0)

    const stats: DashboardStats = {
      sales_today: todayInvoices
        .filter((i) => i.status === 'confirmed')
        .reduce((s, i) => s + Number(i.total), 0),
      invoices_today: todayInvoices.length,
      customers_count: state.customers.filter((c) => !branchId || c.branch_id === branchId).length,
      available_units: availableQty,
      pending_reviews: branchInvoices.filter((i) => i.status === 'pending_review').length,
      overdue_installments: overdue,
      due_this_week: dueWeek,
      outstanding_balance: outstanding,
      recent_invoices: branchInvoices.slice(0, 5).map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        total: inv.total,
        status: inv.status ?? 'pending_review',
        payment_term: inv.payment_term,
        customer: state.customers.find((c) => c.id === inv.customer_id),
      })),
      pending_review_invoices: branchInvoices
        .filter((i) => i.status === 'pending_review')
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
      overdue_installments_list: confirmed.flatMap((inv) =>
        (inv.installment_plan?.items ?? [])
          .filter((item) => item.status === 'overdue')
          .slice(0, 5)
          .map((item) => ({
            id: item.id,
            due_date: item.due_date,
            amount: item.amount,
            paid_amount: item.paid_amount,
            status: item.status,
            sales_invoice: {
              id: inv.id,
              invoice_number: inv.invoice_number,
              customer: state.customers.find((c) => c.id === inv.customer_id),
            },
          })),
      ).slice(0, 5),
    }
    return stats
  }

  if (m === 'GET' && path === 'administrations') {
    const scope = getApiDepartmentScope(ctx)
    let items = state.departments
    if (scope != null) items = items.filter((d) => d.id === scope)
    return paginate(items, params)
  }

  if (m === 'GET' && path.match(/^administrations\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const scope = getApiDepartmentScope(ctx)
    if (scope != null && scope !== id) throw mockError(403, 'غير مصرح بعرض هذه الإدارة')
    const dept = state.departments.find((d) => d.id === id)
    if (!dept) throw mockError(404, 'الإدارة غير موجودة')
    return enrichDepartment(state, dept)
  }

  if (m === 'POST' && path === 'administrations') {
    if (ctx.user && !isSuperAdmin(ctx.user)) throw mockError(403, 'غير مصرح بإنشاء إدارات')
    const body = data as Partial<Department>
    let created: Department | undefined
    mutateState((s) => {
      const id = s.counters.department++
      const dept: Department = {
        id,
        name: body.name ?? body.name_ar ?? '',
        name_ar: body.name_ar ?? body.name ?? '',
        code: body.code ?? `D${id}`,
        is_active: body.is_active ?? true,
      }
      s.departments.push(dept)
      s.departmentStocks.push({ department_id: id, quantity: 0, pending: 0, distributed: 0 })
      created = dept
    })
    return created
  }

  if (m === 'GET' && path === 'departments') {
    const branchFilter = params['filter[branch_id]']
    if (branchFilter) {
      const items = state.sections.filter((s) => s.branch_id === Number(branchFilter))
      return paginate(items, params)
    }

    const scope = getApiDepartmentScope(ctx)
    let items = state.departments
    if (scope != null) items = items.filter((d) => d.id === scope)
    const enriched = items.map((d) => enrichDepartment(state, d))
    return paginate(enriched, params)
  }

  if (m === 'GET' && path.match(/^departments\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const scope = getApiDepartmentScope(ctx)
    if (scope != null && scope !== id) throw mockError(403, 'غير مصرح بعرض هذه الإدارة')
    const dept = state.departments.find((d) => d.id === id)
    if (!dept) throw mockError(404, 'الإدارة غير موجودة')
    return enrichDepartment(state, dept)
  }

  if (m === 'POST' && path === 'departments') {
    const body = data as Partial<Department> & { branch_id?: number }
    if (body.branch_id) {
      let created: (typeof state.sections)[0] | undefined
      mutateState((s) => {
        const id = s.counters.section = (s.counters.section ?? 6) + 1
        created = {
          id,
          branch_id: body.branch_id,
          name: body.name ?? body.name_ar ?? '',
          name_ar: body.name_ar ?? body.name ?? '',
          code: body.code ?? `S${id}`,
        }
        s.sections.push(created!)
      })
      return created
    }

    if (ctx.user && !isSuperAdmin(ctx.user)) throw mockError(403, 'غير مصرح بإنشاء إدارات')
    let createdAdmin: Department | undefined
    mutateState((s) => {
      const id = s.counters.department++
      const dept: Department = {
        id,
        name: body.name ?? body.name_ar ?? '',
        name_ar: body.name_ar ?? body.name ?? '',
        code: body.code ?? `D${id}`,
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
    const scope = getApiDepartmentScope(ctx)
    if (scope != null && scope !== id) throw mockError(403, 'غير مصرح بتعديل هذه الإدارة')
    const body = data as Partial<Department>
    let updated: Department | undefined
    mutateState((s) => {
      const dept = s.departments.find((d) => d.id === id)
      if (!dept) throw mockError(404, 'الإدارة غير موجودة')
      if (body.name != null) dept.name = body.name
      if (body.name_ar != null) dept.name_ar = body.name_ar
      if (body.code != null) dept.code = body.code
      if (body.is_active != null) dept.is_active = body.is_active
      updated = enrichDepartment(s, dept)
    })
    return updated
  }

  if (m === 'DELETE' && path.match(/^departments\/\d+$/)) {
    if (ctx.user && !isSuperAdmin(ctx.user)) throw mockError(403, 'غير مصرح بحذف إدارات')
    const id = Number(path.split('/')[1])
    mutateState((s) => {
      const hasBranches = s.branches.some((b) => b.department_id === id)
      if (hasBranches) throw mockError(422, 'لا يمكن حذف إدارة مرتبطة بفروع')
      s.departments = s.departments.filter((d) => d.id !== id)
      s.departmentStocks = s.departmentStocks.filter((d) => d.department_id !== id)
    })
    return { message: 'تم الحذف' }
  }

  if (m === 'GET' && path.match(/^branches\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const branch = state.branches.find((b) => b.id === id)
    if (!branch) throw mockError(404, 'الفرع غير موجود')
    const scope = getApiDepartmentScope(ctx)
    if (scope != null && branch.department_id !== scope) {
      throw mockError(403, 'غير مصرح بعرض هذا الفرع')
    }
    return {
      ...branch,
      department: state.departments.find((d) => d.id === branch.department_id),
      warehouses: state.warehouses.filter((w) => w.branch_id === branch.id),
    }
  }

  if (m === 'GET' && path === 'branches') {
    let items = [...state.branches]
    const scope = getApiDepartmentScope(ctx)
    if (scope != null) {
      items = items.filter((b) => b.department_id === scope)
    }
    const deptFilter = params['filter[department_id]']
    const adminFilter = params['filter[administration_id]'] ?? deptFilter
    if (adminFilter) {
      items = items.filter((b) => (b.administration_id ?? b.department_id) === Number(adminFilter))
    }
    return paginate(
      items.map((b) => ({
        ...b,
        department: state.departments.find((d) => d.id === b.department_id),
        warehouses: state.warehouses.filter((w) => w.branch_id === b.id),
      })),
      params,
    )
  }

  if (m === 'POST' && path === 'branches') {
    const body = data as Partial<Branch>
    const scope = getApiDepartmentScope(ctx)
    if (scope != null) {
      if (body.department_id != null && body.department_id !== scope) {
        throw mockError(403, 'لا يمكن إنشاء فرع خارج إدارتك')
      }
      body.department_id = scope
    }
    let created: Branch | undefined
    mutateState((s) => {
      if (!body.department_id) throw mockError(422, 'يجب اختيار الإدارة')
      const id = s.counters.branch++
      const whId = s.counters.warehouse++
      const branch: Branch = {
        id,
        department_id: body.department_id,
        name: body.name ?? body.name_ar ?? '',
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
        code: `${branch.code}-W1`,
        is_active: true,
      })
      s.stocks.push({
        id: whId,
        warehouse_id: whId,
        branch_id: id,
        quantity: 0,
        reserved: 0,
        sold: 0,
      })
      created = {
        ...branch,
        department: s.departments.find((d) => d.id === branch.department_id),
      }
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
      if (body.name != null) branch.name = body.name
      if (body.name_ar != null) branch.name_ar = body.name_ar
      if (body.code != null) branch.code = body.code
      if (body.address != null) branch.address = body.address
      if (body.phone != null) branch.phone = body.phone
      if (body.is_active != null) branch.is_active = body.is_active
      if (body.department_id != null) branch.department_id = body.department_id
      updated = {
        ...branch,
        department: s.departments.find((d) => d.id === branch.department_id),
      }
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
    let result: ReturnType<typeof enrichDepartment> | undefined
    mutateState((s) => {
      const ds = getDeptStock(s, body.department_id)
      ds.quantity += body.quantity
      ds.pending += body.quantity
      ds.distributed = calcDistributed(s, body.department_id)
      const dept = s.departments.find((d) => d.id === body.department_id)
      if (!dept) throw mockError(404, 'الإدارة غير موجودة')
      result = enrichDepartment(s, dept)
    })
    return result
  }

  if (m === 'POST' && path === 'department-stock/distribute') {
    const body = data as { department_id: number; branch_id: number; quantity: number }
    let result: GpsStock | undefined
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
      result = { ...stock, available: stock.quantity - stock.reserved }
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
    if (branchFilter) {
      items = items.filter((w) => w.branch_id === Number(branchFilter))
    }
    return paginate(items.map((w) => ({
      ...w,
      branch: state.branches.find((b) => b.id === w.branch_id),
    })))
  }

  if (m === 'GET' && path === 'gps-product') {
    return state.gpsProduct
  }

  if (m === 'PUT' && path === 'gps-product') {
    const body = data as { sell_price?: number }
    let updated = state.gpsProduct
    mutateState((s) => {
      if (body.sell_price == null || body.sell_price <= 0) {
        throw mockError(422, 'سعر البيع يجب أن يكون أكبر من صفر')
      }
      s.gpsProduct.sell_price = body.sell_price
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
    const branchFilter = params['filter[branch_id]'] || (scopedBranchIds ? undefined : ctx.branchId)
    if (branchFilter) items = items.filter((c) => c.branch_id === Number(branchFilter))
    const statusFilter = params['filter[status]']
    if (statusFilter) items = items.filter((c) => c.status === statusFilter)
    const nameFilter = params['filter[name]']
    if (nameFilter) {
      const q = nameFilter.toLowerCase()
      items = items.filter((c) => c.name.toLowerCase().includes(q))
    }
    return paginate(items)
  }

  if (m === 'POST' && path === 'customers') {
    const body = data as Partial<Customer>
    const branchId = body.branch_id ?? ctx.branchId ?? 1
    if (!isBranchInScope(state, ctx, branchId)) {
      throw mockError(403, 'لا يمكنك إضافة عميل خارج إدارتك')
    }
    let created: Customer | undefined
    mutateState((s) => {
      const customer: Customer = {
        id: s.counters.customer++,
        branch_id: branchId,
        name: body.name ?? '',
        phone: body.phone ?? '',
        national_id: body.national_id ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        status: 'active',
        credit_score: 70,
      }
      s.customers.push(customer)
      created = customer
    })
    return created
  }

  if (m === 'GET' && path.match(/^customers\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const customer = state.customers.find((c) => c.id === id)
    if (!customer) throw mockError(404, 'العميل غير موجود')
    if (!isBranchInScope(state, ctx, customer.branch_id)) throw mockError(404, 'العميل غير موجود')
    return enrichCustomer(state, customer)
  }

  if (m === 'GET' && path === 'sales-invoices') {
    let items = [...state.invoices]
    const branchFilter = params['filter[branch_id]'] || ctx.branchId
    if (branchFilter) items = items.filter((i) => i.branch_id === Number(branchFilter))
    const statusFilter = params['filter[status]']
    if (statusFilter) items = items.filter((i) => i.status === statusFilter)
    return paginate(
      items.map((inv) => ({
        ...inv,
        customer: state.customers.find((c) => c.id === inv.customer_id),
      })),
    )
  }

  if (m === 'GET' && path.match(/^sales-invoices\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const invoice = state.invoices.find((i) => i.id === id)
    if (!invoice) throw mockError(404, 'الفاتورة غير موجودة')
    return {
      ...invoice,
      customer: state.customers.find((c) => c.id === invoice.customer_id),
    }
  }

  if (m === 'POST' && path === 'sales-invoices/checkout') {
    const body = data as CheckoutPayload & {
      lines: { product_id?: number; quantity?: number; unit_price?: number }[]
    }
    let created: SalesInvoice | undefined
    mutateState((s) => {
      const warehouseId = body.warehouse_id
      const stock = getStock(s, warehouseId)
      if (!stock) throw mockError(422, 'المخزن غير موجود')

      const line = body.lines[0]
      const qty = line.quantity ?? 1
      const unitPrice = line.unit_price ?? s.gpsProduct.sell_price
      const available = stock.quantity - stock.reserved
      if (qty > available) {
        throw mockError(422, `الكمية المتاحة ${available} قطعة فقط`)
      }

      stock.reserved += qty
      const total = qty * Number(unitPrice)
      const invoiceId = s.counters.invoice++
      const invoice: SalesInvoice = {
        id: invoiceId,
        invoice_number: `INV-2026-${String(invoiceId).padStart(4, '0')}`,
        invoice_date: body.invoice_date ?? new Date().toISOString().split('T')[0],
        branch_id: body.branch_id ?? ctx.branchId ?? stock.branch_id,
        warehouse_id: warehouseId,
        customer_id: body.customer_id,
        status: 'pending_review',
        payment_term: body.payment_term,
        payment_status: 'unpaid',
        total,
        paid_amount: 0,
        balance_due: total,
        lines: [
          {
            id: invoiceId,
            product_id: s.gpsProduct.id,
            quantity: qty,
            unit_price: unitPrice,
            product_name_ar: s.gpsProduct.name_ar,
          },
        ],
        created_by: 2,
      }

      if (body.payment_term === 'installment' && body.installment_plan) {
        invoice.installment_plan = {
          id: invoiceId,
          down_payment: body.installment_plan.down_payment,
          installment_count: body.installment_plan.installment_count,
          interval_days: body.installment_plan.interval_days ?? 30,
          first_due_date: body.installment_plan.first_due_date,
          status: 'draft',
          items: [],
        }
      }

      s.invoices.push(invoice)
      created = invoice
    })
    return created
  }

  if (m === 'POST' && path.match(/^sales-invoices\/\d+\/approve$/)) {
    const id = Number(path.split('/')[2])
    let updated: SalesInvoice | undefined
    mutateState((s) => {
      const invoice = s.invoices.find((i) => i.id === id)
      if (!invoice) throw mockError(404, 'الفاتورة غير موجودة')
      if (invoice.status !== 'pending_review') {
        throw mockError(422, 'الفاتورة ليست بانتظار المراجعة')
      }

      const stock = invoice.warehouse_id ? getStock(s, invoice.warehouse_id) : undefined
      const qty = invoice.lines?.[0]?.quantity ?? 0
      if (stock) {
        stock.reserved -= qty
        stock.quantity -= qty
        stock.sold += qty
      }

      invoice.status = 'confirmed'
      invoice.confirmed_at = new Date().toISOString()
      invoice.reviewed_at = invoice.confirmed_at
      invoice.reviewed_by = 3

      if (invoice.payment_term === 'installment' && invoice.installment_plan) {
        generateInstallmentItems(s, invoice)
        invoice.paid_amount = Number(invoice.installment_plan.down_payment)
        invoice.balance_due = Number(invoice.total) - invoice.paid_amount
        invoice.payment_status = invoice.balance_due <= 0 ? 'paid' : 'partial'
      } else {
        invoice.paid_amount = Number(invoice.total)
        invoice.balance_due = 0
        invoice.payment_status = 'paid'
      }

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
      if (invoice.status !== 'pending_review') {
        throw mockError(422, 'الفاتورة ليست بانتظار المراجعة')
      }

      const stock = invoice.warehouse_id ? getStock(s, invoice.warehouse_id) : undefined
      const qty = invoice.lines?.[0]?.quantity ?? 0
      if (stock) stock.reserved -= qty

      invoice.status = 'rejected'
      invoice.rejection_reason = body.reason ?? 'مرفوضة'
      invoice.reviewed_at = new Date().toISOString()
      invoice.reviewed_by = 3
      updated = invoice
    })
    return updated
  }

  if (m === 'GET' && (path === 'installments' || path === 'installments/overdue')) {
    const branchId = ctx.branchId
    const onlyOverdue = path === 'installments/overdue'
    const rows: Record<string, unknown>[] = []

    for (const inv of state.invoices) {
      if (inv.status !== 'confirmed' || inv.payment_term !== 'installment') continue
      if (branchId && inv.branch_id !== branchId) continue
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
          invoice_number: inv.invoice_number,
          customer_id: inv.customer_id,
          customer_name: customer?.name,
          customer_phone: customer?.phone,
          remaining: Number(item.amount) - Number(item.paid_amount),
        })
      }
    }

    return paginate(rows, params)
  }

  if (m === 'POST' && path.match(/^sales-invoices\/\d+\/installments\/collect$/)) {
    const id = Number(path.split('/')[2])
    const body = data as { installment_item_id: number; amount: number }
    let result: { invoice: SalesInvoice; item: unknown } | undefined
    mutateState((s) => {
      const invoice = s.invoices.find((i) => i.id === id)
      if (!invoice || invoice.status !== 'confirmed') {
        throw mockError(422, 'الفاتورة غير متاحة للتحصيل')
      }
      const item = invoice.installment_plan?.items?.find((i) => i.id === body.installment_item_id)
      if (!item) throw mockError(404, 'القسط غير موجود')

      const remaining = Number(item.amount) - Number(item.paid_amount)
      if (body.amount <= 0 || body.amount > remaining) {
        throw mockError(422, `المبلغ المتبقي ${remaining} ج.م`)
      }

      item.paid_amount = Number(item.paid_amount) + body.amount
      if (item.paid_amount >= Number(item.amount)) item.status = 'paid'
      else item.status = 'partial'

      refreshInvoicePayment(invoice)
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
      recent_entries: recent,
    }
    return payload
  }

  if (m === 'GET' && path === 'accounting/chart-of-accounts') {
    let accounts = [...state.accountingAccounts]
    const status = params['filter[status]']
    const primaryType = params['filter[account_primary_type]']
    if (status) accounts = accounts.filter((a) => a.status === status)
    if (primaryType) accounts = accounts.filter((a) => a.account_primary_type === primaryType)
    return paginate(accounts, params)
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
    }
    return report
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
        .map(({ id, name, gl_code, account_primary_type }) => ({
          id,
          name,
          gl_code,
          account_primary_type,
        })),
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
    if (ctx.branchId) leads = leads.filter((l) => !l.branch?.id || l.branch.id === ctx.branchId)
    return paginate(leads, params)
  }

  if (m === 'PUT' && path.match(/^leads\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const body = data as { status?: string }
    let updated = state.leads.find((l) => l.id === id)
    if (!updated) throw mockError(404, 'العميل المحتمل غير موجود')
    mutateState((s) => {
      const lead = s.leads.find((l) => l.id === id)!
      if (body.status) lead.status = body.status
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
    const body = data as { name?: string; permissions?: string[] }
    let created: (typeof state.adminRoles)[0] | undefined
    mutateState((s) => {
      s.counters.adminRole = (s.counters.adminRole ?? 3) + 1
      const perms = (body.permissions ?? []).map((name, idx) => ({ id: 100 + idx, name }))
      created = {
        id: s.counters.adminRole,
        name: String(body.name ?? ''),
        permissions: perms,
        permissions_count: perms.length,
      }
      s.adminRoles.push(created)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^admin\/roles\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as { name?: string; permissions?: string[] }
    let updated: (typeof state.adminRoles)[0] | undefined
    mutateState((s) => {
      const role = s.adminRoles.find((r) => r.id === id)
      if (!role) throw mockError(404, 'الدور غير موجود')
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
      'customers.manage', 'sales.pos', 'sales.invoices.view', 'installments.collect', 'installments.view',
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

  if (m === 'GET' && path === 'admin/settings') {
    return {
      organization: state.organizationProfile,
      settings: {
        general: state.generalSettings,
        sales: state.salesSettings,
        security: state.securitySettings,
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
      },
      module_settings: { crm: s.crmSettings, hrm: s.hrmSettings, accounting: s.accountingSettings },
    }
  }

  const hrmResult = tryHandleHrmRequest(m, path, data, params, ctx)
  if (hrmResult !== undefined) return hrmResult

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
