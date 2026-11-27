import { describe, expect, it } from 'vitest'
import { allocateOwnershipTransferFeePlans } from './ownershipTransferFeePlans'

describe('allocateOwnershipTransferFeePlans', () => {
  it('applies down payment waterfall so only one line carries 4 x 250 (screenshot case)', () => {
    const lines = allocateOwnershipTransferFeePlans({
      fees: { ownership: 450, subscription: 1700 },
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

    expect(ownership.paymentTerm).toBe('cash')
    expect(ownership.installmentPlan).toBeUndefined()

    expect(subscription.paymentTerm).toBe('installment')
    expect(subscription.downPayment).toBe(700)
    expect(subscription.installmentPlan).toMatchObject({
      down_payment: 700,
      installment_count: 4,
      installment_amount: 250,
      interval_type: 'weekly',
      interval_days: 7,
      first_due_date: '2026-12-04',
    })
  })

  it('waterfalls older ownership+subscription totals the same way (1000 + 1150)', () => {
    const lines = allocateOwnershipTransferFeePlans({
      fees: { ownership: 1000, subscription: 1150 },
      includeDisassemblyAndAssembly: false,
      paymentTerm: 'installment',
      downPayment: 1150,
      installmentCount: 4,
      intervalType: 'weekly',
      firstDueDate: '2026-12-04',
    })

    const ownership = lines.find((l) => l.key === 'ownership')!
    const subscription = lines.find((l) => l.key === 'subscription')!

    expect(ownership.paymentTerm).toBe('cash')
    expect(subscription.paymentTerm).toBe('installment')
    expect(subscription.downPayment).toBe(150)
    expect(subscription.installmentPlan?.installment_amount).toBe(250)
    expect(subscription.installmentPlan?.installment_count).toBe(4)
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

  it('uses cash when down payment covers all fee lines', () => {
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

  it('waterfalls shared down across ownership + disassembly fees', () => {
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

    const ownership = lines[0]
    expect(ownership.paymentTerm).toBe('installment')
    expect(ownership.downPayment).toBe(500)
    expect(ownership.installmentPlan).toMatchObject({
      down_payment: 500,
      installment_count: 2,
      installment_amount: 250,
    })

    expect(lines[1].paymentTerm).toBe('installment')
    expect(lines[1].downPayment).toBe(0)
    expect(lines[1].installmentPlan?.installment_amount).toBe(100)

    expect(lines[2].paymentTerm).toBe('installment')
    expect(lines[2].downPayment).toBe(0)
    expect(lines[2].installmentPlan?.installment_amount).toBe(150)
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
