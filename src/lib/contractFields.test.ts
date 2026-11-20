import { describe, expect, it } from 'vitest'
import type { InstallmentItem, InstallmentPlan, SalesInvoice, SalesInvoiceLine } from '../api/types'
import {
  buildInstallmentRows,
  cashReviewRows,
  contractPaymentSummary,
  displayPersonName,
  installmentTableColumnCount,
  lineFinancialSummary,
  linePaymentDisplay,
  planIsSharedAcrossLines,
} from './contractFields'

describe('displayPersonName', () => {
  it('keeps the first two words of a full name', () => {
    expect(displayPersonName('أحمد محمد علي')).toBe('أحمد محمد')
    expect(displayPersonName('  سارة  ')).toBe('سارة')
    expect(displayPersonName(null)).toBe('')
  })
})

describe('installment table sizing', () => {
  it('uses one column per 12 installments, up to three columns', () => {
    expect(installmentTableColumnCount(12)).toBe(1)
    expect(installmentTableColumnCount(13)).toBe(2)
    expect(installmentTableColumnCount(24)).toBe(2)
    expect(installmentTableColumnCount(25)).toBe(3)
    expect(installmentTableColumnCount(36)).toBe(3)
  })

  it.each([
    [12, 12],
    [13, 24],
    [24, 24],
    [25, 36],
    [36, 36],
  ])('builds a %i-installment plan with one row per installment', (count) => {
    const plan: InstallmentPlan = {
      id: 1,
      sales_invoice_line_id: 1,
      down_payment: 0,
      installment_count: count,
      items: [],
    }
    const line = makeLine(1, 36000, 'installment', plan)

    expect(buildInstallmentRows(line, makeInvoice([line]))).toHaveLength(count)
  })

  it('prints due and paid dates as day/month/year', () => {
    const item = makeItem(101, 2000, 2000)
    item.installment_number = 1
    item.paid_at = '2026-10-15'
    const plan = makePlan(11, 1, 0, [item])
    const line = makeLine(1, 2000, 'installment', plan)
    const [row] = buildInstallmentRows(line, makeInvoice([line]))

    expect(row?.due).toBe('1/10/2026')
    expect(row?.paid).toBe('15/10/2026')
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

describe('linePaymentDisplay', () => {
  it('shows immediate cash without a down payment', () => {
    const line = makeLine(1, 6800, 'cash')
    line.cash_schedule = 'immediate'
    const display = linePaymentDisplay(line, makeInvoice([line], { payment_term: 'cash' }))

    expect(display.scheduleLabel).toBe('فوري')
    expect(display.showDownPayment).toBe(false)
    expect(display.remainder).toBe(0)
    expect(display.paymentsLabel).toBeNull()
  })

  it('shows a partial cash down payment with the month count and later payments', () => {
    const plan = makePlan(4, 1, 3000, [makeItem(1, 1900, 0), makeItem(2, 1900, 0)])
    plan.first_due_date = '2026-10-19'
    const line = makeLine(1, 6800, 'cash', plan)
    line.cash_schedule = 'month_2'
    const display = linePaymentDisplay(line, makeInvoice([line], { payment_term: 'cash' }))

    expect(display.scheduleLabel).toBe('شهرين')
    expect(display.showDownPayment).toBe(true)
    expect(display.downPayment).toBe(3000)
    expect(display.remainder).toBe(3800)
    expect(display.paymentsLabel).toContain('1,900 ج')
    expect(display.paymentsLabel).toContain('2026/10/01')
  })

  it('hides a zero cash down payment and still names a one-month schedule', () => {
    const plan = makePlan(5, 1, 0, [])
    plan.installment_count = 1
    plan.first_due_date = '2026-10-19'
    const line = makeLine(1, 6800, 'cash', plan)
    line.cash_schedule = 'month_1'
    const display = linePaymentDisplay(line, makeInvoice([line], { payment_term: 'cash' }))

    expect(display.scheduleLabel).toBe('شهر')
    expect(display.showDownPayment).toBe(false)
    expect(display.remainder).toBe(6800)
    expect(display.paymentsLabel).toBe('دفعة واحدة، أول استحقاق 2026/10/19')
  })

  it('keeps the installment down payment even when it is zero', () => {
    const line = makeLine(1, 6800, 'installment', makePlan(6, 1, 0, []))
    const display = linePaymentDisplay(line, makeInvoice([line]))

    expect(display.isCash).toBe(false)
    expect(display.showDownPayment).toBe(true)
    expect(display.scheduleLabel).toBeNull()
    expect(display.payments).toEqual([])
  })

  it('dates a two-month cash schedule from the contract date when no payments are stored', () => {
    const plan = makePlan(7, 1, 3000, [])
    const line = makeLine(1, 6800, 'cash', plan)
    line.cash_schedule = 'month_2'
    const display = linePaymentDisplay(
      line,
      makeInvoice([line], { payment_term: 'cash', invoice_date: '2026-09-19' }),
    )

    expect(display.payments).toEqual([
      { amount: 1900, dueDate: '2026-10-19' },
      { amount: 1900, dueDate: '2026-11-19' },
    ])
  })

  it('uses stored cash payments instead of deriving dates', () => {
    const plan = makePlan(8, 1, 0, [makeItem(1, 1500, 0), makeItem(2, 2300, 0)])
    plan.custom_schedule = [
      { amount: 1500, due_date: '2026-12-01' },
      { amount: 2300, due_date: '2027-01-01' },
    ]
    const line = makeLine(1, 3800, 'cash', plan)
    line.cash_schedule = 'custom'
    const display = linePaymentDisplay(line, makeInvoice([line], { payment_term: 'cash' }))

    expect(display.payments).toEqual([
      { amount: 1500, dueDate: '2026-12-01' },
      { amount: 2300, dueDate: '2027-01-01' },
    ])
  })

  it('lists no cash dates for immediate cash', () => {
    const line = makeLine(1, 1000, 'cash')
    line.cash_schedule = 'immediate'
    const display = linePaymentDisplay(line, makeInvoice([line], { payment_term: 'cash' }))

    expect(display.payments).toEqual([])
  })
})

describe('cashReviewRows', () => {
  it('summarizes one deferred cash line for the review panel', () => {
    const plan = makePlan(4, 1, 3000, [])
    plan.installment_count = 3
    plan.first_due_date = '2026-10-19'
    const line = makeLine(1, 6800, 'cash', plan)
    line.cash_schedule = 'month_3'
    const rows = cashReviewRows(makeInvoice([line], { payment_term: 'cash' }))

    expect(rows).toEqual([
      { label: 'موعد الكاش', value: '3 شهور' },
      { label: 'المقدم', value: '3,000 ج' },
      { label: 'المتبقي بعد المقدم', value: '3,800 ج' },
    ])
  })

  it('counts a shared plan once when two lines resolve it', () => {
    const plan = makePlan(9, null, 1000, [])
    plan.installment_count = 1
    plan.first_due_date = '2026-10-19'
    const lineA = makeLine(1, 4000, 'cash')
    const lineB = makeLine(2, 4000, 'cash')
    lineA.cash_schedule = 'month_1'
    lineB.cash_schedule = 'month_1'
    const invoice = makeInvoice([lineA, lineB], {
      payment_term: 'cash',
      installment_plan: plan,
    })

    const rows = cashReviewRows(invoice)
    expect(rows.find((row) => row.label === 'المقدم')?.value).toBe('1,000 ج')
  })
})

function installmentPlan(
  id: number,
  lineId: number,
  amount: number,
): InstallmentPlan {
  return {
    id,
    sales_invoice_line_id: lineId,
    down_payment: 0,
    installment_count: 4,
    installment_amount: amount,
    interval_type: 'monthly',
    items: [],
  }
}

describe('planIsSharedAcrossLines', () => {
  it('does not assign a contract-level plan to one service line', () => {
    const plan = makePlan(9, null, 400, [])
    const invoice = makeInvoice([
      makeLine(1, 325, 'installment'),
      makeLine(2, 150, 'installment'),
      makeLine(3, 150, 'installment'),
      makeLine(4, 325, 'installment'),
    ], { installment_plan: plan })

    expect(planIsSharedAcrossLines(plan, invoice)).toBe(true)
  })

  it('keeps a line-owned plan on that line', () => {
    const plan = makePlan(9, 1, 80, [])
    const invoice = makeInvoice([
      makeLine(1, 400, 'installment', plan),
      makeLine(2, 600, 'installment', makePlan(10, 2, 100, [])),
    ])

    expect(planIsSharedAcrossLines(plan, invoice)).toBe(false)
  })
})

describe('contractPaymentSummary', () => {
  it('shows one installment plan in the header when every line matches', () => {
    const lineA = makeLine(1, 1300, 'installment', installmentPlan(1, 1, 325))
    const lineB = makeLine(2, 1300, 'installment', installmentPlan(2, 2, 325))
    const summary = contractPaymentSummary(makeInvoice([lineA, lineB]))

    expect(summary.uniform).toBe(true)
    expect(summary.headerFields).toEqual([
      { label: 'طريقة الدفع', value: 'تقسيط' },
      { label: 'المقدم', value: '0 ج لكل بند' },
      { label: 'الأقساط', value: '4 قسط — شهري' },
      { label: 'قيمة القسط', value: '325 ج لكل بند' },
    ])
  })

  it('marks the contract mixed when one line is immediate cash and another is deferred', () => {
    const immediate = makeLine(1, 1000, 'cash')
    immediate.cash_schedule = 'immediate'
    const deferred = makeLine(2, 1000, 'cash')
    deferred.cash_schedule = 'month_1'
    const summary = contractPaymentSummary(
      makeInvoice([immediate, deferred], { payment_term: 'cash' }),
    )

    expect(summary.uniform).toBe(false)
    expect(summary.headerFields).toEqual([{ label: 'طريقة الدفع', value: 'متعددة' }])
  })

  it('marks the contract mixed when installment amounts differ', () => {
    const lineA = makeLine(1, 1300, 'installment', installmentPlan(1, 1, 325))
    const lineB = makeLine(2, 1600, 'installment', installmentPlan(2, 2, 400))
    const summary = contractPaymentSummary(makeInvoice([lineA, lineB]))

    expect(summary.uniform).toBe(false)
    expect(summary.headerFields).toEqual([{ label: 'طريقة الدفع', value: 'متعددة' }])
    expect(summary.lineDetails[1]).toContain('325 ج')
    expect(summary.lineDetails[2]).toContain('400 ج')
  })

  it('leaves cash details off the header because the device card lists them', () => {
    const line = makeLine(1, 6800, 'cash', makePlan(7, 1, 3000, []))
    line.cash_schedule = 'month_2'
    const summary = contractPaymentSummary(
      makeInvoice([line], { payment_term: 'cash', invoice_date: '2026-09-19' }),
    )

    expect(summary.uniform).toBe(true)
    expect(summary.headerFields).toEqual([])
  })
})
