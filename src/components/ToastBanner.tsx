import { useEffect } from 'react'
import { Icon } from './Icon'

interface ToastBannerProps {
  message: string
  onDismiss: () => void
  durationMs?: number
  variant?: 'success' | 'error'
}

export function ToastBanner({ message, onDismiss, durationMs, variant = 'success' }: ToastBannerProps) {
  const actualDuration = durationMs !== undefined ? durationMs : (variant === 'error' ? 0 : 3000)

  useEffect(() => {
    if (actualDuration <= 0) return
    const timer = setTimeout(onDismiss, actualDuration)
    return () => clearTimeout(timer)
  }, [message, actualDuration, onDismiss])

  const isError = variant === 'error'
  const containerClass = isError
    ? 'mb-md flex items-center gap-sm rounded-lg border border-error/30 bg-error/10 px-md py-sm text-sm font-medium text-error'
    : 'mb-md flex items-center gap-sm rounded-lg border border-secondary/30 bg-secondary/10 px-md py-sm text-sm font-medium text-secondary'

  const iconName = isError ? 'error' : 'check_circle'
  const buttonClass = isError
    ? 'rounded p-0.5 text-error hover:bg-error/10'
    : 'rounded p-0.5 text-secondary hover:bg-secondary/10'

  return (
    <div className={containerClass}>
      <Icon name={iconName} size={18} />
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className={buttonClass}
        aria-label="إغلاق"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
