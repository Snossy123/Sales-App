export const FONT_SCALE_STORAGE_KEY = 'gps-ui-zoom'

export const FONT_SCALE_STEPS = [0.9, 1, 1.1, 1.2, 1.3] as const

export type FontScale = (typeof FONT_SCALE_STEPS)[number]

export const DEFAULT_FONT_SCALE: FontScale = 1

function isFontScale(value: number): value is FontScale {
  return (FONT_SCALE_STEPS as readonly number[]).includes(value)
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

export function readFontScale(): FontScale {
  const raw = storage()?.getItem(FONT_SCALE_STORAGE_KEY)
  if (raw == null || raw === '') return DEFAULT_FONT_SCALE
  const value = Number(raw)
  return isFontScale(value) ? value : DEFAULT_FONT_SCALE
}

export function applyFontScale(scale: FontScale): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--ui-zoom', String(scale))
}

export function writeFontScale(scale: FontScale): void {
  storage()?.setItem(FONT_SCALE_STORAGE_KEY, String(scale))
  applyFontScale(scale)
}

export function applyStoredFontScale(): FontScale {
  const scale = readFontScale()
  applyFontScale(scale)
  return scale
}

export function stepFontScale(current: FontScale, direction: -1 | 1): FontScale {
  const index = FONT_SCALE_STEPS.indexOf(current)
  const next = Math.min(FONT_SCALE_STEPS.length - 1, Math.max(0, index + direction))
  return FONT_SCALE_STEPS[next]
}
