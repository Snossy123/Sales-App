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

interface UninstallCustodyResult {
  receipt: CustodyVoucher
  issuance: CustodyVoucher | null
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
  const [selectedUnitId, setSelectedUnitId] = useState<number | ''>('')
  const [customerReceived, setCustomerReceived] = useState<boolean | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [result, setResult] = useState<UninstallCustodyResult | null>(null)

  useEffect(() => {
    if (!open) return
    setSerialCode('')
    setResolvedUnit(null)
    setSelectedUnitId('')
    setCustomerReceived(null)
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
    if (!open || units.length !== 1) return
    setSelectedUnitId(units[0].id)
    setResolvedUnit(units[0])
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
      setSelectedUnitId(data.id)
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
      const payload: Record<string, unknown> = {
        customer_received: Boolean(customerReceived),
      }
      if (selectedUnitId) payload.product_unit_id = selectedUnitId
      else if (serialCode) payload.serial_code = serialCode
      const { data } = await api.post<UninstallCustodyResult>(
        `/sales-invoices/${invoice.id}/uninstall-custody`,
        payload,
      )
      return data
    },
    onSuccess: (data) => {
      setResult(data)
      onSuccess?.()
    },
  })

  const selectedUnit =
    resolvedUnit ?? units.find((unit) => unit.id === selectedUnitId) ?? null
  const canSubmit = Boolean(
    invoice &&
      customerReceived !== null &&
      (selectedUnitId || serialCode) &&
      !isLookingUp,
  )

  return (
    <Modal
      open={open}
      onClose={result ? onClose : () => undefined}
      title="استلام جهاز الفك"
    >
      {result ? (
        <div className="space-y-3">
          <p className="text-sm text-secondary">تم تسجيل إذن الاستلام تلقائياً.</p>
          <p className="text-sm">
            إذن استلام {result.receipt.voucher_number} —{' '}
            {formatDatetime12hDisplay(result.receipt.created_at)}
          </p>
          {result.issuance ? (
            <p className="text-sm">
              إذن صرف {result.issuance.voucher_number} —{' '}
              {formatDatetime12hDisplay(result.issuance.created_at)}
            </p>
          ) : (
            <p className="text-sm text-on-surface-variant">الجهاز بقي في عهدة الفرع.</p>
          )}
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
            بعد خدمة الفك يُسجل إذن استلام باسمك. هل استلم العميل الجهاز؟
          </p>

        {devicesQuery.isLoading && (
            <p className="text-sm text-on-surface-variant">جاري تحميل أجهزة العميل...</p>
          )}

          {!devicesQuery.isLoading && units.length > 1 && (
            <div>
              <label className="mb-1 block text-sm font-medium">جهاز العميل</label>
              <select
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
                value={selectedUnitId}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : ''
                  setSelectedUnitId(id)
                  setResolvedUnit(units.find((unit) => unit.id === id) ?? null)
                }}
              >
                <option value="">اختر الجهاز</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {productUnitDisplayCode(unit)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!devicesQuery.isLoading && units.length === 0 && (
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
                  setSelectedUnitId('')
                }}
                onKeyDown={handleSerialKeyDown}
              />
              {isLookingUp && <p className="mt-1 text-xs text-on-surface-variant">جاري البحث...</p>}
              {lookupError && <p className="mt-1 text-xs text-error">{lookupError}</p>}
            </div>
          )}

          {selectedUnit && (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <p className="font-mono text-sm font-semibold">{productUnitDisplayCode(selectedUnit)}</p>
              <p className="text-xs text-on-surface-variant">
                {selectedUnit.product_model?.name_ar ?? selectedUnit.product_model?.name ?? '—'}
              </p>
              <InventoryUnitTags
                state={selectedUnit.state}
                inventoryBucket={selectedUnit.inventory_bucket}
              />
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">هل استلم العميل الجهاز؟</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                  customerReceived === true
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant text-on-surface-variant'
                }`}
                onClick={() => setCustomerReceived(true)}
              >
                نعم
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                  customerReceived === false
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant text-on-surface-variant'
                }`}
                onClick={() => setCustomerReceived(false)}
              >
                لا — يبقى عهدة الفرع
              </button>
            </div>
          </div>

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
