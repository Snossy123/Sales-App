import { describe, expect, it } from 'vitest'
import {
  cashDueDate,
  cashRemainder,
  isDeferredCashSchedule,
  linePaidNow,
} from './cashSchedule'

describe('cashSchedule', () => {
  it('treats only non-immediate schedules as deferred', () => {
    expect(isDeferredCashSchedule('immediate')).toBe(false)
    expect(isDeferredCashSchedule(undefined)).toBe(false)
    expect(isDeferredCashSchedule('month_1')).toBe(true)
    expect(isDeferredCashSchedule('month_3')).toBe(true)
  })

  it('pays the full cash line immediately when there is no down payment', () => {
    expect(linePaidNow('cash', 'immediate', 5000, 0)).toBe(5000)
  })

  it('pays only the down payment for immediate cash when a down payment is set', () => {
    expect(linePaidNow('cash', 'immediate', 5000, 1000)).toBe(1000)
  })

  it('pays only the down payment for deferred cash', () => {
    expect(linePaidNow('cash', 'month_1', 5000, 0)).toBe(0)
    expect(linePaidNow('cash', 'month_2', 5000, 800)).toBe(800)
  })

  it('pays the installment down payment now, capped at the line total', () => {
    expect(linePaidNow('installment', undefined, 4000, 500)).toBe(500)
    expect(linePaidNow('installment', undefined, 4000, 9000)).toBe(4000)
    expect(linePaidNow('installment', undefined, 4000, 0)).toBe(0)
  })

  it('computes the unpaid cash remainder', () => {
    expect(cashRemainder(5000, 1200)).toBe(3800)
    expect(cashRemainder(5000, 9000)).toBe(0)
  })

  it('offsets the contract date by 1–3 months for deferred cash', () => {
    expect(cashDueDate('immediate', '2026-01-15')).toBeNull()
    expect(cashDueDate('month_1', '2026-01-15')).toBe('2026-02-15')
    expect(cashDueDate('month_2', '2026-01-15')).toBe('2026-03-15')
    expect(cashDueDate('month_3', '2026-01-15')).toBe('2026-04-15')
  })
})
