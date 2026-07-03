import { useState } from 'react'
import { Modal } from '../../../components/Modal'

interface CompleteTaskModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (executedAt: string) => void
  isPending?: boolean
}

export function CompleteTaskModal({ open, onClose, onConfirm, isPending }: CompleteTaskModalProps) {
  const [executedAt, setExecutedAt] = useState(() => new Date().toISOString().split('T')[0])

  const handleClose = () => {
    setExecutedAt(new Date().toISOString().split('T')[0])
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!executedAt) return
    onConfirm(executedAt)
  }

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
            disabled={isPending || !executedAt}
            className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary disabled:opacity-50"
          >
            {isPending ? 'جاري الحفظ…' : 'تم التنفيذ'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
