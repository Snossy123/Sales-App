import { describe, expect, it } from 'vitest'
import { isAtOrBelowMinStock, minStockWarningMessage } from './minStock'

describe('minStock', () => {
  it('never warns when min stock is missing or zero', () => {
    expect(isAtOrBelowMinStock(0, 0)).toBe(false)
    expect(isAtOrBelowMinStock(3, null)).toBe(false)
    expect(isAtOrBelowMinStock(3, undefined)).toBe(false)
  })

  it('warns when available is at or below a positive min', () => {
    expect(isAtOrBelowMinStock(5, 5)).toBe(true)
    expect(isAtOrBelowMinStock(2, 5)).toBe(true)
    expect(isAtOrBelowMinStock(6, 5)).toBe(false)
  })

  it('includes available count in the warning message', () => {
    expect(minStockWarningMessage(4)).toBe('المخزون وصل للحد الأدنى (المتاح: 4). كلم الأدمن لطلب أجهزة.')
  })
})
