import { describe, expect, it } from 'vitest'
import { allocateOwnershipTransferFeePlans } from './ownershipTransferFeePlans'

describe('allocateOwnershipTransferFeePlans', () => {
  it('builds one shared plan on total fees (screenshot: 450+150+150 → 3×250)', () => {
    const result = allocateOwnershipTransferFeePlans({
      fees: { ownership: 450, uninstall: 150, installation: 150 },
      includeDisassemblyAndAssembly: true,
      paymentTerm: 'installment',
      downPayment: 0,
      installmentCount: 3,
      intervalType: 'monthly',
      firstDueDate: '2026-11-28',
    })

    expect(result.feesTotal).toBe(750)
    expect(result.lines).toHaveLength(3)
    expect(result.lines.every((l) => l.paymentTerm === 'installment')).toBe(true)
    expect(result.lines.every((l) => l.installmentPlan === undefined)).toBe(true)
    expect(result.sharedInstallmentPlan).toMatchObject({
      down_payment: 0,
      installment_count: 3,
      installment_amount: 250,
      interval_type: 'monthly',
      interval_days: 30,
      first_due_date: '2026-11-28',
    })
  })

  it('applies shared down payment once against total (1150 down on 450+1700)', () => {
    const result = allocateOwnershipTransferFeePlans({
      fees: { ownership: 450, subscription: 1700 },
      includeDisassemblyAndAssembly: false,
      paymentTerm: 'installment',
      downPayment: 1150,
      installmentCount: 4,
      intervalType: 'weekly',
      firstDueDate: '2026-12-04',
    })

    expect(result.lines).toHaveLength(2)
    expect(result.lines.map((l) => l.key)).toEqual(['ownership', 'subscription'])
    expect(result.sharedInstallmentPlan).toMatchObject({
      down_payment: 1150,
      installment_count: 4,
      installment_amount: 250,
      interval_type: 'weekly',
      interval_days: 7,
      first_due_date: '2026-12-04',
    })
  })

  it('keeps ownership-only installment on that single line total', () => {
    const result = allocateOwnershipTransferFeePlans({
      fees: { ownership: 1000, subscription: 0 },
      includeDisassemblyAndAssembly: false,
      paymentTerm: 'installment',
      downPayment: 400,
      installmentCount: 3,
      intervalType: 'monthly',
      firstDueDate: '2026-12-01',
    })

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].key).toBe('ownership')
    expect(result.sharedInstallmentPlan).toMatchObject({
      down_payment: 400,
      installment_count: 3,
      installment_amount: 200,
    })
  })

  it('uses cash lines when down payment covers all fee lines', () => {
    const result = allocateOwnershipTransferFeePlans({
      fees: { ownership: 1000, subscription: 1150 },
      includeDisassemblyAndAssembly: false,
      paymentTerm: 'installment',
      downPayment: 2150,
      installmentCount: 4,
      intervalType: 'weekly',
      firstDueDate: '2026-12-04',
    })

    expect(result.lines.every((l) => l.paymentTerm === 'cash')).toBe(true)
    expect(result.sharedInstallmentPlan).toBeNull()
  })

  it('keeps separate fee lines for ownership + disassembly with one shared plan', () => {
    const result = allocateOwnershipTransferFeePlans({
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

    expect(result.lines.map((l) => l.key)).toEqual([
      'ownership',
      'uninstall',
      'installation',
    ])
    expect(result.feesTotal).toBe(1500)
    expect(result.sharedInstallmentPlan).toMatchObject({
      down_payment: 500,
      installment_count: 2,
      installment_amount: 500,
    })
  })

  it('returns cash lines when payment term is cash', () => {
    const result = allocateOwnershipTransferFeePlans({
      fees: { ownership: 1000, subscription: 1150 },
      includeDisassemblyAndAssembly: false,
      paymentTerm: 'cash',
      downPayment: 0,
      installmentCount: 4,
      intervalType: 'weekly',
      firstDueDate: '2026-12-04',
    })

    expect(result.lines).toHaveLength(2)
    expect(result.lines.every((l) => l.paymentTerm === 'cash')).toBe(true)
    expect(result.sharedInstallmentPlan).toBeNull()
  })
})
