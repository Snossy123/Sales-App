function getApiOrigin(): string | undefined {
  const apiUrl = import.meta.env.VITE_API_URL?.trim()
  if (!apiUrl) return undefined
  return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
}

function ensureAbsoluteUrl(url: string): string {
  if (
    url.startsWith('blob:')
    || url.startsWith('data:')
    || url.startsWith('http://')
    || url.startsWith('https://')
  ) {
    return url
  }

  if (url.startsWith('//')) {
    return `https:${url}`
  }

  if (url.startsWith('/')) {
    const origin = getApiOrigin() ?? (typeof window !== 'undefined' ? window.location.origin : '')
    return `${origin}${url}`
  }

  // API sometimes returns "domain.com/path" without a scheme — treat as absolute HTTPS.
  return `https://${url.replace(/^\/+/, '')}`
}

/**
 * Normalize public storage URLs when the API is served from the project root
 * (e.g. …/public/storage instead of …/storage).
 */
export function resolvePublicStorageUrl(url?: string | null): string | undefined {
  if (!url) return undefined

  let resolved = ensureAbsoluteUrl(url)

  if (import.meta.env.VITE_STORAGE_USE_PUBLIC_PREFIX === 'true') {
    if (resolved.includes('/public/storage/')) return resolved
    if (resolved.includes('/storage/')) return resolved.replace('/storage/', '/public/storage/')
  }

  return resolved
}

export function resolveMediaUrl(url?: string | null): string | undefined {
  return resolvePublicStorageUrl(url)
}

export function isImageMimeType(mimeType?: string | null): boolean {
  return mimeType?.startsWith('image/') ?? false
}

export function isPdfMimeType(mimeType?: string | null): boolean {
  return mimeType === 'application/pdf'
}
