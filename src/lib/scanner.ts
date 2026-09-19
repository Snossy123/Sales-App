import { filterLatinDigitsOnly } from './normalizeDigits'

/** يزيل محارف نهاية السطر التي يرسلها قارئ الباركود (HID keyboard wedge). */
export function normalizeScannedInput(value: string): string {
  return value.replace(/[\r\n\t]/g, '').trim()
}

/** Scanner cleanup plus Western digits only (Arabic/Persian digits converted). */
export function normalizeScannedDigits(value: string): string {
  return filterLatinDigitsOnly(normalizeScannedInput(value))
}
