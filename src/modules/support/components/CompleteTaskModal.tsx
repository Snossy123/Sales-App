import { useEffect, useState } from 'react'
import { Modal } from '../../../components/Modal'

export interface InstallationHandoverDevice {
  productUnitId: number
  label: string
}

export interface InstallationHandoverItem {
  product_unit_id: number
  customer_received: boolean
}

interface CompleteTaskModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (
    executedAt: string,
    payload?: { customerReceived?: boolean; items?: InstallationHandoverItem[] },
  ) => void
  isPending?: boolean
  askCustomerReceived?: boolean
  devices?: InstallationHandoverDevice[]
}

export function CompleteTaskModal({
  open,
  onClose,
  onConfirm,
  isPending,
  askCustomerReceived = false,
  devices = [],
}: CompleteTaskModalProps) {
  const [executedAt, setExecutedAt] = useState(() => new Date().toISOString().split('T')[0])
  const [receivedByUnitId, setReceivedByUnitId] = useState<Record<number, boolean>>({})
  const [customerReceived, setCustomerReceived] = useState(false)

  useEffect(() => {
    if (!open) return
    setExecutedAt(new Date().toISOString().split('T')[0])
    setCustomerReceived(false)
    setReceivedByUnitId(Object.fromEntries(devices.map((device) => [device.productUnitId, false])))
  }, [open, devices.map((device) => device.productUnitId).join(',')])

  const handleClose = () => {
    setExecutedAt(new Date().toISOString().split('T')[0])
    setCustomerReceived(false)
    setReceivedByUnitId({})
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!executedAt) return
    if (askCustomerReceived && devices.length > 0) {
      onConfirm(executedAt, {
        items: devices.map((device) => ({
          product_unit_id: device.productUnitId,
          customer_received: Boolean(receivedByUnitId[device.productUnitId]),
        })),
      })
      return
    }
    onConfirm(executedAt, askCustomerReceived ? { customerReceived } : undefined)
  }

  const canSubmit = Boolean(executedAt)

  return (
    <Modal open={open} onClose={handleClose} title="تم التنفيذ" size="sm">
      <form onSubmit={handleSubmit} className="space-y-md">
        <p className="text-sm text-on-surface-variant">
          أدخل تاريخ التنفيذ. سيبدأ حساب مواعيد استحقاق الأقساط من هذا التاريخ.
        </p>
        <div>
          <label htmlFor="executed-at" className="mb-1 block text-sm font-medium text-on-surface">
            تاريخ التنفيذ
          </label>
          <input
            id="executed-at"
            type="date"
            value={executedAt}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setExecutedAt(e.target.value)}
            required
            className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
          />
        </div>
        {askCustomerReceived && devices.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-on-surface">
              علّم الأجهزة التي استلمها العميل؛ الباقي لا يُصرف.
            </p>
            {devices.map((device) => (
              <label
                key={device.productUnitId}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant p-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={Boolean(receivedByUnitId[device.productUnitId])}
                  onChange={(e) =>
                    setReceivedByUnitId((prev) => ({
                      ...prev,
                      [device.productUnitId]: e.target.checked,
                    }))
                  }
                />
                <span>
                  <span className="block font-medium">{device.label}</span>
                  <span className="text-xs text-on-surface-variant">
                    {receivedByUnitId[device.productUnitId] ? 'إذن صرف للعميل' : 'لن يُصرف الجهاز'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        {askCustomerReceived && devices.length === 0 && (
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={customerReceived}
              onChange={(e) => setCustomerReceived(e.target.checked)}
            />
            استلم العميل الجهاز
          </label>
        )}
        <div className="flex justify-end gap-sm">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-lg border border-outline-variant px-md py-2 text-sm hover:bg-surface-container"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isPending || !canSubmit}
            className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary disabled:opacity-50"
          >
            {isPending ? 'جاري الحفظ…' : 'تم التنفيذ'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
