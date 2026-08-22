import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { CustodyVoucher, ProductUnit, SalesInvoice } from '../api/types'
import { productUnitDisplayCode } from '../lib/inventoryBuckets'
import { formatDatetime12hDisplay } from '../lib/datetime12h'
import { normalizeScannedInput } from '../lib/scanner'
import { Modal } from './Modal'
import { InventoryUnitTags } from './inventory/InventoryUnitTags'

interface UninstallDeviceHandoverModalProps {
  open: boolean
  invoice: SalesInvoice | null
  onClose: () => void
  onSuccess?: () => void
}

interface UninstallCustodyItemResult {
  receipt: CustodyVoucher
  issuance: CustodyVoucher | null
}

interface UninstallCustodyResult extends UninstallCustodyItemResult {
  items?: UninstallCustodyItemResult[]
}

export function UninstallDeviceHandoverModal({
  open,
  invoice,
  onClose,
  onSuccess,
}: UninstallDeviceHandoverModalProps) {
  const serialRef = useRef<HTMLInputElement>(null)
  const [serialCode, setSerialCode] = useState('')
  const [resolvedUnit, setResolvedUnit] = useState<ProductUnit | null>(null)
  const [receivedByUnitId, setReceivedByUnitId] = useState<Record<number, boolean>>({})
  const [manualReceived, setManualReceived] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [result, setResult] = useState<UninstallCustodyResult | null>(null)

  useEffect(() => {
    if (!open) return
    setSerialCode('')
    setResolvedUnit(null)
    setReceivedByUnitId({})
    setManualReceived(false)
    setLookupError(null)
    setResult(null)
  }, [open, invoice?.id])

  const devicesQuery = useQuery({
    queryKey: ['uninstall-devices', invoice?.id],
    queryFn: async () => {
      const { data } = await api.get<{ units: ProductUnit[] }>(
        `/sales-invoices/${invoice!.id}/uninstall-devices`,
      )
      return data.units ?? []
    },
    enabled: open && Boolean(invoice?.id),
  })

  const units = devicesQuery.data ?? []

  useEffect(() => {
    if (!open || units.length === 0) return
    setReceivedByUnitId((prev) => {
      const next: Record<number, boolean> = {}
      for (const unit of units) {
        next[unit.id] = prev[unit.id] ?? false
      }
      return next
    })
  }, [open, units])

  const lookupUnit = async (raw: string) => {
    const code = normalizeScannedInput(raw)
    setSerialCode(code)
    setLookupError(null)
    if (!code) {
      setResolvedUnit(null)
      return
    }
    setIsLookingUp(true)
    try {
      const { data } = await api.get<ProductUnit>('/product-units/lookup', { params: { code } })
      setResolvedUnit(data)
    } catch (error) {
      setResolvedUnit(null)
      setLookupError(getErrorMessage(error))
    } finally {
      setIsLookingUp(false)
    }
  }

  const handleSerialKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void lookupUnit(serialCode)
    }
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error('الفاتورة مطلوبة')
      const items =
        units.length > 0
          ? units.map((unit) => ({
              product_unit_id: unit.id,
              customer_received: Boolean(receivedByUnitId[unit.id]),
            }))
          : [
              {
                product_unit_id: resolvedUnit?.id,
                serial_code: resolvedUnit ? undefined : serialCode || undefined,
                customer_received: manualReceived,
              },
            ]
      const { data } = await api.post<UninstallCustodyResult>(
        `/sales-invoices/${invoice.id}/uninstall-custody`,
        { items },
      )
      return data
    },
    onSuccess: (data) => {
      setResult(data)
      onSuccess?.()
    },
  })

  const canSubmit = Boolean(
    invoice &&
      !isLookingUp &&
      (units.length > 0 || selectedManualReady()),
  )

  function selectedManualReady() {
    return Boolean(resolvedUnit?.id || serialCode)
  }

  const resultItems = result?.items?.length ? result.items : result ? [result] : []

  return (
    <Modal
      open={open}
      onClose={result ? onClose : () => undefined}
      title="استلام جهاز الفك"
    >
      {result ? (
        <div className="space-y-3">
          <p className="text-sm text-secondary">تم تسجيل إذن الاستلام تلقائياً.</p>
          {resultItems.map((item, index) => (
            <div key={`${item.receipt.id}-${index}`} className="rounded-lg border border-outline-variant p-3 text-sm">
              <p>
                إذن استلام {item.receipt.voucher_number} —{' '}
                {formatDatetime12hDisplay(item.receipt.created_at)}
              </p>
              {item.issuance ? (
                <p>
                  إذن صرف {item.issuance.voucher_number} —{' '}
                  {formatDatetime12hDisplay(item.issuance.created_at)}
                </p>
              ) : (
                <p className="text-on-surface-variant">الجهاز بقي في عهدة الفرع.</p>
              )}
            </div>
          ))}
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm text-on-primary"
              onClick={onClose}
            >
              إغلاق
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            بعد خدمة الفك يُسجل إذن استلام باسمك. علّم الأجهزة التي استلمها العميل؛ الباقي يبقى عهدة الفرع.
          </p>

          {devicesQuery.isLoading && (
            <p className="text-sm text-on-surface-variant">جاري تحميل أجهزة التعاقد...</p>
          )}

          {!devicesQuery.isLoading && units.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">أجهزة التعاقد</p>
              {units.map((unit) => (
                <label
                  key={unit.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3"
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-primary"
                    checked={Boolean(receivedByUnitId[unit.id])}
                    onChange={(e) =>
                      setReceivedByUnitId((prev) => ({ ...prev, [unit.id]: e.target.checked }))
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-sm font-semibold">
                      {productUnitDisplayCode(unit)}
                    </span>
                    <span className="block text-xs text-on-surface-variant">
                      {unit.product_model?.name_ar ?? unit.product_model?.name ?? '—'}
                    </span>
                    <InventoryUnitTags
                      state={unit.state}
                      inventoryBucket={unit.inventory_bucket}
                    />
                    <span className="mt-1 block text-xs text-on-surface-variant">
                      {receivedByUnitId[unit.id]
                        ? 'استلم العميل الجهاز'
                        : 'يبقى عهدة الفرع'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {!devicesQuery.isLoading && units.length === 0 && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">مسح السريال</label>
                <input
                  ref={serialRef}
                  type="text"
                  autoComplete="off"
                  placeholder="امسح أو اكتب السريال ثم Enter"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-mono text-sm tracking-wide focus:border-primary focus:outline-none"
                  value={serialCode}
                  onChange={(e) => {
                    setSerialCode(normalizeScannedInput(e.target.value))
                    setLookupError(null)
                    setResolvedUnit(null)
                  }}
                  onKeyDown={handleSerialKeyDown}
                />
                {isLookingUp && <p className="mt-1 text-xs text-on-surface-variant">جاري البحث...</p>}
                {lookupError && <p className="mt-1 text-xs text-error">{lookupError}</p>}
              </div>
              {resolvedUnit && (
                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                  <p className="font-mono text-sm font-semibold">{productUnitDisplayCode(resolvedUnit)}</p>
                  <p className="text-xs text-on-surface-variant">
                    {resolvedUnit.product_model?.name_ar ?? resolvedUnit.product_model?.name ?? '—'}
                  </p>
                  <InventoryUnitTags
                    state={resolvedUnit.state}
                    inventoryBucket={resolvedUnit.inventory_bucket}
                  />
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={manualReceived}
                  onChange={(e) => setManualReceived(e.target.checked)}
                />
                استلم العميل الجهاز
              </label>
            </div>
          )}

          {submitMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(submitMutation.error)}</p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={onClose}>
              لاحقاً
            </button>
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
              disabled={!canSubmit || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? 'جاري الحفظ...' : 'تأكيد'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
