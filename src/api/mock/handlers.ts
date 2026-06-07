import type { AxiosRequestConfig } from 'axios'
import type {
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
} from '../types'
import { loadState, mutateState, resetState } from './store'
import type { DemoState } from './seed'

interface MockContext {
  branchId?: number
  warehouseId?: number
  organizationId?: number
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
    }
    return stats
  }

  if (m === 'GET' && path === 'departments') {
    const enriched = state.departments.map((d) => enrichDepartment(state, d))
    return paginate(enriched, params)
  }

  if (m === 'POST' && path === 'departments') {
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
      created = enrichDepartment(s, dept)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^departments\/\d+$/)) {
    const id = Number(path.split('/')[1])
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
    const id = Number(path.split('/')[1])
    mutateState((s) => {
      const hasBranches = s.branches.some((b) => b.department_id === id)
      if (hasBranches) throw mockError(422, 'لا يمكن حذف إدارة مرتبطة بفروع')
      s.departments = s.departments.filter((d) => d.id !== id)
      s.departmentStocks = s.departmentStocks.filter((d) => d.department_id !== id)
    })
    return { message: 'تم الحذف' }
  }

  if (m === 'GET' && path === 'branches') {
    let items = [...state.branches]
    const deptFilter = params['filter[department_id]']
    if (deptFilter) {
      items = items.filter((b) => b.department_id === Number(deptFilter))
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
    const deptFilter = params['filter[department_id]']
      ? Number(params['filter[department_id]'])
      : undefined
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
    const branchFilter = params['filter[branch_id]'] || ctx.branchId
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
    let created: Customer | undefined
    mutateState((s) => {
      const customer: Customer = {
        id: s.counters.customer++,
        branch_id: body.branch_id ?? ctx.branchId ?? 1,
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

  if (m === 'POST' && path === 'demo/reset') {
    resetState()
    return { message: 'تم إعادة ضبط الديمو' }
  }

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
