import { NAV_ICON_MAP } from '../lib/navIconCatalog'
import { Icon } from './Icon'

interface NavIconProps {
  name: string
  className?: string
  size?: number
}

export function NavIcon({ name, className = '', size = 24 }: NavIconProps) {
  const ParkIcon = NAV_ICON_MAP[name]
  if (!ParkIcon) {
    return <Icon name={name} size={size} className={className} />
  }

  return (
    <ParkIcon
      theme="multi-color"
      size={size}
      className={`inline-flex shrink-0 ${className}`}
    />
  )
}
