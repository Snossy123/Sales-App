import { describe, expect, it } from 'vitest'
import { acceptsDigitNormalization, insertNormalizedText } from './digitInput'
import { normalizeDigits } from './normalizeDigits'

describe('digit input', () => {
  it('converts Arabic and Persian digits as they are typed', () => {
    expect(insertNormalizedText('', '١٢٣', 0, 0)).toEqual({ value: '123', cursor: 3 })
    expect(insertNormalizedText('12', '۳', 2, 2)).toEqual({ value: '123', cursor: 3 })
  })

  it('converts a pasted amount and keeps the decimal point', () => {
    expect(insertNormalizedText('', '١٥٠.٥', 0, 0)).toEqual({ value: '150.5', cursor: 5 })
    expect(insertNormalizedText('15.', '٥', 3, 3)).toEqual({ value: '15.5', cursor: 4 })
    expect(normalizeDigits('١٥٠.٥')).toBe('150.5')
  })

  it('normalizes number fields and skips dates, times, files, and checkboxes', () => {
    expect(acceptsDigitNormalization('number')).toBe(true)
    expect(acceptsDigitNormalization('text')).toBe(true)
    expect(acceptsDigitNormalization('date')).toBe(false)
    expect(acceptsDigitNormalization('time')).toBe(false)
    expect(acceptsDigitNormalization('datetime-local')).toBe(false)
    expect(acceptsDigitNormalization('file')).toBe(false)
    expect(acceptsDigitNormalization('checkbox')).toBe(false)
    expect(acceptsDigitNormalization('radio')).toBe(false)
  })
})
