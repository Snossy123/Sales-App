import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../../api/client'
import type {
  AccessoryPackage,
  AccessoryWarehouseStock,
  PaginatedResponse,
  ProductModel,
} from '../../../../api/types'
import { Icon } from '../../../../components/Icon'
import { NumericInput } from '../../../../components/ui/NumericInput'
import { useAuthStore } from '../../../../stores/authStore'
import { formatMoney } from '../posFlowHelpers'
import type { PosFlowDraft } from '../posFlowTypes'

interface AccessoryDetailsStepProps {
  draft: PosFlowDraft
  onPatch: (partial: Partial<PosFlowDraft>) => void
}

export function AccessoryDetailsStep({ draft, onPatch }: AccessoryDetailsStepProps) {
  const warehouseId = useAuthStore((s) => s.warehouseId)

  const accessoriesQuery = useQuery({
    queryKey: ['accessories', 'sale'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductModel>>('/accessories', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data ?? []
    },
  })

  const packagesQuery = useQuery({
    queryKey: ['accessory-packages', 'sale'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AccessoryPackage>>('/accessory-packages', {
        params: { per_page: 100, 'filter[is_active]': 1, include: 'items.productModel' },
      })
      return data.data ?? []
    },
  })

  const stocksQuery = useQuery({
    queryKey: ['accessories', 'stocks', warehouseId],
    enabled: warehouseId != null,
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

  const addAccessory = (product: ProductModel) => {
    const price = Number(product.sell_price ?? 0)
    const existing = draft.accessoryCart.find(
      (line) => line.line_type === 'accessory' && line.product_model_id === product.id,
    )
    if (existing) {
      onPatch({
        accessoryCart: draft.accessoryCart.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      })
      return
    }
    onPatch({
      accessoryCart: [
        ...draft.accessoryCart,
        {
          key: `a-${product.id}`,
          line_type: 'accessory',
          product_model_id: product.id,
          name: product.name_ar || product.name,
          quantity: 1,
          unit_price: price,
        },
      ],
    })
  }

  const addPackage = (pkg: AccessoryPackage) => {
    const price = Number(pkg.sell_price ?? 0)
    const existing = draft.accessoryCart.find(
      (line) => line.line_type === 'package' && line.accessory_package_id === pkg.id,
    )
    if (existing) {
      onPatch({
        accessoryCart: draft.accessoryCart.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      })
      return
    }
    onPatch({
      accessoryCart: [
        ...draft.accessoryCart,
        {
          key: `p-${pkg.id}`,
          line_type: 'package',
          accessory_package_id: pkg.id,
          name: pkg.name_ar,
          quantity: 1,
          unit_price: price,
        },
      ],
    })
  }

  const total = draft.accessoryCart.reduce((sum, line) => sum + line.unit_price * line.quantity, 0)

  return (
    <div className="grid gap-md lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-md">
        {warehouseId == null ? (
          <p className="rounded-lg border border-error/30 bg-error/5 p-sm text-sm text-error">
            اختار مخزن من الشريط العلوي قبل بيع الإكسسوارات.
          </p>
        ) : null}

        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <h3 className="mb-sm font-bold">إكسسوارات</h3>
          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
            {(accessoriesQuery.data ?? []).map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addAccessory(product)}
                className="rounded-lg border border-outline-variant p-sm text-start text-sm hover:border-primary"
              >
                <div className="font-bold">{product.name_ar || product.name}</div>
                <div className="text-on-surface-variant">
                  {formatMoney(Number(product.sell_price ?? 0))}
                  {warehouseId != null ? (
                    <span className="mr-sm"> · متاح: {stockByProduct.get(product.id) ?? 0}</span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <h3 className="mb-sm font-bold">باكدجات</h3>
          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
            {(packagesQuery.data ?? []).map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => addPackage(pkg)}
                className="rounded-lg border border-outline-variant p-sm text-start text-sm hover:border-primary"
              >
                <div className="font-bold">{pkg.name_ar}</div>
                <div className="text-on-surface-variant">{formatMoney(Number(pkg.sell_price))}</div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="h-fit space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <h3 className="font-bold">السلة</h3>
        {draft.accessoryCart.length === 0 ? (
          <p className="text-sm text-on-surface-variant">أضف إكسسوار أو باكدج</p>
        ) : null}
        <ul className="space-y-sm">
          {draft.accessoryCart.map((line) => (
            <li
              key={line.key}
              className="flex items-start justify-between gap-sm rounded-lg border border-outline-variant p-sm text-sm"
            >
              <div>
                <div className="font-bold">{line.name}</div>
                <div className="text-on-surface-variant">
                  {formatMoney(line.unit_price)} ×
                  <NumericInput
                    type="number"
                    min={1}
                    className="mx-1 w-14 rounded border border-outline-variant px-1 py-0.5"
                    value={line.quantity}
                    onChange={(e) => {
                      const quantity = Math.max(1, Number(e.target.value) || 1)
                      onPatch({
                        accessoryCart: draft.accessoryCart.map((item) =>
                          item.key === line.key ? { ...item, quantity } : item,
                        ),
                      })
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="text-error"
                onClick={() =>
                  onPatch({
                    accessoryCart: draft.accessoryCart.filter((item) => item.key !== line.key),
                  })
                }
              >
                <Icon name="close" size={18} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between font-bold">
          <span>الإجمالي</span>
          <span>{formatMoney(total)}</span>
        </div>
      </aside>
    </div>
  )
}
