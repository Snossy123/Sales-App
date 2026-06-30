/** يزيل محارف نهاية السطر التي يرسلها قارئ الباركود (HID keyboard wedge). */
export function normalizeScannedInput(value: string): string {
  return value.replace(/[\r\n\t]/g, '').trim()
}
