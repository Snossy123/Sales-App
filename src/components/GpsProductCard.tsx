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
  const [cashPrice, setCashPrice] = useState(String(product.cash_price ?? product.sell_price))
  const [installmentPrice, setInstallmentPrice] = useState(
    String(product.installment_price ?? product.sell_price),
  )

  const saveMutation = useMutation({
    mutationFn: async (prices: { cash_price: number; installment_price: number }) => {
      const { data } = await api.put<GpsProduct>('/gps-product', prices)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gps-product'] })
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      setEditing(false)
    },
  })

  const handleSave = () => {
    const cash = Number(cashPrice)
    const installment = Number(installmentPrice)
    if (!cash || cash <= 0 || !installment || installment <= 0) return
    saveMutation.mutate({ cash_price: cash, installment_price: installment })
  }

  const handleCancel = () => {
    setCashPrice(String(product.cash_price ?? product.sell_price))
    setInstallmentPrice(String(product.installment_price ?? product.sell_price))
    setEditing(false)
    saveMutation.reset()
  }

  const displayCash = Number(product.cash_price ?? product.sell_price)
  const displayInstallment = Number(product.installment_price ?? product.sell_price)

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
          {editing && canEditPrice ? (
            <div className="flex flex-wrap items-center gap-sm">
              <label className="flex items-center gap-xs">
                كاش:
                <input
                  type="number"
                  min={1}
                  value={cashPrice}
                  onChange={(e) => setCashPrice(e.target.value)}
                  dir="ltr"
                  className="w-24 rounded border border-outline-variant px-sm py-1 text-sm tabular-nums text-on-surface"
                />
              </label>
              <label className="flex items-center gap-xs">
                قسط:
                <input
                  type="number"
                  min={1}
                  value={installmentPrice}
                  onChange={(e) => setInstallmentPrice(e.target.value)}
                  dir="ltr"
                  className="w-24 rounded border border-outline-variant px-sm py-1 text-sm tabular-nums text-on-surface"
                />
              </label>
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
            </div>
          ) : (
            <>
              <span>
                كاش:{' '}
                <span className="font-medium text-on-surface tabular-nums">
                  {displayCash.toLocaleString('ar-EG')} ج.م
                </span>
              </span>
              <span>
                قسط:{' '}
                <span className="font-medium text-on-surface tabular-nums">
                  {displayInstallment.toLocaleString('ar-EG')} ج.م
                </span>
              </span>
              {canEditPrice && (
                <button
                  type="button"
                  onClick={() => {
                    setCashPrice(String(displayCash))
                    setInstallmentPrice(String(displayInstallment))
                    setEditing(true)
                  }}
                  className="rounded p-0.5 text-primary hover:bg-primary/10"
                  title="تعديل الأسعار"
                >
                  <Icon name="edit" size={16} />
                </button>
              )}
            </>
          )}
        </div>
        {saveMutation.isError && (
          <p className="mt-xs text-xs text-error">{getErrorMessage(saveMutation.error)}</p>
        )}
      </div>
    </div>
  )
}
