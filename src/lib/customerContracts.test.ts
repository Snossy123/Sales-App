import { describe, expect, it } from 'vitest'
import type { SalesInvoice } from '../api/types'
import {
  assertPaymentVerification,
  buildContractSummary,
  getInstallmentItems,
  installmentStatusLabel,
  ownershipTransferInstallmentSummary,
  reconcileContractLedger,
} from './customerContracts'

describe('installmentStatusLabel', () => {
  it('returns تم نقل ملكية when ownership_transferred_at is set', () => {
    expect(
      installmentStatusLabel('pending', '2026-01-01', {
        ownership_transferred_at: '2026-11-01T10:00:00Z',
      }),
    ).toBe('تم نقل ملكية')
  })

  it('returns تم نقل ملكية when is_ownership_transferred is true', () => {
    expect(
      installmentStatusLabel('paid', '2026-01-01', {
        is_ownership_transferred: true,
      }),
    ).toBe('تم نقل ملكية')
  })

  it('prefers ownership transfer over suspended', () => {
    expect(
      installmentStatusLabel('pending', '2026-01-01', {
        is_suspended: true,
        ownership_transferred_at: '2026-11-01T10:00:00Z',
      }),
    ).toBe('تم نقل ملكية')
  })
})

function isoOffset(days: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

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

  it('counts one shared service-combiner plan once', () => {
    const plan = {
      id: 9,
      sales_invoice_line_id: null,
      down_payment: 400,
      installment_count: 3,
      installment_amount: 200,
      items: [
        { id: 1, due_date: isoOffset(-10), amount: 200, paid_amount: 0, status: 'pending' as const },
        { id: 2, due_date: isoOffset(20), amount: 200, paid_amount: 0, status: 'pending' as const },
        { id: 3, due_date: isoOffset(50), amount: 150, paid_amount: 0, status: 'pending' as const },
      ],
    }
    const contract = invoice({
      total: 950,
      paid_amount: 0,
      balance_due: 550,
      payment_term: 'installment',
      installment_plan: plan,
      lines: [325, 150, 150, 325].map((price, index) => ({
        id: index + 1,
        unit_price: price,
        line_total: price,
        payment_term: 'installment' as const,
        service_id: index + 1,
      })),
    })

    const summary = buildContractSummary(contract)
    const ledger = reconcileContractLedger(contract)

    expect(summary.downPayment).toBe(400)
    expect(summary.installmentCount).toBe(3)
    expect(getInstallmentItems(contract)).toHaveLength(3)
    expect(ledger.confirmedOutstanding).toBe(550)
    expect(ledger.confirmedOverdue).toBe(200)
  })

  it('keeps the cash partial down payment visible with the deferred schedule', () => {
    const contract = invoice({
      payment_term: 'cash',
      total: 6800,
      paid_amount: 3000,
      balance_due: 3800,
      lines: [
        {
          id: 1,
          unit_price: 6800,
          line_total: 6800,
          payment_term: 'cash',
          cash_schedule: 'month_2',
          installment_plan: {
            id: 4,
            sales_invoice_line_id: 1,
            down_payment: 3000,
            installment_count: 2,
            items: [
              { id: 41, due_date: '2026-12-14', amount: 1900, paid_amount: 0, status: 'pending' },
              { id: 42, due_date: '2027-01-14', amount: 1900, paid_amount: 0, status: 'pending' },
            ],
          },
        },
      ],
    })

    const summary = buildContractSummary(contract)

    expect(summary.downPayment).toBe(3000)
    expect(summary.installmentCount).toBe(2)
  })

  it('still adds separate per-line installment plans', () => {
    const contract = invoice({
      payment_term: 'installment',
      lines: [
        {
          id: 1,
          unit_price: 400,
          line_total: 400,
          payment_term: 'installment',
          installment_plan: {
            id: 1,
            sales_invoice_line_id: 1,
            down_payment: 80,
            installment_count: 2,
            items: [
              { id: 11, due_date: isoOffset(10), amount: 160, paid_amount: 0, status: 'pending' },
              { id: 12, due_date: isoOffset(40), amount: 160, paid_amount: 0, status: 'pending' },
            ],
          },
        },
        {
          id: 2,
          unit_price: 600,
          line_total: 600,
          payment_term: 'installment',
          installment_plan: {
            id: 2,
            sales_invoice_line_id: 2,
            down_payment: 100,
            installment_count: 2,
            items: [
              { id: 21, due_date: isoOffset(10), amount: 250, paid_amount: 0, status: 'pending' },
              { id: 22, due_date: isoOffset(40), amount: 250, paid_amount: 0, status: 'pending' },
            ],
          },
        },
      ],
    })

    const summary = buildContractSummary(contract)

    expect(summary.downPayment).toBe(180)
    expect(summary.installmentCount).toBe(4)
    expect(getInstallmentItems(contract)).toHaveLength(4)
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
