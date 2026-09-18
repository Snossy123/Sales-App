import { describe, expect, it } from 'vitest'
import type { InstallmentItem, InstallmentPlan, SalesInvoice, SalesInvoiceLine } from '../api/types'
import { displayPersonName, lineFinancialSummary } from './contractFields'

describe('displayPersonName', () => {
  it('keeps the first two words of a full name', () => {
    expect(displayPersonName('أحمد محمد علي')).toBe('أحمد محمد')
    expect(displayPersonName('  سارة  ')).toBe('سارة')
    expect(displayPersonName(null)).toBe('')
  })
})

function makeItem(
  id: number,
  amount: number,
  paidAmount: number,
): InstallmentItem {
  return {
    id,
    due_date: '2026-10-01',
    amount,
    paid_amount: paidAmount,
    status: paidAmount >= amount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
  }
}

function makePlan(
  id: number,
  lineId: number | null,
  downPayment: number,
  items: InstallmentItem[],
): InstallmentPlan {
  return {
    id,
    sales_invoice_line_id: lineId,
    down_payment: downPayment,
    installment_count: items.length,
    items,
  }
}

function makeLine(
  id: number,
  lineTotal: number,
  paymentTerm: 'cash' | 'installment',
  plan?: InstallmentPlan,
): SalesInvoiceLine {
  return {
    id,
    unit_price: lineTotal,
    line_total: lineTotal,
    payment_term: paymentTerm,
    installment_plan: plan ?? null,
  }
}

function makeInvoice(lines: SalesInvoiceLine[], extras: Partial<SalesInvoice> = {}): SalesInvoice {
  const total = lines.reduce((sum, line) => sum + Number(line.line_total ?? 0), 0)
  return {
    id: 1,
    invoice_date: '2026-09-01',
    total,
    paid_amount: extras.paid_amount ?? 0,
    balance_due: extras.balance_due ?? total,
    payment_term: extras.payment_term ?? 'installment',
    payment_status: extras.payment_status ?? 'unpaid',
    customer_id: 10,
    lines,
    ...extras,
  }
}

describe('lineFinancialSummary', () => {
  it('uses the printed line remaining, not the invoice balance_due of all devices', () => {
    const lineA = makeLine(
      1,
      5000,
      'installment',
      makePlan(11, 1, 1000, [makeItem(101, 2000, 0), makeItem(102, 2000, 0)]),
    )
    const lineB = makeLine(
      2,
      7000,
      'installment',
      makePlan(12, 2, 1000, [makeItem(201, 3000, 0), makeItem(202, 3000, 0)]),
    )
    const invoice = makeInvoice([lineA, lineB], {
      paid_amount: 2000,
      balance_due: 10000,
    })

    const summaryA = lineFinancialSummary(lineA, invoice)
    expect(summaryA.balance).toBe(4000)
    expect(summaryA.paid).toBe(1000)
    expect(summaryA.balance).not.toBe(Number(invoice.balance_due))

    const summaryB = lineFinancialSummary(lineB, invoice)
    expect(summaryB.balance).toBe(6000)
    expect(summaryB.paid).toBe(1000)
  })

  it('reduces remaining only for the line whose installments were paid', () => {
    const lineA = makeLine(
      1,
      5000,
      'installment',
      makePlan(11, 1, 1000, [makeItem(101, 2000, 500), makeItem(102, 2000, 0)]),
    )
    const lineB = makeLine(
      2,
      7000,
      'installment',
      makePlan(12, 2, 1000, [makeItem(201, 3000, 0), makeItem(202, 3000, 0)]),
    )
    const invoice = makeInvoice([lineA, lineB], {
      paid_amount: 2500,
      balance_due: 9500,
    })

    expect(lineFinancialSummary(lineA, invoice)).toMatchObject({
      paid: 1500,
      balance: 3500,
    })
    expect(lineFinancialSummary(lineB, invoice)).toMatchObject({
      paid: 1000,
      balance: 6000,
    })
  })

  it('sets remaining to 0 for immediate cash lines', () => {
    const line = makeLine(1, 4000, 'cash')
    const invoice = makeInvoice([line], {
      payment_term: 'cash',
      paid_amount: 4000,
      balance_due: 0,
    })

    expect(lineFinancialSummary(line, invoice)).toMatchObject({
      paid: 4000,
      balance: 0,
    })
  })

  it('keeps invoice remaining when the plan is invoice-level', () => {
    const line = makeLine(1, 5000, 'installment')
    const invoicePlan = makePlan(99, null, 1500, [
      makeItem(1, 1750, 0),
      makeItem(2, 1750, 0),
    ])
    const invoice = makeInvoice([line, makeLine(2, 3000, 'installment')], {
      paid_amount: 1500,
      balance_due: 6500,
      installment_plan: invoicePlan,
    })

    expect(lineFinancialSummary(line, invoice)).toMatchObject({
      paid: 1500,
      balance: 6500,
    })
  })
})
