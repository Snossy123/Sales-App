import type { PriceCatalogItem, Promotion } from '../types'
import { loadState, mutateState } from './store'
import type { DemoState } from './seed'

type PricingMethod = string
type PricingData = Record<string, unknown> | undefined

function mockError(status: number, message: string): Error {
  const err = new Error(message) as Error & { response?: { status: number; data: { message: string } } }
  err.response = { status, data: { message } }
  return err
}

function paginate<T extends { id: number }>(
  items: T[],
  params: Record<string, string>,
): { data: T[]; meta: { total: number; per_page: number; current_page: number } } {
  const perPage = Number(params.per_page ?? 15)
  const page = Number(params.page ?? 1)
  const start = (page - 1) * perPage
  return {
    data: items.slice(start, start + perPage),
    meta: { total: items.length, per_page: perPage, current_page: page },
  }
}

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

function isPromotionActive(p: Promotion): boolean {
  const today = todayString()
  return p.is_active && p.start_date <= today && p.end_date >= today
}

export function tryHandlePricingRequest(
  method: PricingMethod,
  path: string,
  data: PricingData,
  params: Record<string, string>,
): unknown | null {
  const m = method.toUpperCase()
  const state = loadState()

  if (m === 'GET' && path === 'pricing/catalog') {
    return paginate(state.priceCatalogItems ?? [], params)
  }

  if (m === 'POST' && path === 'pricing/catalog') {
    const body = data as Record<string, unknown>
    let created: PriceCatalogItem | undefined
    mutateState((s) => {
      if (!s.priceCatalogItems) s.priceCatalogItems = []
      const id = (s.priceCatalogItems.reduce((max, i) => Math.max(max, i.id), 0) || 0) + 1
      created = {
        id,
        item_type: String(body.item_type ?? 'product'),
        name_ar: String(body.name_ar ?? ''),
        base_price: Number(body.base_price ?? 0),
        cost_price: Number(body.cost_price ?? 0),
        is_active: body.is_active !== false,
      }
      s.priceCatalogItems.push(created)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^pricing\/catalog\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as Record<string, unknown>
    let updated: PriceCatalogItem | undefined
    mutateState((s) => {
      const item = s.priceCatalogItems?.find((i) => i.id === id)
      if (!item) throw mockError(404, 'العنصر غير موجود')
      if (body.name_ar) item.name_ar = String(body.name_ar)
      if (body.base_price != null) item.base_price = Number(body.base_price)
      if (body.cost_price != null) item.cost_price = Number(body.cost_price)
      if (body.is_active != null) item.is_active = Boolean(body.is_active)
      updated = item
    })
    return updated
  }

  if (m === 'GET' && path === 'pricing/promotions/active') {
    const active = (state.promotions ?? []).filter(isPromotionActive)
    return { data: active }
  }

  if (m === 'GET' && path === 'pricing/promotions') {
    return paginate(state.promotions ?? [], params)
  }

  if (m === 'POST' && path === 'pricing/promotions') {
    const body = data as Record<string, unknown>
    let created: Promotion | undefined
    mutateState((s) => {
      if (!s.promotions) s.promotions = []
      const id = (s.promotions.reduce((max, p) => Math.max(max, p.id), 0) || 0) + 1
      created = {
        id,
        name_ar: String(body.name_ar ?? ''),
        promotion_type: String(body.promotion_type ?? 'percent'),
        discount_value: Number(body.discount_value ?? 0),
        applies_to: String(body.applies_to ?? 'all'),
        start_date: String(body.start_date ?? todayString()),
        end_date: String(body.end_date ?? todayString()),
        min_quantity: Number(body.min_quantity ?? 1),
        max_uses: body.max_uses != null ? Number(body.max_uses) : null,
        uses_count: 0,
        is_active: body.is_active !== false,
      }
      s.promotions.push(created)
    })
    return created
  }

  if (m === 'POST' && path === 'pricing/promotions/resolve') {
    const body = data as { lines?: Array<{ unit_price?: number; quantity?: number }> }
    const lines = body.lines ?? []
    const promo = (state.promotions ?? []).find(isPromotionActive)
    if (!promo) return { promotion: null, discount_total: 0 }

    const eligibleTotal = lines.reduce(
      (sum, line) => sum + Number(line.unit_price ?? 0) * Math.max(1, Number(line.quantity ?? 1)),
      0,
    )
    let discount = 0
    if (promo.promotion_type === 'percent') {
      discount = eligibleTotal * (Number(promo.discount_value) / 100)
    } else if (promo.promotion_type === 'fixed') {
      discount = Math.min(Number(promo.discount_value), eligibleTotal)
    }

    return { promotion: promo, discount_total: Math.round(discount * 100) / 100 }
  }

  return null
}

export function applyPromotionDiscount(state: DemoState, promotionId: number, subtotal: number): number {
  const promo = state.promotions?.find((p) => p.id === promotionId && isPromotionActive(p))
  if (!promo) return subtotal

  let discount = 0
  if (promo.promotion_type === 'percent') {
    discount = subtotal * (Number(promo.discount_value) / 100)
  } else if (promo.promotion_type === 'fixed') {
    discount = Math.min(Number(promo.discount_value), subtotal)
  }

  promo.uses_count = (promo.uses_count ?? 0) + 1

  return Math.max(0, Math.round((subtotal - discount) * 100) / 100)
}
