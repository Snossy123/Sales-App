export const GPS_USERNAME_PREFIX = 'Eleraqy'

export function parseGpsUsername(value: string): { prefixed: boolean; suffix: string } {
  const trimmed = value.trim()
  if (!trimmed) {
    return { prefixed: true, suffix: '' }
  }
  if (trimmed.startsWith(GPS_USERNAME_PREFIX)) {
    return { prefixed: true, suffix: trimmed.slice(GPS_USERNAME_PREFIX.length) }
  }
  return { prefixed: false, suffix: trimmed }
}

export function formatGpsUsername(suffix: string, prefixed = true): string {
  const cleaned = suffix.trim()
  if (!prefixed) {
    return cleaned
  }
  if (!cleaned) {
    return ''
  }
  if (cleaned.startsWith(GPS_USERNAME_PREFIX)) {
    return cleaned
  }
  return `${GPS_USERNAME_PREFIX}${cleaned}`
}

export function isGpsUsernameComplete(value: string): boolean {
  const { prefixed, suffix } = parseGpsUsername(value)
  if (prefixed) {
    return suffix.length > 0
  }
  return suffix.length > 0
}
