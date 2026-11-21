import { describe, expect, it } from 'vitest'
import { formatCairoDateTime12h, formatCalendarYmd, formatDate, formatTime } from './format'

const BIDI_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/

describe('formatDate', () => {
  it('formats an ISO date as dd/mm/yyyy without bidi marks', () => {
    const formatted = formatDate('2026-08-29')
    expect(formatted).toBe('29/08/2026')
    expect(formatted).not.toMatch(BIDI_MARKS)
  })
})

describe('formatCalendarYmd', () => {
  it('keeps a calendar date as yyyy/mm/dd', () => {
    expect(formatCalendarYmd('2026-09-21')).toBe('2026/09/21')
    expect(formatCalendarYmd('2026-09-21T00:17:00')).toBe('2026/09/21')
  })
})

describe('formatCairoDateTime12h', () => {
  it('prints a wall-clock time on a 12-hour clock', () => {
    expect(formatCairoDateTime12h('2026-11-21T00:17:00')).toBe('2026/11/21، 12:17 ص')
    expect(formatCairoDateTime12h('2026-11-21')).toBe('2026/11/21')
  })

  it('converts a zoned instant to Cairo', () => {
    expect(formatCairoDateTime12h('2026-11-20T22:17:00Z')).toBe('2026/11/21، 12:17 ص')
  })
})

describe('formatTime', () => {
  it('formats a UTC instant in Africa/Cairo', () => {
    const formatted = formatTime('2026-09-25T16:03:00.000Z')
    expect(formatted).toMatch(/07:03/)
    expect(formatted).not.toMatch(BIDI_MARKS)
  })
})
