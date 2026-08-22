const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹'

/** Convert Arabic-Indic and Persian digits to Western (0-9). */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN.indexOf(d)))
}

/** Keep Latin digits and numeric punctuation only. Converts Arabic/Persian digits first. */
export function stripNonLatinNumber(value: string): string {
  return normalizeDigits(value).replace(/[^\d.-]/g, '')
}

/** Phone/ID style: Latin digits and common separators only. Converts Arabic/Persian digits first. */
export function stripNonLatinPhone(value: string): string {
  return normalizeDigits(value).replace(/[^\d+\s-]/g, '')
}

function isArabicLetterBlock(code: number): boolean {
  return (
    (code >= 0x0600 && code <= 0x06ff) ||
    (code >= 0x0750 && code <= 0x077f) ||
    (code >= 0x08a0 && code <= 0x08ff) ||
    (code >= 0xfb50 && code <= 0xfdff) ||
    (code >= 0xfe70 && code <= 0xfeff)
  )
}

const EXTRA_PUNCTUATION = '.,:;!?-_()[]{}«»""\'/\\%+*#@&،؛؟'

/** Arabic or English letters, punctuation, spaces, and Latin digits. Converts Arabic/Persian digits. */
export function filterArabicText(value: string): string {
  return [...normalizeDigits(value)]
    .filter((ch) => {
      const code = ch.codePointAt(0)
      if (code == null) return false
      if (code >= 0x30 && code <= 0x39) return true
      if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) return true
      if (isArabicLetterBlock(code)) return true
      if (/\s/.test(ch)) return true
      return EXTRA_PUNCTUATION.includes(ch)
    })
    .join('')
}

export type TextInputMode = 'arabic' | 'numeric' | 'phone' | 'any'

export function filterByMode(value: string, mode: TextInputMode): string {
  switch (mode) {
    case 'arabic':
      return filterArabicText(value)
    case 'numeric':
      return stripNonLatinNumber(value)
    case 'phone':
      return stripNonLatinPhone(value)
    default:
      return value
  }
}

/** Parse a numeric string that already uses Western digits. */
export function parseLocalizedNumber(value: string): number {
  const normalized = stripNonLatinNumber(value)
  if (!normalized || normalized === '-' || normalized === '.') return 0
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}
