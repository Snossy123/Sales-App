import { describe, expect, it } from 'vitest'
import {
  cashDueDate,
  cashRemainder,
  cashScheduleDueDates,
  cashScheduleFirstDueDate,
  cashSchedulePaymentCount,
  isCustomCashSchedule,
  isDeferredCashSchedule,
  linePaidNow,
  presetDeferredCashPlan,
  resizeCashScheduleItems,
  seedCashScheduleItems,
  validateCashScheduleItems,
} from './cashSchedule'

describe('cashSchedule', () => {
  it('treats only non-immediate schedules as deferred', () => {
    expect(isDeferredCashSchedule('immediate')).toBe(false)
    expect(isDeferredCashSchedule(undefined)).toBe(false)
    expect(isDeferredCashSchedule('month_1')).toBe(true)
    expect(isDeferredCashSchedule('month_3')).toBe(true)
    expect(isDeferredCashSchedule('custom')).toBe(true)
    expect(isCustomCashSchedule('custom')).toBe(true)
    expect(isCustomCashSchedule('month_1')).toBe(false)
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
    expect(cashDueDate('custom', '2026-01-15')).toBeNull()
  })

  it('splits two- and three-month cash into monthly payments starting after one month', () => {
    expect(cashSchedulePaymentCount('month_1')).toBe(1)
    expect(cashSchedulePaymentCount('month_2')).toBe(2)
    expect(cashSchedulePaymentCount('month_3')).toBe(3)
    expect(cashScheduleFirstDueDate('month_2', '2026-01-15')).toBe('2026-02-15')
    expect(cashScheduleDueDates('month_2', '2026-01-15')).toEqual(['2026-02-15', '2026-03-15'])
    expect(cashScheduleDueDates('month_3', '2026-01-15')).toEqual([
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ])
    expect(presetDeferredCashPlan('month_2', '2026-01-15', 3000)).toEqual({
      installment_count: 2,
      installment_amount: null,
      first_due_date: '2026-02-15',
    })
    expect(presetDeferredCashPlan('month_1', '2026-01-15', 3000)).toEqual({
      installment_count: 1,
      installment_amount: 3000,
      first_due_date: '2026-02-15',
    })
    expect(presetDeferredCashPlan('immediate', '2026-01-15', 3000)).toBeNull()
  })

  it('pays only the down payment for a custom cash schedule', () => {
    expect(linePaidNow('cash', 'custom', 5000, 0)).toBe(0)
    expect(linePaidNow('cash', 'custom', 5000, 800)).toBe(800)
  })

  it('validates custom cash schedule items against the remainder', () => {
    expect(validateCashScheduleItems([], 1000, 12)).toEqual(['أضف قسطًا واحدًا على الأقل'])
    expect(
      validateCashScheduleItems(
        [
          { amount: 400, dueDate: '2026-02-01' },
          { amount: 600, dueDate: '2026-03-01' },
        ],
        1000,
        12,
      ),
    ).toEqual([])
    expect(
      validateCashScheduleItems([{ amount: 400, dueDate: '2026-02-01' }], 1000, 12),
    ).toContain('مجموع الأقساط يجب أن يساوي المتبقي بعد المقدم')
  })

  it('resizes custom schedule rows from the end', () => {
    const seeded = seedCashScheduleItems(1200, '2026-01-15')
    expect(seeded).toEqual([{ amount: 1200, dueDate: '2026-01-15' }])
    expect(resizeCashScheduleItems(seeded, 2, '2026-01-15')).toEqual([
      { amount: 1200, dueDate: '2026-01-15' },
      { amount: 0, dueDate: '2026-01-15' },
    ])
  })
})
