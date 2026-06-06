import type { AxiosRequestConfig } from 'axios'
import type {
  CheckoutPayload,
  Customer,
  DashboardStats,
  GpsStock,
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
    return paginate(state.departments, params)
  }

  if (m === 'GET' && path === 'branches') {
    let items = [...state.branches]
    const deptFilter = params['filter[department_id]']
    if (deptFilter) {
      items = items.filter((b) => b.department_id === Number(deptFilter))
    }
    return paginate(items.map((b) => ({
      ...b,
      warehouses: state.warehouses.filter((w) => w.branch_id === b.id),
    })))
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
    const body = data as { warehouse_id: number; quantity: number }
    let updated: GpsStock | undefined
    mutateState((s) => {
      const stock = getStock(s, body.warehouse_id)
      if (!stock) throw mockError(404, 'المخزن غير موجود')
      stock.quantity += body.quantity
      updated = { ...stock, available: stock.quantity - stock.reserved }
    })
    return updated
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
