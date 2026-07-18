import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type {
  AccessoryCheckoutPayload,
  AccessoryPackage,
  AccessoryWarehouseStock,
  Branch,
  Customer,
  PaginatedResponse,
  ProductModel,
  SalesInvoice,
  Warehouse,
} from '../api/types'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { ToastBanner } from '../components/ToastBanner'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAuthStore } from '../stores/authStore'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

type CartLine =
  | {
      key: string
      line_type: 'accessory'
      product_model_id: number
      name: string
      quantity: number
      unit_price: number
    }
  | {
      key: string
      line_type: 'package'
      accessory_package_id: number
      name: string
      quantity: number
      unit_price: number
    }

export function AccessoriesSalesPage() {
  const queryClient = useQueryClient()
  const contextBranchId = useAuthStore((s) => s.branchId)

  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [branchId, setBranchId] = useState<number | ''>(contextBranchId ?? '')
  const [warehouseId, setWarehouseId] = useState<number | ''>('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastInvoice, setLastInvoice] = useState<SalesInvoice | null>(null)

  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300)

  const customersQuery = useQuery({
    queryKey: ['customers', 'accessory-sale', debouncedCustomerSearch],
    enabled: debouncedCustomerSearch.trim().length >= 2,
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', {
        params: { per_page: 10, 'filter[name]': debouncedCustomerSearch.trim() },
      })
      return data.data
    },
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'accessory-sale'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const warehousesQuery = useQuery({
    queryKey: ['warehouses', 'accessory-sale', branchId],
    enabled: branchId !== '',
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Warehouse>>('/warehouses', {
        params: { per_page: 100, 'filter[branch_id]': branchId },
      })
      return data.data
    },
  })

  const accessoriesQuery = useQuery({
    queryKey: ['accessories', 'sale'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductModel>>('/accessories', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data
    },
  })

  const packagesQuery = useQuery({
    queryKey: ['accessory-packages', 'sale'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AccessoryPackage>>('/accessory-packages', {
        params: { per_page: 100, 'filter[is_active]': 1, include: 'items.productModel' },
      })
      return data.data
    },
  })

  const stocksQuery = useQuery({
    queryKey: ['accessories', 'stocks', warehouseId],
    enabled: warehouseId !== '',
    queryFn: async () => {
      const { data } = await api.get<{ data: AccessoryWarehouseStock[] }>('/accessories/stocks', {
        params: { warehouse_id: warehouseId },
      })
      return data.data
    },
  })

  const stockByProduct = useMemo(() => {
    const map = new Map<number, number>()
    for (const row of stocksQuery.data ?? []) {
      map.set(row.product_model_id, row.available ?? Math.max(0, row.quantity - row.reserved))
    }
    return map
  }, [stocksQuery.data])

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.unit_price * line.quantity, 0),
    [cart],
  )

  const addAccessory = (product: ProductModel) => {
    const price = Number(product.sell_price ?? 0)
    setCart((prev) => {
      const existing = prev.find(
        (line) => line.line_type === 'accessory' && line.product_model_id === product.id,
      )
      if (existing) {
        return prev.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line,
        )
      }
      return [
        ...prev,
        {
          key: `a-${product.id}`,
          line_type: 'accessory',
          product_model_id: product.id,
          name: product.name_ar || product.name,
          quantity: 1,
          unit_price: price,
        },
      ]
    })
  }

  const addPackage = (pkg: AccessoryPackage) => {
    const price = Number(pkg.sell_price ?? 0)
    setCart((prev) => {
      const existing = prev.find(
        (line) => line.line_type === 'package' && line.accessory_package_id === pkg.id,
      )
      if (existing) {
        return prev.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line,
        )
      }
      return [
        ...prev,
        {
          key: `p-${pkg.id}`,
          line_type: 'package',
          accessory_package_id: pkg.id,
          name: pkg.name_ar,
          quantity: 1,
          unit_price: price,
        },
      ]
    })
  }

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer || branchId === '' || warehouseId === '' || cart.length < 1) {
        throw new Error('أكمل العميل والفرع والمخزن وبنود البيع')
      }
      const payload: AccessoryCheckoutPayload = {
        customer_id: selectedCustomer.id,
        branch_id: Number(branchId),
        warehouse_id: Number(warehouseId),
        notes: notes.trim() || undefined,
        lines: cart.map((line) =>
          line.line_type === 'accessory'
            ? {
                line_type: 'accessory' as const,
                product_model_id: line.product_model_id,
                quantity: line.quantity,
                unit_price: line.unit_price,
                payment_term: 'cash' as const,
                cash_schedule: 'immediate' as const,
              }
            : {
                line_type: 'package' as const,
                accessory_package_id: line.accessory_package_id,
                quantity: line.quantity,
                unit_price: line.unit_price,
                payment_term: 'cash' as const,
                cash_schedule: 'immediate' as const,
              },
        ),
      }
      const { data } = await api.post<SalesInvoice>('/sales-invoices/accessory-checkout', payload)
      return data
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['accessories'] })
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
      setCart([])
      setNotes('')
      setLastInvoice(invoice)
      setError('')
      setSuccess(`تم إنشاء فاتورة ${invoice.invoice_number}`)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    checkoutMutation.mutate()
  }

  return (
    <div>
      <PageHeader
        title="بيع الإكسسوارات"
        subtitle="بيع قطعة منفردة أو باكدج — الخصم من مخزون الكمية"
        actions={
          <div className="flex gap-sm">
            <Link
              to="/inventory/accessories"
              className="rounded-lg border border-outline-variant px-md py-sm text-sm"
            >
              الكتالوج
            </Link>
            <Link
              to="/inventory/accessory-packages"
              className="rounded-lg border border-outline-variant px-md py-sm text-sm"
            >
              الباكدجات
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-md rounded-lg border border-error/30 bg-error-container/30 p-md text-sm text-error">
          {error}
        </div>
      )}
      {success && <ToastBanner message={success} onDismiss={() => setSuccess('')} />}

      {lastInvoice && (
        <div className="mb-md rounded-lg border border-outline-variant bg-surface-container-low p-md text-sm">
          فاتورة: {lastInvoice.invoice_number} — الإجمالي{' '}
          {Number(lastInvoice.total).toLocaleString('ar-EG')}
          <Link to={`/invoices/${lastInvoice.id}`} className="mr-sm text-primary">
            عرض
          </Link>
        </div>
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-md lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-md">
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
            <h2 className="mb-sm font-medium">العميل والفرع</h2>
            <label className="mb-sm block text-sm">
              بحث عميل
              <input
                className={inputClass}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="اسم أو هاتف"
              />
            </label>
            {(customersQuery.data ?? []).length > 0 && (
              <ul className="mb-sm max-h-40 overflow-auto rounded-lg border border-outline-variant">
                {(customersQuery.data ?? []).map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      className="w-full px-sm py-2 text-start text-sm hover:bg-surface-container"
                      onClick={() => {
                        setSelectedCustomer(customer)
                        setCustomerSearch(customer.name)
                        if (customer.branch_id) setBranchId(customer.branch_id)
                      }}
                    >
                      {customer.name} — {customer.phone}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedCustomer && (
              <p className="mb-sm text-sm text-on-surface-variant">
                المحدد: {selectedCustomer.name}
              </p>
            )}

            <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
              <label className="text-sm">
                الفرع
                <select
                  className={inputClass}
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value ? Number(e.target.value) : '')
                    setWarehouseId('')
                  }}
                  required
                >
                  <option value="">اختر</option>
                  {(branchesQuery.data ?? []).map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name_ar || branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                المخزن
                <select
                  className={inputClass}
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
                  required
                >
                  <option value="">اختر</option>
                  {(warehousesQuery.data ?? []).map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name_ar || wh.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
            <h2 className="mb-sm font-medium">إكسسوارات</h2>
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
              {(accessoriesQuery.data ?? []).map((product) => {
                const available = stockByProduct.get(product.id)
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addAccessory(product)}
                    className="rounded-lg border border-outline-variant p-sm text-start text-sm hover:border-primary"
                  >
                    <div className="font-medium">{product.name_ar || product.name}</div>
                    <div className="text-on-surface-variant">
                      {Number(product.sell_price ?? 0).toLocaleString('ar-EG')} ج.م
                      {warehouseId !== '' && (
                        <span className="mr-sm">· متاح: {available ?? 0}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
            <h2 className="mb-sm font-medium">باكدجات</h2>
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
              {(packagesQuery.data ?? []).map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => addPackage(pkg)}
                  className="rounded-lg border border-outline-variant p-sm text-start text-sm hover:border-primary"
                >
                  <div className="font-medium">{pkg.name_ar}</div>
                  <div className="text-on-surface-variant">
                    {Number(pkg.sell_price).toLocaleString('ar-EG')} ج.م
                  </div>
                  <div className="mt-1 text-xs text-on-surface-variant">
                    {(pkg.items ?? [])
                      .map(
                        (item) =>
                          `${item.product_model?.name_ar || item.product_model_id}×${item.quantity}`,
                      )
                      .join(' · ')}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md lg:sticky lg:top-4">
          <h2 className="font-medium">السلة</h2>
          {cart.length === 0 && (
            <p className="text-sm text-on-surface-variant">أضف إكسسوار أو باكدج</p>
          )}
          <ul className="space-y-sm">
            {cart.map((line) => (
              <li
                key={line.key}
                className="flex items-start justify-between gap-sm rounded-lg border border-outline-variant p-sm text-sm"
              >
                <div>
                  <div className="font-medium">{line.name}</div>
                  <div className="text-on-surface-variant">
                    {line.unit_price.toLocaleString('ar-EG')} ×
                    <input
                      type="number"
                      min={1}
                      className="mx-1 w-14 rounded border border-outline-variant px-1 py-0.5"
                      value={line.quantity}
                      onChange={(e) => {
                        const qty = Math.max(1, Number(e.target.value) || 1)
                        setCart((prev) =>
                          prev.map((row) =>
                            row.key === line.key ? { ...row, quantity: qty } : row,
                          ),
                        )
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="text-error"
                  onClick={() => setCart((prev) => prev.filter((row) => row.key !== line.key))}
                >
                  <Icon name="close" size={18} />
                </button>
              </li>
            ))}
          </ul>

          <label className="block text-sm">
            ملاحظات
            <textarea
              className={inputClass}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <div className="flex items-center justify-between text-base font-medium">
            <span>الإجمالي</span>
            <span>{total.toLocaleString('ar-EG')} ج.م</span>
          </div>

          <button
            type="submit"
            disabled={checkoutMutation.isPending || cart.length < 1}
            className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-2 text-sm text-on-primary"
          >
            <Icon name="point_of_sale" size={18} />
            إتمام البيع نقداً
          </button>
        </aside>
      </form>
    </div>
  )
}
