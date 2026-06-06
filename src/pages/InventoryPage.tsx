import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { GpsProduct, GpsStock } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { useAuthStore } from '../stores/authStore'
import { getUserRole } from '../lib/permissions'

export function InventoryPage() {
  const queryClient = useQueryClient()
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const user = useAuthStore((s) => s.user)
  const canEdit = ['admin', 'sales'].includes(getUserRole(user))
  const [addQty, setAddQty] = useState(10)

  const productQuery = useQuery({
    queryKey: ['gps-product'],
    queryFn: async () => {
      const { data } = await api.get<GpsProduct>('/gps-product')
      return data
    },
  })

  const stockQuery = useQuery({
    queryKey: ['gps-stock', warehouseId],
    queryFn: async () => {
      const { data } = await api.get<GpsStock>('/gps-stock', {
        params: { 'filter[warehouse_id]': warehouseId },
      })
      return data
    },
    enabled: Boolean(warehouseId),
  })

  const addMutation = useMutation({
    mutationFn: async (quantity: number) => {
      const { data } = await api.post<GpsStock>('/gps-stock/add', {
        warehouse_id: warehouseId,
        quantity,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setAddQty(10)
    },
  })

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!warehouseId || addQty <= 0) return
    addMutation.mutate(addQty)
  }

  return (
    <div>
      <h1 className="mb-md text-2xl font-bold text-on-surface">مخزون GPS</h1>

      {!warehouseId ? (
        <p className="text-on-surface-variant">يرجى اختيار مخزن من الشريط العلوي.</p>
      ) : (
        <AsyncState
          isLoading={productQuery.isLoading || stockQuery.isLoading}
          isError={productQuery.isError || stockQuery.isError}
          error={productQuery.error ?? stockQuery.error}
        >
          {productQuery.data && stockQuery.data && (
            <div className="grid gap-md lg:grid-cols-2">
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                <div className="mb-md flex items-center gap-md">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="gps_fixed" size={36} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-on-surface">
                      {productQuery.data.name_ar || productQuery.data.name}
                    </h2>
                    <p className="text-sm text-on-surface-variant">
                      {productQuery.data.brand} — {productQuery.data.model_code}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-sm">
                  <div className="rounded-lg bg-surface-container-low p-sm text-center">
                    <p className="text-xs text-on-surface-variant">الكمية الكلية</p>
                    <p className="text-2xl font-bold tabular-nums text-on-surface">
                      {stockQuery.data.quantity}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#ef9900]/10 p-sm text-center">
                    <p className="text-xs text-on-surface-variant">محجوز</p>
                    <p className="text-2xl font-bold tabular-nums text-[#653e00]">
                      {stockQuery.data.reserved}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/10 p-sm text-center">
                    <p className="text-xs text-on-surface-variant">متاح للبيع</p>
                    <p className="text-2xl font-bold tabular-nums text-secondary">
                      {stockQuery.data.available ?? stockQuery.data.quantity - stockQuery.data.reserved}
                    </p>
                  </div>
                </div>

                <p className="mt-md text-lg font-semibold tabular-nums text-primary">
                  سعر البيع: {Number(productQuery.data.sell_price).toLocaleString('ar-EG')} ج.م
                </p>
              </div>

              {canEdit && (
                <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                  <h3 className="mb-md font-semibold text-on-surface">إضافة كمية للمخزن</h3>
                  <form onSubmit={handleAdd} className="flex flex-col gap-md">
                    <div>
                      <label className="mb-xs block text-sm text-on-surface-variant">
                        عدد القطع
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={addQty}
                        onChange={(e) => setAddQty(Number(e.target.value))}
                        className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums focus:border-primary focus:outline-none"
                      />
                    </div>
                    {addMutation.isError && (
                      <p className="text-sm text-error">{getErrorMessage(addMutation.error)}</p>
                    )}
                    {addMutation.isSuccess && (
                      <p className="text-sm text-secondary">تم تحديث المخزون بنجاح</p>
                    )}
                    <button
                      type="submit"
                      disabled={addMutation.isPending}
                      className="flex items-center justify-center gap-xs rounded-lg bg-primary py-3 font-bold text-on-primary disabled:opacity-60"
                    >
                      <Icon name="add" />
                      {addMutation.isPending ? 'جاري الحفظ...' : 'إضافة للمخزن'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </AsyncState>
      )}
    </div>
  )
}
