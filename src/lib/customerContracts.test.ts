import { describe, expect, it } from 'vitest'
import type { SalesInvoice } from '../api/types'
import {
  assertPaymentVerification,
  ownershipTransferInstallmentSummary,
  reconcileContractLedger,
} from './customerContracts'

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

describe('reconcileContractLedger', () => {
  const contract = invoice({
    total: 17500,
    paid_amount: 9500,
    balance_due: 8000,
    payment_term: 'installment',
    lines: [
      {
        id: 2,
        quantity: 5,
        unit_price: 3500,
        payment_term: 'installment',
        installment_plan: {
          id: 1,
          down_payment: 5500,
          installment_count: 2,
          items: [
            {
              id: 1,
              installment_number: 1,
              due_date: '2026-01-15',
              amount: 2000,
              paid_amount: 2000,
              status: 'paid',
            },
            {
              id: 2,
              installment_number: 2,
              due_date: '2026-02-14',
              amount: 2000,
              paid_amount: 2000,
              status: 'paid',
            },
          ],
        },
      },
    ],
    payment_transactions: [
      {
        id: 1,
        installment_item_id: 1,
        amount: 2000,
        status: 'active',
        payment_method: 'cash',
        paid_at: '2026-05-01T10:00:00Z',
      },
    ],
  })

  it('covers installment 1 once and leaves installment 2 as legacy', () => {
    const ledger = reconcileContractLedger(contract)

    expect(ledger.confirmedInstallmentPaid).toBe(2000)
    expect(ledger.legacyCredit).toBe(2000)
    expect(ledger.legacyCredits).toEqual([
      expect.objectContaining({ installmentItemId: 2, amount: 2000 }),
    ])
    expect(ledger.confirmedPayments).toHaveLength(1)
  })

  it('does not treat the down payment as a confirmed transaction', () => {
    const ledger = reconcileContractLedger(contract)

    expect(ledger.downPayment).toBe(5500)
    expect(ledger.downPaymentConfirmed).toBe(0)
    expect(ledger.downPaymentUnverified).toBe(5500)
  })

  it('excludes the legacy credit from outstanding and overdue', () => {
    const ledger = reconcileContractLedger(contract)

    expect(ledger.confirmedOutstanding).toBe(2000)
    expect(ledger.confirmedOverdue).toBe(2000)
  })

  it('applies an unlinked payment to the down payment only', () => {
    const ledger = reconcileContractLedger(
      invoice({
        ...contract,
        payment_transactions: [
          ...(contract.payment_transactions ?? []),
          {
            id: 2,
            amount: 6000,
            status: 'active',
            paid_at: '2026-04-11T09:00:00Z',
          },
        ],
      }),
    )

    expect(ledger.confirmedInstallmentPaid).toBe(2000)
    expect(ledger.downPaymentConfirmed).toBe(5500)
    expect(ledger.unallocated).toBe(500)
    expect(ledger.legacyCredit).toBe(2000)
  })

  it('rejects a second receipt that would exceed the legacy gap', () => {
    expect(() =>
      assertPaymentVerification(contract, {
        action: 'record',
        installmentItemId: 2,
        amount: 2001,
        paymentMethod: 'cash',
        paidAt: '2026-06-01T10:00:00',
        collectorUserId: 4,
      }),
    ).toThrow('المبلغ أكبر من السجل غير المؤكد')
  })

  it('accepts a receipt that matches the legacy gap exactly', () => {
    expect(
      assertPaymentVerification(contract, {
        action: 'record',
        installmentItemId: 2,
        amount: 2000,
        paymentMethod: 'cash',
        paidAt: '2026-06-01T10:00:00',
        collectorUserId: 4,
      }).amount,
    ).toBe(2000)
  })

  it('rejects linking a transaction that is already allocated', () => {
    expect(() =>
      assertPaymentVerification(contract, {
        action: 'link',
        installmentItemId: 2,
        paymentTransactionId: 1,
      }),
    ).toThrow('السند مرتبط بقسط بالفعل')
  })
})
