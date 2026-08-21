import { useEffect, useState } from 'react'
import { Modal } from '../../../components/Modal'

interface CompleteTaskModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (executedAt: string, customerReceived?: boolean) => void
  isPending?: boolean
  askCustomerReceived?: boolean
}

export function CompleteTaskModal({
  open,
  onClose,
  onConfirm,
  isPending,
  askCustomerReceived = false,
}: CompleteTaskModalProps) {
  const [executedAt, setExecutedAt] = useState(() => new Date().toISOString().split('T')[0])
  const [customerReceived, setCustomerReceived] = useState<boolean | null>(null)

  useEffect(() => {
    if (!open) return
    setExecutedAt(new Date().toISOString().split('T')[0])
    setCustomerReceived(null)
  }, [open])

  const handleClose = () => {
    setExecutedAt(new Date().toISOString().split('T')[0])
    setCustomerReceived(null)
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!executedAt) return
    if (askCustomerReceived && customerReceived === null) return
    onConfirm(executedAt, askCustomerReceived ? Boolean(customerReceived) : undefined)
  }

  const canSubmit = Boolean(executedAt) && (!askCustomerReceived || customerReceived !== null)

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
        {askCustomerReceived && (
          <div>
            <p className="mb-2 text-sm font-medium text-on-surface">هل استلم العميل الجهاز؟</p>
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
                نعم — إذن صرف
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
                لا
              </button>
            </div>
          </div>
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
