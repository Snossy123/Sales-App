import { describe, expect, it } from 'vitest'
import { displayDateOnly, parseDateOnly, serializeDateOnly } from './dateOnly'

describe('Gregorian date-only contract', () => {
  it('displays DD/MM/YYYY and preserves local date components', () => {
    for (const value of [
      '2026-11-07',
      '2024-02-29',
      '2026-03-29',
      '2026-10-25',
      '0099-01-01',
    ]) {
      expect(serializeDateOnly(parseDateOnly(value)!)).toBe(value)
    }
    expect(displayDateOnly('2026-11-07')).toBe('07/11/2026')
  })
  it('rejects impossible dates and timestamps', () => {
    for (const value of [
      '',
      '2026-02-29',
      '2026-13-01',
      '2026-04-31',
      '2026-11-07T00:00:00Z',
    ]) {
      expect(parseDateOnly(value)).toBeUndefined()
      expect(displayDateOnly(value)).toBe('')
    }
  })
})
