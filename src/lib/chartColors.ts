export const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
] as const

export function formatArNumber(value: number) {
  return value.toLocaleString('ar-EG')
}
