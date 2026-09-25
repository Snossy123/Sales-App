import { describe, expect, it } from 'vitest'
import { formatDate, formatTime } from './format'

const BIDI_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/

describe('formatDate', () => {
  it('formats an ISO date as dd/mm/yyyy without bidi marks', () => {
    const formatted = formatDate('2026-08-29')
    expect(formatted).toBe('29/08/2026')
    expect(formatted).not.toMatch(BIDI_MARKS)
  })
})

describe('formatTime', () => {
  it('formats a UTC instant in Africa/Cairo', () => {
    const formatted = formatTime('2026-09-25T16:03:00.000Z')
    expect(formatted).toMatch(/07:03/)
    expect(formatted).not.toMatch(BIDI_MARKS)
  })
})
