const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹'

/** Convert Arabic-Indic and Persian digits to Western (0-9). */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN.indexOf(d)))
}

/** Parse a localized numeric string (Arabic or Western digits) to a number. */
export function parseLocalizedNumber(value: string): number {
  const normalized = normalizeDigits(value).replace(/[^\d.-]/g, '')
  if (!normalized || normalized === '-' || normalized === '.') return 0
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}
