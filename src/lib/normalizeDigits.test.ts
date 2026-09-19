import { describe, expect, it } from 'vitest'
import {
  filterByMode,
  filterLatinDigitsOnly,
  normalizeDigits,
  parseLocalizedNumber,
  stripNonLatinNumber,
  stripNonLatinPhone,
} from './normalizeDigits'

describe('normalizeDigits', () => {
  it('converts Arabic-Indic and Persian digits to Western', () => {
    expect(normalizeDigits('١٢٣')).toBe('123')
    expect(normalizeDigits('۱۲۳')).toBe('123')
    expect(normalizeDigits('12٣')).toBe('123')
  })

  it('keeps western digits only after converting Arabic and Persian', () => {
    expect(filterLatinDigitsOnly('١٢٣٤abc')).toBe('1234')
    expect(filterLatinDigitsOnly('SN-۱۲۳')).toBe('123')
    expect(filterLatinDigitsOnly('010-99')).toBe('01099')
  })

  it('strips non-latin characters from numbers and phones', () => {
    expect(stripNonLatinNumber('12.5-abc')).toBe('12.5-')
    expect(stripNonLatinPhone('+20 10-123abc')).toBe('+20 10-123')
  })

  it('filters input by mode', () => {
    expect(filterByMode('١٢.٥x', 'numeric')).toBe('12.5')
    expect(filterByMode('+20abc', 'phone')).toBe('+20')
    expect(filterByMode('Hello مرحبا 12!', 'arabic')).toBe('Hello مرحبا 12!')
    expect(filterByMode('keep #raw', 'any')).toBe('keep #raw')
  })

  it('parses localized numbers', () => {
    expect(parseLocalizedNumber('١٢٣.٥')).toBe(123.5)
    expect(parseLocalizedNumber('')).toBe(0)
    expect(parseLocalizedNumber('-')).toBe(0)
    expect(parseLocalizedNumber('.')).toBe(0)
  })
})
