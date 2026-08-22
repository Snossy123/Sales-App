import type {
  AccessoryCheckoutPayload,
  AccessoryPackage,
  AccessoryWarehouseStock,
  ProductModel,
  SalesInvoice,
  SalesInvoiceLine,
} from '../types'
import { loadState, mutateState } from './store'
import type { DemoState } from './seed'

type Method = string
type Data = Record<string, unknown> | undefined

function mockError(status: number, message: string): Error {
  const err = new Error(message) as Error & {
    response?: { status: number; data: { message: string } }
  }
  err.response = { status, data: { message } }
  return err
}

function paginate<T>(items: T[], params: Record<string, string>) {
  const perPage = Number(params.per_page ?? 50)
  const page = Number(params.page ?? 1)
  const start = (page - 1) * perPage
  const data = items.slice(start, start + perPage)
  return {
    data,
    current_page: page,
    per_page: perPage,
    total: items.length,
    last_page: Math.max(1, Math.ceil(items.length / perPage)),
  }
}

function nextId(items: { id: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1
}

function availableQty(stock: AccessoryWarehouseStock): number {
  return Math.max(0, Number(stock.quantity) - Number(stock.reserved ?? 0))
}

function resolveStockRequirements(
  state: DemoState,
  body: Record<string, unknown>,
): { productModelId: number | null; packageId: number | null; requirements: Map<number, number> } {
  const quantity = Math.max(1, Number(body.quantity) || 1)
  const hasProduct = body.product_model_id != null && body.product_model_id !== ''
  const hasPackage = body.accessory_package_id != null && body.accessory_package_id !== ''
  if (hasProduct === hasPackage) {
    throw mockError(422, 'اختر إكسسوار أو باكدج، وليس الاثنين معاً.')
  }

  if (hasPackage) {
    const packageId = Number(body.accessory_package_id)
    const pkg = state.accessoryPackages.find((item) => item.id === packageId)
    if (!pkg || !pkg.is_active) throw mockError(422, 'الباكدج غير نشط.')
    if (!(pkg.items ?? []).length) throw mockError(422, 'يجب إضافة مكون واحد على الأقل للباكدج.')
    const requirements = new Map<number, number>()
    for (const item of pkg.items ?? []) {
      const need = item.quantity * quantity
      requirements.set(item.product_model_id, (requirements.get(item.product_model_id) ?? 0) + need)
    }
    return { productModelId: null, packageId, requirements }
  }

  const productModelId = Number(body.product_model_id)
  if (!state.accessories.some((acc) => acc.id === productModelId)) {
    throw mockError(422, 'يجب أن يكون المنتج من نوع إكسسوار.')
  }
  return { productModelId, packageId: null, requirements: new Map([[productModelId, quantity]]) }
}

function resolveHubWarehouse(state: DemoState, departmentId: number) {
  return (
    state.warehouses.find((wh) => wh.is_central && wh.administration_id === departmentId) ??
    state.warehouses.find((wh) => wh.is_central && !wh.branch_id) ??
    state.warehouses.find((wh) => wh.code === `WH-HQ-${departmentId}`)
  )
}

function ensureStock(
  state: DemoState,
  warehouseId: number,
  productModelId: number,
): AccessoryWarehouseStock {
  let stock = state.accessoryStocks.find(
    (row) => row.warehouse_id === warehouseId && row.product_model_id === productModelId,
  )
  if (!stock) {
    stock = {
      id: nextId(state.accessoryStocks),
      warehouse_id: warehouseId,
      product_model_id: productModelId,
      quantity: 0,
      reserved: 0,
    }
    state.accessoryStocks.push(stock)
  }
  return stock
}

function withRelations(state: DemoState, stock: AccessoryWarehouseStock): AccessoryWarehouseStock {
  return {
    ...stock,
    available: availableQty(stock),
    product_model: state.accessories.find((a) => a.id === stock.product_model_id),
    warehouse: state.warehouses.find((w) => w.id === stock.warehouse_id),
  }
}

function packageWithItems(state: DemoState, pkg: AccessoryPackage): AccessoryPackage {
  return {
    ...pkg,
    items: (pkg.items ?? []).map((item) => ({
      ...item,
      product_model: state.accessories.find((a) => a.id === item.product_model_id),
    })),
  }
}

export function tryHandleAccessoryRequest(
  method: Method,
  path: string,
  data: Data,
  params: Record<string, string>,
): unknown | null {
  const m = method.toUpperCase()
  const state = loadState()

  if (m === 'GET' && path === 'accessories/stocks') {
    let rows = state.accessoryStocks
    if (params.warehouse_id) {
      rows = rows.filter((row) => row.warehouse_id === Number(params.warehouse_id))
    }
    if (params.product_model_id) {
      rows = rows.filter((row) => row.product_model_id === Number(params.product_model_id))
    }
    return { data: rows.map((row) => withRelations(state, row)) }
  }

  if (m === 'GET' && path === 'accessories') {
    let items = [...state.accessories]
    if (params['filter[is_active]'] === '1' || params['filter[is_active]'] === 'true') {
      items = items.filter((item) => item.is_active !== false)
    }
    const includeStocks = (params.include ?? '').includes('warehouseStocks')
    const mapped = items.map((item) => ({
      ...item,
      warehouse_stocks: includeStocks
        ? state.accessoryStocks
            .filter((stock) => stock.product_model_id === item.id)
            .map((stock) => withRelations(state, stock))
        : undefined,
    }))
    return paginate(mapped, params)
  }

  if (m === 'POST' && path === 'accessories') {
    const body = data ?? {}
    const created: ProductModel = {
      id: nextId(state.accessories),
      name: String(body.name_ar ?? body.name ?? ''),
      name_ar: String(body.name_ar ?? ''),
      brand: (body.brand as string) ?? null,
      model_code: (body.model_code as string) ?? null,
      kind: 'accessory',
      sell_price: Number(body.sell_price ?? 0),
      cost_price: body.cost_price == null ? null : Number(body.cost_price),
      is_active: body.is_active !== false,
    }
    mutateState((draft) => {
      draft.accessories.push(created)
    })
    return created
  }

  const accessoryMatch = path.match(/^accessories\/(\d+)$/)
  if (accessoryMatch) {
    const id = Number(accessoryMatch[1])
    const existing = state.accessories.find((item) => item.id === id)
    if (!existing) throw mockError(404, 'الإكسسوار غير موجود')

    if (m === 'GET') {
      return {
        ...existing,
        warehouse_stocks: state.accessoryStocks
          .filter((stock) => stock.product_model_id === id)
          .map((stock) => withRelations(state, stock)),
      }
    }

    if (m === 'PUT') {
      const body = data ?? {}
      const updated: ProductModel = {
        ...existing,
        name_ar: String(body.name_ar ?? existing.name_ar ?? existing.name),
        name: String(body.name_ar ?? body.name ?? existing.name),
        brand: (body.brand as string | null | undefined) ?? existing.brand,
        model_code: (body.model_code as string | null | undefined) ?? existing.model_code,
        sell_price:
          body.sell_price === undefined ? existing.sell_price : Number(body.sell_price),
        cost_price:
          body.cost_price === undefined
            ? existing.cost_price
            : body.cost_price == null
              ? null
              : Number(body.cost_price),
        is_active: body.is_active === undefined ? existing.is_active : Boolean(body.is_active),
      }
      mutateState((draft) => {
        const idx = draft.accessories.findIndex((item) => item.id === id)
        if (idx >= 0) draft.accessories[idx] = updated
      })
      return updated
    }

    if (m === 'DELETE') {
      if (state.accessoryPackages.some((pkg) => (pkg.items ?? []).some((item) => item.product_model_id === id))) {
        throw mockError(422, 'لا يمكن حذف الإكسسوار لأنه مستخدم في باكدج.')
      }
      mutateState((draft) => {
        draft.accessories = draft.accessories.filter((item) => item.id !== id)
        draft.accessoryStocks = draft.accessoryStocks.filter((stock) => stock.product_model_id !== id)
      })
      return null
    }
  }

  if (m === 'GET' && path === 'accessory-packages') {
    let items = state.accessoryPackages.map((pkg) => packageWithItems(state, pkg))
    if (params['filter[is_active]'] === '1' || params['filter[is_active]'] === 'true') {
      items = items.filter((item) => item.is_active)
    }
    return paginate(items, params)
  }

  if (m === 'POST' && path === 'accessory-packages') {
    const body = data ?? {}
    const items = (body.items as Array<{ product_model_id: number; quantity: number }> | undefined) ?? []
    if (!items.length) throw mockError(422, 'يجب إضافة مكون واحد على الأقل للباكدج.')
    for (const item of items) {
      const product = state.accessories.find((acc) => acc.id === Number(item.product_model_id))
      if (!product) throw mockError(422, 'مكونات الباكدج يجب أن تكون إكسسوارات فقط.')
    }
    const created: AccessoryPackage = {
      id: nextId(state.accessoryPackages),
      name_ar: String(body.name_ar ?? ''),
      name: String(body.name ?? body.name_ar ?? ''),
      sell_price: Number(body.sell_price ?? 0),
      cost_price: body.cost_price == null ? null : Number(body.cost_price),
      is_active: body.is_active !== false,
      items: items.map((item, index) => ({
        id: index + 1,
        product_model_id: Number(item.product_model_id),
        quantity: Math.max(1, Number(item.quantity) || 1),
      })),
    }
    mutateState((draft) => {
      draft.accessoryPackages.push(created)
    })
    return packageWithItems(loadState(), created)
  }

  const packageMatch = path.match(/^accessory-packages\/(\d+)$/)
  if (packageMatch) {
    const id = Number(packageMatch[1])
    const existing = state.accessoryPackages.find((pkg) => pkg.id === id)
    if (!existing) throw mockError(404, 'الباكدج غير موجود')

    if (m === 'GET') return packageWithItems(state, existing)

    if (m === 'PUT') {
      const body = data ?? {}
      const items =
        (body.items as Array<{ product_model_id: number; quantity: number }> | undefined) ??
        existing.items ??
        []
      const updated: AccessoryPackage = {
        ...existing,
        name_ar: String(body.name_ar ?? existing.name_ar),
        name: String(body.name ?? body.name_ar ?? existing.name ?? existing.name_ar),
        sell_price:
          body.sell_price === undefined ? existing.sell_price : Number(body.sell_price),
        cost_price:
          body.cost_price === undefined
            ? existing.cost_price
            : body.cost_price == null
              ? null
              : Number(body.cost_price),
        is_active: body.is_active === undefined ? existing.is_active : Boolean(body.is_active),
        items: items.map((item, index) => ({
          id: index + 1,
          product_model_id: Number(item.product_model_id),
          quantity: Math.max(1, Number(item.quantity) || 1),
        })),
      }
      mutateState((draft) => {
        const idx = draft.accessoryPackages.findIndex((pkg) => pkg.id === id)
        if (idx >= 0) draft.accessoryPackages[idx] = updated
      })
      return packageWithItems(loadState(), updated)
    }

    if (m === 'DELETE') {
      mutateState((draft) => {
        draft.accessoryPackages = draft.accessoryPackages.filter((pkg) => pkg.id !== id)
      })
      return null
    }
  }

  if (m === 'POST' && path === 'accessory-stock/add') {
    const body = data ?? {}
    const departmentId = Number(body.department_id)
    const hub = resolveHubWarehouse(state, departmentId) ?? state.warehouses[0]
    if (!hub) throw mockError(422, 'لا يوجد مخزن')
    const { productModelId, packageId, requirements } = resolveStockRequirements(state, body)
    mutateState((draft) => {
      for (const [modelId, qty] of requirements) {
        const stock = ensureStock(draft, hub.id, modelId)
        stock.quantity += qty
      }
    })
    const fresh = loadState()
    const stocks = [...requirements.keys()].map((modelId) =>
      withRelations(fresh, ensureStock(fresh, hub.id, modelId)),
    )
    const pkg = packageId
      ? fresh.accessoryPackages.find((item) => item.id === packageId) ?? null
      : null
    return {
      warehouse: hub,
      package: pkg,
      product: productModelId
        ? fresh.accessories.find((item) => item.id === productModelId) ?? null
        : null,
      stocks,
      stock: productModelId && stocks.length === 1 ? stocks[0] : null,
    }
  }

  if (m === 'POST' && (path === 'accessory-stock/distribute' || path === 'accessory-stock/return')) {
    const body = data ?? {}
    const departmentId = Number(body.department_id)
    const branchId = Number(body.branch_id)
    const hub = resolveHubWarehouse(state, departmentId) ?? state.warehouses[0]
    const branchWh =
      state.warehouses.find((wh) => wh.branch_id === branchId && !wh.is_central) ??
      state.warehouses.find((wh) => wh.branch_id === branchId)
    if (!hub || !branchWh) throw mockError(422, 'المخزن غير موجود')

    const fromId = path.endsWith('distribute') ? hub.id : branchWh.id
    const toId = path.endsWith('distribute') ? branchWh.id : hub.id
    const { productModelId, packageId, requirements } = resolveStockRequirements(state, body)

    for (const [modelId, qty] of requirements) {
      const fromBefore = ensureStock(state, fromId, modelId)
      if (availableQty(fromBefore) < qty) {
        throw mockError(422, 'رصيد الإكسسوار غير كافٍ.')
      }
    }

    mutateState((draft) => {
      for (const [modelId, qty] of requirements) {
        const from = ensureStock(draft, fromId, modelId)
        from.quantity -= qty
        const to = ensureStock(draft, toId, modelId)
        to.quantity += qty
      }
    })

    const fresh = loadState()
    const movements = [...requirements.keys()].map((modelId) => ({
      from_stock: withRelations(fresh, ensureStock(fresh, fromId, modelId)),
      to_stock: withRelations(fresh, ensureStock(fresh, toId, modelId)),
    }))
    const pkg = packageId
      ? fresh.accessoryPackages.find((item) => item.id === packageId) ?? null
      : null
    return {
      package: pkg,
      product: productModelId
        ? fresh.accessories.find((item) => item.id === productModelId) ?? null
        : null,
      movements,
      ...(productModelId && movements.length === 1
        ? { from_stock: movements[0].from_stock, to_stock: movements[0].to_stock }
        : {}),
    }
  }

  if (m === 'POST' && path === 'sales-invoices/accessory-checkout') {
    const body = (data ?? {}) as unknown as AccessoryCheckoutPayload
    const warehouseId = Number(body.warehouse_id)
    const lines = body.lines ?? []
    if (!lines.length) throw mockError(422, 'يجب إضافة بند واحد على الأقل.')

    const requirements = new Map<number, number>()
    for (const line of lines) {
      const qty = Math.max(1, Number(line.quantity) || 1)
      if (line.line_type === 'package') {
        const pkg = state.accessoryPackages.find((item) => item.id === line.accessory_package_id)
        if (!pkg || !pkg.is_active) throw mockError(422, 'الباكدج غير نشط.')
        for (const item of pkg.items ?? []) {
          const need = item.quantity * qty
          requirements.set(
            item.product_model_id,
            (requirements.get(item.product_model_id) ?? 0) + need,
          )
        }
      } else {
        const productId = Number(line.product_model_id)
        requirements.set(productId, (requirements.get(productId) ?? 0) + qty)
      }
    }

    for (const [productId, need] of requirements) {
      const stock = state.accessoryStocks.find(
        (row) => row.warehouse_id === warehouseId && row.product_model_id === productId,
      )
      if (!stock || availableQty(stock) < need) {
        throw mockError(422, 'رصيد الإكسسوار غير كافٍ.')
      }
    }

    let subtotal = 0
    const invoiceLines: SalesInvoiceLine[] = []
    lines.forEach((line, index) => {
      const qty = Math.max(1, Number(line.quantity) || 1)
      let unitPrice = Number(line.unit_price ?? 0)
      let description = line.description ?? ''
      let productModelId: number | null = null
      let accessoryPackageId: number | null = null

      if (line.line_type === 'package') {
        const pkg = state.accessoryPackages.find((item) => item.id === line.accessory_package_id)!
        unitPrice = line.unit_price == null ? Number(pkg.sell_price) : unitPrice
        description = description || pkg.name_ar
        accessoryPackageId = pkg.id
      } else {
        const product = state.accessories.find((item) => item.id === line.product_model_id)!
        unitPrice = line.unit_price == null ? Number(product.sell_price ?? 0) : unitPrice
        description = description || (product.name_ar || product.name)
        productModelId = product.id
      }

      const lineTotal = Math.round(unitPrice * qty * 100) / 100
      subtotal += lineTotal
      invoiceLines.push({
        id: index + 1,
        product_model_id: productModelId ?? undefined,
        accessory_package_id: accessoryPackageId ?? undefined,
        description,
        quantity: qty,
        unit_price: unitPrice,
        discount: 0,
        line_total: lineTotal,
        line_type: line.line_type,
        payment_term: 'cash',
      } as SalesInvoiceLine)
    })

    mutateState((draft) => {
      for (const [productId, need] of requirements) {
        const stock = ensureStock(draft, warehouseId, productId)
        stock.quantity -= need
      }

      const invoiceId = nextId(draft.invoices)
      const invoice: SalesInvoice = {
        id: invoiceId,
        invoice_number: `INV-${String(invoiceId).padStart(6, '0')}`,
        customer_id: body.customer_id,
        branch_id: body.branch_id,
        warehouse_id: warehouseId,
        status: 'confirmed',
        sale_category: 'accessories',
        payment_term: 'cash',
        subtotal,
        discount_amount: 0,
        installation_fee: 0,
        tax_amount: 0,
        total: subtotal,
        paid_amount: subtotal,
        balance_due: 0,
        payment_status: 'paid',
        invoice_date: body.invoice_date ?? new Date().toISOString().split('T')[0],
        notes: body.notes,
        lines: invoiceLines,
      } as SalesInvoice
      draft.invoices.push(invoice)
    })

    return loadState().invoices[loadState().invoices.length - 1]
  }

  return null
}
