import { useEffect } from 'react'
import { Icon } from './Icon'

interface ToastBannerProps {
  message: string
  onDismiss: () => void
  durationMs?: number
}

export function ToastBanner({ message, onDismiss, durationMs = 3000 }: ToastBannerProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timer)
  }, [message, durationMs, onDismiss])

  return (
    <div className="mb-md flex items-center gap-sm rounded-lg border border-secondary/30 bg-secondary/10 px-md py-sm text-sm font-medium text-secondary">
      <Icon name="check_circle" size={18} />
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-0.5 text-secondary hover:bg-secondary/10"
        aria-label="إغلاق"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
