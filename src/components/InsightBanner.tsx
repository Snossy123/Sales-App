import { Icon } from './Icon'

export type InsightVariant = 'info' | 'warning' | 'success' | 'error'

interface InsightBannerProps {
  message: string
  variant?: InsightVariant
}

const variantStyles: Record<InsightVariant, string> = {
  info: 'border-primary/20 bg-primary/5 text-primary',
  warning: 'border-tertiary/30 bg-tertiary/5 text-tertiary',
  success: 'border-secondary/20 bg-secondary/5 text-secondary',
  error: 'border-error/20 bg-error-container text-error',
}

const variantIcons: Record<InsightVariant, string> = {
  info: 'info',
  warning: 'warning',
  success: 'check_circle',
  error: 'error',
}

export function InsightBanner({ message, variant = 'info' }: InsightBannerProps) {
  return (
    <div
      className={`flex items-start gap-sm rounded-lg border px-sm py-2 text-sm ${variantStyles[variant]}`}
    >
      <Icon name={variantIcons[variant]} size={18} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  )
}
