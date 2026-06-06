interface IconProps {
  name: string
  className?: string
  filled?: boolean
  size?: number
}

export function Icon({ name, className = '', filled = false, size = 24 }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined inline-flex items-center justify-center leading-none ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      }}
      aria-hidden
    >
      {name}
    </span>
  )
}
