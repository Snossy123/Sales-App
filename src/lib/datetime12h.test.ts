import { describe, expect, it } from 'vitest'
import {
  formatDatetime12hDisplay,
  formatDatetimeLocal,
  isReminderDueToday,
  parseDatetimeLocal,
  to12HourParts,
  to24Hour,
  todayReminderDatetime,
} from './datetime12h'

describe('datetime12h', () => {
  it('converts between 12-hour and 24-hour clocks', () => {
    expect(to12HourParts(0)).toEqual({ hour: 12, period: 'am' })
    expect(to12HourParts(12)).toEqual({ hour: 12, period: 'pm' })
    expect(to12HourParts(15)).toEqual({ hour: 3, period: 'pm' })
    expect(to24Hour(12, 'am')).toBe(0)
    expect(to24Hour(12, 'pm')).toBe(12)
    expect(to24Hour(3, 'pm')).toBe(15)
  })

  it('parses datetime-local strings', () => {
    expect(parseDatetimeLocal('')).toBeNull()
    expect(parseDatetimeLocal('2026-03-15T14:30')).toEqual({
      date: '2026-03-15',
      hour: 2,
      minute: 30,
      period: 'pm',
    })
  })

  it('marks only a reached reminder from the organization current day as due', () => {
    const now = new Date('2026-11-13T18:00:00Z') // 20:00 Cairo

    expect(isReminderDueToday('2026-11-13T17:00:00Z', 'Africa/Cairo', now)).toBe(true)
    expect(isReminderDueToday('2026-11-13T19:00:00Z', 'Africa/Cairo', now)).toBe(false)
    expect(isReminderDueToday('2026-11-12T20:00:00Z', 'Africa/Cairo', now)).toBe(false)
    expect(isReminderDueToday(null, 'Africa/Cairo', now)).toBe(false)
  })

  it('formats 12-hour parts back to datetime-local', () => {
    expect(
      formatDatetimeLocal({ date: '2026-03-15', hour: 2, minute: 30, period: 'pm' }),
    ).toBe('2026-03-15T14:30')
    expect(
      formatDatetimeLocal({ date: '2026-03-15', hour: 12, minute: 5, period: 'am' }),
    ).toBe('2026-03-15T00:05')
  })

  it('fills a real reminder datetime using the organization day around Cairo midnight', () => {
    expect(todayReminderDatetime('Africa/Cairo', new Date('2026-11-06T21:59:59Z'))).toBe('2026-11-06T00:00')
    expect(todayReminderDatetime('Africa/Cairo', new Date('2026-11-06T22:00:00Z'))).toBe('2026-11-07T00:00')
    expect(todayReminderDatetime('UTC', new Date('2026-11-06T22:00:00Z'))).toBe('2026-11-06T00:00')
  })

  it('displays empty values as an em dash', () => {
    expect(formatDatetime12hDisplay(null)).toBe('—')
    expect(formatDatetime12hDisplay(undefined)).toBe('—')
    expect(formatDatetime12hDisplay('')).toBe('—')
  })
})
