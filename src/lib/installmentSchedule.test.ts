import { describe, expect, it } from 'vitest'
import {
  addMonthsNoOverflow,
  installmentDueDate,
  lastInstallmentDate,
  nextInstallmentInterval,
} from './installmentSchedule'

describe('installmentSchedule', () => {
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
