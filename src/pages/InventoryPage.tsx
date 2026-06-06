import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PaginatedResponse, ProductUnit } from '../api/types'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { AsyncState } from '../components/AsyncState'
import { useAuthStore } from '../stores/authStore'

export function InventoryPage() {
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const [stateFilter, setStateFilter] = useState('')
  const [imeiSearch, setImeiSearch] = useState('')

  const query = useQuery({
    queryKey: ['product-units', warehouseId, stateFilter, imeiSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 50,
        include: 'productModel,warehouse',
      }
      if (warehouseId) params['filter[warehouse_id]'] = warehouseId
      if (stateFilter) params['filter[state]'] = stateFilter
      if (imeiSearch) params['filter[imei]'] = imeiSearch

      const { data } = await api.get<PaginatedResponse<ProductUnit>>('/product-units', {
        params,
      })
      return data
    },
    enabled: Boolean(warehouseId),
  })

  return (
    <div>
      <h1 className="mb-md text-2xl font-bold text-on-surface">المخزون</h1>

      <div className="mb-md flex flex-wrap gap-sm">
        <input
          type="search"
          placeholder="بحث بالـ IMEI"
          value={imeiSearch}
          onChange={(e) => setImeiSearch(e.target.value)}
          className="min-w-[200px] rounded border border-outline-variant px-sm py-2 text-sm focus:border-primary focus:outline-none"
          dir="ltr"
        />
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded border border-outline-variant px-sm py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">كل الحالات</option>
          <option value="available">متاح</option>
          <option value="reserved">محجوز</option>
          <option value="sold">مباع</option>
          <option value="defective">معطل</option>
        </select>
      </div>

      {!warehouseId ? (
        <p className="text-on-surface-variant">يرجى اختيار مخزن من الشريط العلوي.</p>
      ) : (
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
        >
          <DataTable<ProductUnit & Record<string, unknown>>
            data={(query.data?.data ?? []) as (ProductUnit & Record<string, unknown>)[]}
            keyExtractor={(row) => row.id}
            columns={[
              {
                key: 'imei',
                header: 'IMEI',
                className: 'tabular-nums font-mono text-xs',
                render: (row) => row.imei,
              },
              {
                key: 'model',
                header: 'الموديل',
                render: (row) =>
                  row.product_model?.name_ar || row.product_model?.name || '—',
              },
              {
                key: 'sell_price',
                header: 'سعر البيع',
                className: 'tabular-nums',
                render: (row) =>
                  row.sell_price != null
                    ? Number(row.sell_price).toLocaleString('ar-EG')
                    : '—',
              },
              {
                key: 'state',
                header: 'الحالة',
                render: (row) => <StatusBadge status={row.state} />,
              },
              {
                key: 'warehouse',
                header: 'المخزن',
                render: (row) =>
                  row.warehouse?.name_ar || row.warehouse?.name || '—',
              },
            ]}
          />
        </AsyncState>
      )}
    </div>
  )
}
