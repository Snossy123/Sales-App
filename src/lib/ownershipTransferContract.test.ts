import { describe, expect, it } from 'vitest'
import type { SalesInvoice } from '../api/types'
import {
  resolveOwnershipTransferDeviceLine,
  resolveOwnershipTransferNewOwner,
  resolveOwnershipTransferPreviousOwner,
} from './ownershipTransferContract'

function invoice(extras: Partial<SalesInvoice> = {}): SalesInvoice {
  return {
    id: 10,
    invoice_date: '2026-09-25',
    total: 200,
    paid_amount: 200,
    balance_due: 0,
    payment_term: 'cash',
    payment_status: 'paid',
    customer_id: 2,
    contract_kind: 'ownership_transfer',
    customer: { id: 2, name: 'المالك الجديد', phone: '01033334444', status: 'active' },
    ...extras,
  }
}

describe('resolveOwnershipTransferPreviousOwner', () => {
  it('uses the source invoice customer before the transfer is executed', () => {
    const previous = resolveOwnershipTransferPreviousOwner(
      invoice({
        source_invoice: {
          id: 1,
          invoice_date: '2026-01-01',
          total: 4000,
          paid_amount: 1500,
          balance_due: 2500,
          payment_term: 'installment',
          payment_status: 'partial',
          customer_id: 1,
          customer: { id: 1, name: 'عادل حسن', phone: '01011112222', status: 'active' },
        },
      }),
    )

    expect(previous?.name).toBe('عادل حسن')
  })

  it('prefers the transfer record after ownership moves to the new customer', () => {
    const previous = resolveOwnershipTransferPreviousOwner(
      invoice({
        source_invoice: {
          id: 1,
          invoice_date: '2026-01-01',
          total: 4000,
          paid_amount: 1500,
          balance_due: 2500,
          payment_term: 'installment',
          payment_status: 'partial',
          customer_id: 2,
          customer: { id: 2, name: 'المالك الجديد', phone: '01033334444', status: 'active' },
        },
        ownership_transfer_record: {
          id: 99,
          source_sales_invoice_id: 1,
          transfer_sales_invoice_id: 10,
          from_customer_id: 1,
          to_customer_id: 2,
          from_customer: { id: 1, name: 'عادل حسن', phone: '01011112222' },
          to_customer: { id: 2, name: 'المالك الجديد', phone: '01033334444' },
        },
      }),
    )

    expect(previous?.name).toBe('عادل حسن')
  })
})

describe('resolveOwnershipTransferNewOwner', () => {
  it('uses the transfer invoice customer', () => {
    expect(resolveOwnershipTransferNewOwner(invoice())?.name).toBe('المالك الجديد')
  })
})

describe('resolveOwnershipTransferDeviceLine', () => {
  it('falls back to the source contract device when the transfer line has no identity', () => {
    const line = resolveOwnershipTransferDeviceLine(
      invoice({
        lines: [{ id: 21, line_type: 'device', unit_price: 0, line_total: 0 }],
        source_invoice: {
          id: 1,
          invoice_date: '2026-01-01',
          total: 4000,
          paid_amount: 1500,
          balance_due: 2500,
          payment_term: 'installment',
          payment_status: 'partial',
          customer_id: 1,
          lines: [
            {
              id: 11,
              line_type: 'device',
              serial_number: 'SN-2022-003456',
              sim_number: '01008889999',
              username: 'mona_gps',
              unit_price: 4000,
              line_total: 4000,
            },
          ],
        },
      }),
    )

    expect(line?.serial_number).toBe('SN-2022-003456')
    expect(line?.username).toBe('mona_gps')
  })
})
