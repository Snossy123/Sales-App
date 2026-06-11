import type { AxiosRequestConfig } from 'axios'
import type { PaginatedResponse, PortalLoginResponse, PortalUser, SalesInvoice } from '../types'
import { loadState } from './store'
import type { DemoState } from './seed'

interface PortalMockContext {
  user?: PortalUser
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

function mockError(status: number, message: string): Error & { response: { status: number; data: { message: string } }; isAxiosError: boolean } {
  const err = new Error(message) as Error & {
    response: { status: number; data: { message: string } }
    isAxiosError: boolean
  }
  err.response = { status, data: { message } }
  err.isAxiosError = true
  return err
}

function getCustomerInvoices(state: DemoState, customerId: number): SalesInvoice[] {
  return state.invoices.filter(
    (i) => i.customer_id === customerId && i.status === 'confirmed',
  )
}

export function handlePortalMockRequest(
  method: string,
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
  ctx: PortalMockContext = {},
): unknown {
  const path = url.replace(/^\//, '')
  const params = getParams(config)
  const state = loadState()
  const m = method.toUpperCase()

  if (m === 'POST' && path === 'portal/auth/login') {
    const body = data as { email?: string; password?: string }
    const portalUser = state.portalUsers?.find(
      (u) => u.email === body.email && u.password === body.password,
    )
    if (!portalUser) throw mockError(401, 'بيانات الدخول غير صحيحة.')
    const { password: _, ...user } = portalUser
    const response: PortalLoginResponse = {
      token: `portal-token-${portalUser.id}`,
      user,
    }
    return response
  }

  if (m === 'POST' && path === 'portal/auth/logout') {
    return { message: 'ok' }
  }

  const customerId = ctx.user?.customer_id
  if (!customerId) throw mockError(401, 'غير مصرح')

  if (m === 'GET' && path === 'portal/dashboard') {
    const invoices = getCustomerInvoices(state, customerId)
    const totalDue = invoices.reduce((s, i) => s + Number(i.balance_due), 0)
    return {
      recent_invoices: invoices.slice(0, 5),
      total_balance_due: totalDue,
    }
  }

  if (m === 'GET' && path === 'portal/invoices') {
    const invoices = getCustomerInvoices(state, customerId)
    return paginate(invoices, params)
  }

  if (m === 'GET' && path === 'portal/ledger') {
    const rows = getCustomerInvoices(state, customerId)
      .filter((i) => Number(i.paid_amount) > 0)
      .map((inv, idx) => ({
        id: idx + 1,
        paid_at: inv.confirmed_at ?? inv.invoice_date,
        amount: inv.paid_amount ?? 0,
        sales_invoice: { invoice_number: inv.invoice_number },
      }))
    return paginate(rows, params)
  }

  if (m === 'GET' && path === 'portal/auth/me') {
    return ctx.user
  }

  throw mockError(404, `Mock portal endpoint not found: ${m} ${path}`)
}
