import { describe, expect, it } from 'vitest'
import { describeDeviceSerials } from './deviceSerials'
import { resolveLineDiscountPercent } from './contractFields'
import type { SalesInvoice, SalesInvoiceLine } from '../api/types'

describe('describeDeviceSerials', () => {
  it('shows primary and changed serial when physical_serial differs from serial_number', () => {
    const info = describeDeviceSerials({
      physical_serial: '356153590000000',
      serial_number: '8617680790000000',
    })

    expect(info.changed).toBe(true)
    expect(info.primary).toBe('356153590000000')
    expect(info.current).toBe('8617680790000000')
    expect(info.label).toBe('السيريال الأساسية: 356153590000000 — تم تغييرها إلى: 8617680790000000')
  })

  it('shows only primary serial when serials match', () => {
    const info = describeDeviceSerials({
      physical_serial: '356153590000000',
      serial_number: '356153590000000',
    })

    expect(info.changed).toBe(false)
    expect(info.label).toBe('السيريال الأساسية: 356153590000000')
  })
})

describe('resolveLineDiscountPercent', () => {
  it('calculates 50% discount from line unit_price and discount', () => {
    const line = {
      id: 1,
      quantity: 1,
      unit_price: 1700,
      discount: 850,
      line_total: 850,
    } as SalesInvoiceLine
    const invoice = { id: 1, total: 850 } as SalesInvoice

    expect(resolveLineDiscountPercent(line, invoice)).toBe(50)
  })

  it('returns 0 when no discount is applied', () => {
    const line = {
      id: 1,
      quantity: 1,
      unit_price: 850,
      discount: 0,
      line_total: 850,
    } as SalesInvoiceLine
    const invoice = { id: 1, total: 850 } as SalesInvoice

    expect(resolveLineDiscountPercent(line, invoice)).toBe(0)
  })
})
