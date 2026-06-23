import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { GpsProduct } from '../api/types'
import { Icon } from './Icon'

interface GpsProductCardProps {
  product: GpsProduct
  canEditPrice?: boolean
}

export function GpsProductCard({ product, canEditPrice = false }: GpsProductCardProps) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(String(product.sell_price))

  const saveMutation = useMutation({
    mutationFn: async (sellPrice: number) => {
      const { data } = await api.put<GpsProduct>('/gps-product', { sell_price: sellPrice })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gps-product'] })
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      setEditing(false)
    },
  })

  const handleSave = () => {
    const value = Number(price)
    if (!value || value <= 0) return
    saveMutation.mutate(value)
  }

  const handleCancel = () => {
    setPrice(String(product.sell_price))
    setEditing(false)
    saveMutation.reset()
  }

  return (
    <div className="mb-md flex flex-wrap items-center gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon name="gps_fixed" size={28} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-on-surface">
          {product.name_ar || product.name}
        </p>
        <div className="mt-xs flex flex-wrap items-center gap-sm text-sm text-on-surface-variant">
          {product.brand && <span>{product.brand} — </span>}
          <span className="flex items-center gap-xs">
            سعر البيع:
            {editing && canEditPrice ? (
              <>
                <input
                  type="number"
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  dir="ltr"
                  className="w-28 rounded border border-outline-variant px-sm py-1 text-sm tabular-nums text-on-surface"
                />
                <span>ج.م</span>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="rounded bg-secondary px-sm py-0.5 text-xs font-bold text-on-secondary"
                >
                  {saveMutation.isPending ? '...' : 'حفظ'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded border border-outline-variant px-sm py-0.5 text-xs"
                >
                  إلغاء
                </button>
              </>
            ) : (
              <>
                <span className="font-medium text-on-surface tabular-nums">
                  {Number(product.sell_price).toLocaleString('ar-EG')} ج.م
                </span>
                {canEditPrice && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrice(String(product.sell_price))
                      setEditing(true)
                    }}
                    className="rounded p-0.5 text-primary hover:bg-primary/10"
                    title="تعديل السعر"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                )}
              </>
            )}
          </span>
        </div>
        {saveMutation.isError && (
          <p className="mt-xs text-xs text-error">{getErrorMessage(saveMutation.error)}</p>
        )}
      </div>
    </div>
  )
}
