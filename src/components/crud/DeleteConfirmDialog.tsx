import { Icon } from '../Icon'

interface DeleteConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  open,
  title = 'تأكيد الحذف',
  message,
  confirmLabel = 'حذف',
  isPending = false,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md">
      <div
        className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <h2 id="delete-dialog-title" className="mb-sm text-base font-bold text-on-surface">
          {title}
        </h2>
        <p className="mb-md text-sm text-on-surface-variant">{message}</p>
        <p className="mb-lg text-xs text-on-surface-variant">
          سيتم نقل العنصر إلى سلة المهملات ويمكن استرجاعه لاحقاً.
        </p>
        <div className="flex justify-end gap-sm">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-outline-variant px-md py-sm text-sm"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-error px-md py-sm text-sm font-bold text-on-error"
          >
            <Icon name="delete" size={18} />
            {isPending ? 'جاري الحذف...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
