import { Link } from 'react-router-dom'
import { Icon } from './Icon'

export type InsightVariant = 'info' | 'warning' | 'success' | 'error'

interface InsightBannerProps {
  message: string
  variant?: InsightVariant
  to?: string
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

export function InsightBanner({ message, variant = 'info', to }: InsightBannerProps) {
  const content = (
    <>
      <Icon name={variantIcons[variant]} size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1">{message}</p>
      {to && <Icon name="chevron_left" size={18} className="shrink-0 opacity-70" />}
    </>
  )

  const className = `flex items-start gap-sm rounded-lg border px-sm py-2 text-sm transition-colors ${variantStyles[variant]} ${to ? 'hover:opacity-90' : ''}`

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}
