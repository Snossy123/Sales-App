import { describe, expect, it } from 'vitest'
import { amountFromPercent, clampDiscountAmount, percentFromAmount } from './discount'

describe('discount', () => {
  it('converts percent to amount and amount to percent', () => {
    expect(amountFromPercent(2000, 10)).toBe(200)
    expect(percentFromAmount(2000, 200)).toBe(10)
  })

  it('returns zero for non-positive bases or values', () => {
    expect(amountFromPercent(0, 10)).toBe(0)
    expect(amountFromPercent(100, 0)).toBe(0)
    expect(amountFromPercent(-50, 10)).toBe(0)
    expect(percentFromAmount(0, 10)).toBe(0)
    expect(percentFromAmount(100, -5)).toBe(0)
  })

  it('clamps discount amount between 0 and the base', () => {
    expect(clampDiscountAmount(1000, 250)).toBe(250)
    expect(clampDiscountAmount(1000, 1500)).toBe(1000)
    expect(clampDiscountAmount(1000, -20)).toBe(0)
  })
})
