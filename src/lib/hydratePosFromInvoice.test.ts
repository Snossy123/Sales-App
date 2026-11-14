import { describe, expect, it } from 'vitest'
import type { SalesInvoice, SalesInvoiceLine } from '../api/types'
import { deviceDraftsFromInvoice } from './hydratePosFromInvoice'
import { lineNetTotal } from '../components/pos/DeviceLineCard'
import { linePaidNow } from './cashSchedule'

function invoice(lines: Partial<SalesInvoiceLine>[], fields: Partial<SalesInvoice> = {}): SalesInvoice {
  return {
    id: 1, customer_id: 1, invoice_date: '2026-11-05', payment_term: 'cash', contract_kind: 'new_contract',
    total: 6800, subtotal: 6800, balance_due: 0, payment_status: 'paid',
    lines: lines.map((line, index) => ({ id: index + 1, quantity: 1, product_unit_id: index + 1, ...line })) as SalesInvoiceLine[],
    ...fields,
  }
}

describe('cash contract edit hydration', () => {
  it('keeps the saved price and full immediate cash amount instead of an installment deposit', () => {
    const [line] = deviceDraftsFromInvoice(invoice([{ unit_price: '6800', discount: '300', payment_term: 'cash' }]), '2026-11-05')
    expect(line.unitPrice).toBe(6800)
    expect(lineNetTotal(line)).toBe(6500)
    expect(line.downPayment).toBe(6500)
    expect(linePaidNow(line.paymentTerm, line.cashSchedule, lineNetTotal(line), line.downPayment)).toBe(6500)
  })

  it('recovers a missing unit price from the saved line total including its discount', () => {
    const [line] = deviceDraftsFromInvoice(invoice([{ unit_price: 0, line_total: '6000', discount: '200' }]), '2026-11-05')
    expect(line.unitPrice).toBe(6200)
    expect(lineNetTotal(line)).toBe(6000)
  })

  it('recovers a legacy single-device amount without adding installation, transport or tax to its price', () => {
    const [line] = deviceDraftsFromInvoice(invoice([{ unit_price: 0, line_total: 0 }], {
      subtotal: 0, total: 7100, installation_fee: 150, transportation_fee: 50, tax_amount: 100,
    }), '2026-11-05')
    expect(line.unitPrice).toBe(6800)
    expect(line.downPayment).toBe(6800)
  })

  it('does not guess how to allocate an invoice total across missing device prices', () => {
    const lines = deviceDraftsFromInvoice(invoice([{ unit_price: 0 }, { unit_price: 0 }], { total: 13600, subtotal: 13600 }), '2026-11-05')
    expect(lines.map((line) => line.unitPrice)).toEqual([0, 0])
  })

  it('does not turn ownership transfer fees into a device sale price', () => {
    const [line] = deviceDraftsFromInvoice(invoice([{ unit_price: 0, line_total: 0 }], { contract_kind: 'ownership_transfer', total: 450, subtotal: 450 }), '2026-11-05')
    expect(line.unitPrice).toBe(0)
    expect(line.downPayment).toBe(0)
  })

  it('keeps the saved deposit for deferred cash and uses zero when no deposit was recorded', () => {
    const deferred = invoice([{ unit_price: 6800, cash_schedule: 'month_3', installment_plan: { down_payment: 1000 } as SalesInvoiceLine['installment_plan'] }])
    expect(deviceDraftsFromInvoice(deferred, '2026-11-05')[0].downPayment).toBe(1000)
    const withoutPlan = invoice([{ unit_price: 6800, cash_schedule: 'month_3' }])
    expect(deviceDraftsFromInvoice(withoutPlan, '2026-11-05')[0].downPayment).toBe(0)
  })
})
