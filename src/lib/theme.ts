const DEFAULT_PRIMARY = '#005bbf'

export function applyThemeColor(color?: string | null): void {
  const primary = color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : DEFAULT_PRIMARY
  const root = document.documentElement
  root.style.setProperty('--color-primary', primary)
  root.style.setProperty('--color-surface-tint', primary)
  root.style.setProperty('--color-chart-1', primary)
}

export { formatMoney } from './format'
