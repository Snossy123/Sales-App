import { Icon } from './Icon'
import { resolvePublicStorageUrl } from '../lib/storageUrl'

export type ProfileAvatarVariant = 'customer' | 'distributor' | 'employee'

const variantIcons: Record<ProfileAvatarVariant, string> = {
  customer: 'person',
  distributor: 'local_shipping',
  employee: 'badge',
}

const variantStyles: Record<ProfileAvatarVariant, string> = {
  customer: 'bg-primary/15 text-primary',
  distributor: 'bg-secondary/15 text-secondary',
  employee: 'bg-tertiary/15 text-tertiary',
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-24 w-24 text-2xl',
} as const

const iconSizes = {
  sm: 16,
  md: 22,
  lg: 40,
} as const

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`
  }
  return name.trim().slice(0, 2) || '?'
}

export interface ProfileAvatarProps {
  name: string
  photoUrl?: string | null
  variant: ProfileAvatarVariant
  size?: keyof typeof sizeClasses
  className?: string
}

export function ProfileAvatar({
  name,
  photoUrl,
  variant,
  size = 'md',
  className = '',
}: ProfileAvatarProps) {
  const resolvedUrl = resolvePublicStorageUrl(photoUrl)
  const sizeClass = sizeClasses[size]

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        className={`shrink-0 rounded-full object-cover ${sizeClass} ${className}`}
      />
    )
  }

  const initials = getInitials(name)

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClass} ${variantStyles[variant]} ${className}`}
      aria-hidden={Boolean(initials)}
    >
      {initials.length >= 2 ? (
        initials
      ) : (
        <Icon name={variantIcons[variant]} size={iconSizes[size]} />
      )}
    </span>
  )
}
