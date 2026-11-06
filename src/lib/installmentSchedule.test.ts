import { describe, expect, it } from 'vitest'
import {
  addMonthsNoOverflow,
  installmentDueDate,
  lastInstallmentDate,
  nextInstallmentInterval,
} from './installmentSchedule'

describe('installmentSchedule', () => {
  it('handles API timestamps when editing existing contracts', () => {
    expect(lastInstallmentDate('2026-01-15T00:00:00.000000Z', 3, 'monthly')).toBe('2026-03-15')
    expect(lastInstallmentDate('2026-01-15 00:00:00', 3, 'weekly')).toBe('2026-01-29')
    expect(lastInstallmentDate('2026-01-31T00:00:00Z', 2, 'monthly')).toBe('2026-02-28')
  })

  it('does not display NaN for invalid dates or installment counts', () => {
    expect(lastInstallmentDate('invalid', 3, 'monthly')).toBeNull()
    expect(lastInstallmentDate('2026-02-30', 3, 'monthly')).toBeNull()
    expect(lastInstallmentDate('2026-01-15', NaN, 'monthly')).toBeNull()
    expect(addMonthsNoOverflow('invalid', 1)).toBe('')
  })

  it('advances monthly dues by calendar month, not 30 days', () => {
    expect(installmentDueDate('2026-01-15', 1, 'monthly')).toBe('2026-02-15')
    expect(installmentDueDate('2026-01-15', 2, 'monthly')).toBe('2026-03-15')
    expect(installmentDueDate('2026-01-15', 1, 'monthly')).not.toBe('2026-02-14')
  })

  it('clamps month-end dates without overflowing', () => {
    expect(addMonthsNoOverflow('2026-01-31', 1)).toBe('2026-02-28')
    expect(installmentDueDate('2026-01-31', 2, 'monthly')).toBe('2026-03-31')
  })

  it('keeps weekly dues on a 7-day step', () => {
    expect(installmentDueDate('2026-01-15', 1, 'weekly', 7)).toBe('2026-01-22')
    expect(nextInstallmentInterval('2026-01-15', 'weekly')).toBe('2026-01-22')
  })

  it('computes the last monthly due from the first due date', () => {
    expect(lastInstallmentDate('2026-01-15', 3, 'monthly')).toBe('2026-03-15')
    expect(nextInstallmentInterval('2026-01-19', 'monthly')).toBe('2026-02-19')
  })
})
