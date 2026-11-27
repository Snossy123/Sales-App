import { describe, expect, it } from 'vitest'
import { allocateOwnershipTransferFeePlans } from './ownershipTransferFeePlans'

describe('allocateOwnershipTransferFeePlans', () => {
  it('splits shared down payment proportionally across ownership + subscription (screenshot case)', () => {
    const lines = allocateOwnershipTransferFeePlans({
      fees: { ownership: 1000, subscription: 1150 },
      includeDisassemblyAndAssembly: false,
      paymentTerm: 'installment',
      downPayment: 1150,
      installmentCount: 4,
      intervalType: 'weekly',
      firstDueDate: '2026-12-04',
    })

    expect(lines).toHaveLength(2)

    const ownership = lines.find((l) => l.key === 'ownership')!
    const subscription = lines.find((l) => l.key === 'subscription')!

    expect(ownership.amount).toBe(1000)
    expect(subscription.amount).toBe(1150)

    expect(ownership.downPayment ?? 0).toBeLessThanOrEqual(ownership.amount)
    expect(subscription.downPayment ?? 0).toBeLessThanOrEqual(subscription.amount)

    const totalDown =
      (ownership.downPayment ?? 0) + (subscription.downPayment ?? 0)
    expect(totalDown).toBeCloseTo(1150, 2)

    const financedLines = [ownership, subscription].filter(
      (l) => l.paymentTerm === 'installment',
    )
    expect(financedLines.length).toBeGreaterThan(0)

    for (const line of financedLines) {
      expect(line.installmentPlan).toBeDefined()
      const plan = line.installmentPlan!
      const financed = line.amount - (line.downPayment ?? 0)
      expect(financed).toBeGreaterThan(0.009)
      expect(plan.down_payment).toBe(line.downPayment)
      expect(plan.installment_count).toBe(4)
      expect(plan.interval_type).toBe('weekly')
      expect(plan.interval_days).toBe(7)
      expect(plan.first_due_date).toBe('2026-12-04')
      expect(plan.installment_amount).toBeCloseTo(financed / 4, 2)
    }

    const totalFinanced = financedLines.reduce(
      (sum, l) => sum + (l.amount - (l.downPayment ?? 0)),
      0,
    )
    expect(totalFinanced).toBeCloseTo(1000, 2)
  })

  it('keeps full down on ownership-only installment line', () => {
    const lines = allocateOwnershipTransferFeePlans({
      fees: { ownership: 1000, subscription: 0 },
      includeDisassemblyAndAssembly: false,
      paymentTerm: 'installment',
      downPayment: 400,
      installmentCount: 3,
      intervalType: 'monthly',
      firstDueDate: '2026-12-01',
    })

    expect(lines).toHaveLength(1)
    const ownership = lines[0]
    expect(ownership.key).toBe('ownership')
    expect(ownership.paymentTerm).toBe('installment')
    expect(ownership.downPayment).toBe(400)
    expect(ownership.installmentPlan).toMatchObject({
      down_payment: 400,
      installment_count: 3,
      installment_amount: 200,
      interval_type: 'monthly',
      interval_days: 30,
      first_due_date: '2026-12-01',
    })
  })

  it('uses cash when a line is fully covered by its share of down payment', () => {
    const lines = allocateOwnershipTransferFeePlans({
      fees: { ownership: 1000, subscription: 1150 },
      includeDisassemblyAndAssembly: false,
      paymentTerm: 'installment',
      downPayment: 2150,
      installmentCount: 4,
      intervalType: 'weekly',
      firstDueDate: '2026-12-04',
    })

    expect(lines.every((l) => l.paymentTerm === 'cash')).toBe(true)
    expect(lines.every((l) => l.installmentPlan === undefined)).toBe(true)
  })

  it('finances each disassembly fee line fully with zero down (legacy path)', () => {
    const lines = allocateOwnershipTransferFeePlans({
      fees: {
        ownership: 1000,
        subscription: 0,
        uninstall: 200,
        installation: 300,
      },
      includeDisassemblyAndAssembly: true,
      paymentTerm: 'installment',
      downPayment: 500,
      installmentCount: 2,
      intervalType: 'monthly',
      firstDueDate: '2026-12-01',
    })

    expect(lines.map((l) => l.key)).toEqual([
      'ownership',
      'uninstall',
      'installation',
    ])

    for (const line of lines) {
      expect(line.paymentTerm).toBe('installment')
      expect(line.downPayment).toBe(0)
      expect(line.installmentPlan).toMatchObject({
        down_payment: 0,
        installment_count: 2,
        installment_amount: Math.round((line.amount / 2) * 100) / 100,
      })
    }
  })

  it('returns cash lines when payment term is cash', () => {
    const lines = allocateOwnershipTransferFeePlans({
      fees: { ownership: 1000, subscription: 1150 },
      includeDisassemblyAndAssembly: false,
      paymentTerm: 'cash',
      downPayment: 0,
      installmentCount: 4,
      intervalType: 'weekly',
      firstDueDate: '2026-12-04',
    })

    expect(lines).toHaveLength(2)
    expect(lines.every((l) => l.paymentTerm === 'cash')).toBe(true)
    expect(lines.every((l) => l.installmentPlan === undefined)).toBe(true)
  })
})
