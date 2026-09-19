import { describe, expect, it } from 'vitest'
import { formatDate } from './format'

const BIDI_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/

describe('formatDate', () => {
  it('formats an ISO date as dd/mm/yyyy without bidi marks', () => {
    const formatted = formatDate('2026-08-29')
    expect(formatted).toBe('29/08/2026')
    expect(formatted).not.toMatch(BIDI_MARKS)
  })
})
