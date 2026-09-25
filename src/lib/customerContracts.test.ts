import { describe, expect, it } from 'vitest'
import type { SalesInvoice } from '../api/types'
import { ownershipTransferInstallmentSummary } from './customerContracts'

function invoice(extras: Partial<SalesInvoice>): SalesInvoice {
  return {
    id: 1,
    invoice_date: '2026-09-01',
    total: extras.total ?? 2000,
    paid_amount: extras.paid_amount ?? 500,
    balance_due: extras.balance_due ?? 1500,
    payment_term: extras.payment_term ?? 'installment',
    payment_status: extras.payment_status ?? 'partial',
    customer_id: 10,
    lines: extras.lines ?? [],
    ...extras,
  }
}

describe('ownershipTransferInstallmentSummary', () => {
  it('uses generated installment items when present', () => {
    const summary = ownershipTransferInstallmentSummary(
      invoice({
        balance_due: 0,
        lines: [
          {
            id: 1,
            unit_price: 2000,
            line_total: 2000,
            payment_term: 'installment',
            installment_plan: {
              id: 11,
              down_payment: 500,
              installment_count: 3,
              items: [
                {
                  id: 101,
                  due_date: '2026-10-01',
                  amount: 500,
                  paid_amount: 500,
                  status: 'paid',
                },
                {
                  id: 102,
                  due_date: '2026-11-01',
                  amount: 500,
                  paid_amount: 0,
                  status: 'pending',
                },
                {
                  id: 103,
                  due_date: '2026-12-01',
                  amount: 500,
                  paid_amount: 0,
                  status: 'pending',
                },
              ],
            },
          },
        ],
      }),
    )

    expect(summary.paidCount).toBe(1)
    expect(summary.remaining).toBe(1000)
  })

  it('falls back to balance_due when the plan has no items', () => {
    const summary = ownershipTransferInstallmentSummary(
      invoice({
        balance_due: 1500,
        lines: [
          {
            id: 1,
            unit_price: 2000,
            line_total: 2000,
            payment_term: 'installment',
            installment_plan: {
              id: 11,
              down_payment: 500,
              installment_count: 3,
              items: [],
            },
          },
        ],
      }),
    )

    expect(summary.paidCount).toBe(0)
    expect(summary.remaining).toBe(1500)
  })

  it('falls back to financed amount when items and balance_due are missing', () => {
    const summary = ownershipTransferInstallmentSummary(
      invoice({
        total: 2000,
        balance_due: 0,
        lines: [
          {
            id: 1,
            unit_price: 2000,
            line_total: 2000,
            payment_term: 'installment',
            installment_plan: {
              id: 11,
              down_payment: 500,
              installment_count: 3,
            },
          },
        ],
      }),
    )

    expect(summary.paidCount).toBe(0)
    expect(summary.remaining).toBe(1500)
  })
})
