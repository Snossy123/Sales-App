/**
 * Normalize public storage URLs when the API is served from the project root
 * (e.g. …/SALES-API/public/storage instead of …/SALES-API/storage).
 */
export function resolvePublicStorageUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  if (url.includes('/public/storage/')) return url
  if (url.includes('/storage/')) return url.replace('/storage/', '/public/storage/')
  return url
}
