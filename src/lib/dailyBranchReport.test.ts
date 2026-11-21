import { describe, expect, it } from 'vitest'
import { arabicDayName, formatReportHeaderDate } from './dailyBranchReport'

describe('daily report header date', () => {
  it('reads the calendar date from a datetime string', () => {
    expect(formatReportHeaderDate('2026-11-21T00:00:00.000000Z')).toBe('21 / 11 / 2026')
    expect(arabicDayName('2026-11-21T00:00:00.000000Z')).toBe('السبت')
  })

  it('does not print NaN for an empty date', () => {
    expect(formatReportHeaderDate('')).toBe('—')
    expect(arabicDayName('')).toBe('')
  })
})
