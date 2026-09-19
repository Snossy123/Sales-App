import { describe, expect, it } from 'vitest'
import {
  computeContractStats,
  contractFilterTier,
  filterInstallmentCollectionRows,
  filterRowsByContractTier,
  firstDueStatus,
  getCurrentInstallment,
  rowRemaining,
  tierSortOrder,
  type InstallmentCollectionRow,
} from './collectionHelpers'

function makeRow(overrides: Partial<InstallmentCollectionRow> & { id: number }): InstallmentCollectionRow {
  return {
    due_date: '2026-06-01',
    amount: 1000,
    paid_amount: 0,
    status: 'pending',
    ...overrides,
  }
}

describe('collectionHelpers', () => {
  it('computes remaining from remaining, total_due, or amount minus paid', () => {
    expect(rowRemaining(makeRow({ id: 1, remaining: 250 }))).toBe(250)
    expect(rowRemaining(makeRow({ id: 2, total_due: 400 }))).toBe(400)
    expect(rowRemaining(makeRow({ id: 3, amount: 1000, paid_amount: 350 }))).toBe(650)
  })

  it('picks the current unpaid installment by sequence and skips paid or suspended', () => {
    const current = getCurrentInstallment([
      makeRow({ id: 1, sequence: 2, status: 'pending', due_date: '2026-08-01' }),
      makeRow({ id: 2, sequence: 1, status: 'paid' }),
      makeRow({ id: 3, sequence: 3, status: 'pending', is_suspended: true }),
      makeRow({ id: 4, sequence: 1, installment_number: 1, status: 'pending', due_date: '2026-07-01' }),
    ])

    expect(current?.id).toBe(4)
  })

  it('classifies contract filter tiers', () => {
    expect(
      contractFilterTier([
        makeRow({ id: 1, status: 'pending', is_suspended: true }),
        makeRow({ id: 2, status: 'pending', suspended_at: '2026-05-01' }),
      ]),
    ).toBe('suspended')

    expect(
      contractFilterTier([
        makeRow({ id: 1, status: 'paid' }),
        makeRow({ id: 2, status: 'pending', display_tier: 'overdue' }),
      ]),
    ).toBe('overdue')

    expect(
      contractFilterTier([makeRow({ id: 1, status: 'pending', display_tier: 'grace' })]),
    ).toBe('due_soon')

    expect(
      contractFilterTier([makeRow({ id: 1, status: 'pending', display_tier: 'upcoming' })]),
    ).toBe('due_soon')
  })

  it('filters rows to matching contract tiers', () => {
    const rows = [
      makeRow({ id: 1, sales_invoice_id: 10, status: 'pending', display_tier: 'overdue' }),
      makeRow({ id: 2, sales_invoice_id: 20, status: 'pending', display_tier: 'upcoming' }),
    ]

    expect(filterRowsByContractTier(rows, 'all')).toHaveLength(2)
    expect(filterRowsByContractTier(rows, 'overdue').map((row) => row.id)).toEqual([1])
    expect(filterRowsByContractTier(rows, 'due_soon').map((row) => row.id)).toEqual([2])
  })

  it('searches collection rows by name and phone with spaces', () => {
    const rows = [
      makeRow({
        id: 1,
        customer_name: 'أحمد علي',
        customer_phone: '010 1234 5678',
        invoice_number: 'INV-9',
      }),
      makeRow({ id: 2, customer_name: 'سارة', customer_phone: '01100000000' }),
    ]

    expect(filterInstallmentCollectionRows(rows, 'أحمد').map((row) => row.id)).toEqual([1])
    expect(filterInstallmentCollectionRows(rows, '01012345678').map((row) => row.id)).toEqual([1])
    expect(filterInstallmentCollectionRows(rows, '  ').map((row) => row.id)).toEqual([1, 2])
  })

  it('computes unpaid contract stats by invoice', () => {
    const stats = computeContractStats([
      makeRow({ id: 1, sales_invoice_id: 10, status: 'pending', display_tier: 'overdue' }),
      makeRow({ id: 2, sales_invoice_id: 10, status: 'pending', display_tier: 'upcoming' }),
      makeRow({ id: 3, sales_invoice_id: 20, status: 'pending', display_tier: 'grace' }),
      makeRow({ id: 4, sales_invoice_id: 30, status: 'paid', display_tier: 'overdue' }),
    ])

    expect(stats).toEqual({
      total_contracts: 2,
      overdue_contracts: 1,
      due_soon_contracts: 1,
    })
  })

  it('classifies first due installment as upcoming, due, or overdue', () => {
    const today = '2026-09-19'

    expect(firstDueStatus(makeRow({ id: 1, due_date: '2026-09-20', display_tier: 'upcoming' }), today)).toBe(
      'upcoming',
    )
    expect(firstDueStatus(makeRow({ id: 2, due_date: '2026-09-19', display_tier: 'upcoming' }), today)).toBe('due')
    expect(firstDueStatus(makeRow({ id: 3, due_date: '2026-09-18', display_tier: 'grace' }), today)).toBe('due')
    expect(firstDueStatus(makeRow({ id: 4, due_date: '2026-09-01', display_tier: 'overdue' }), today)).toBe(
      'overdue',
    )
  })

  it('orders display tiers for sorting', () => {
    expect(tierSortOrder('overdue')).toBe(0)
    expect(tierSortOrder('grace')).toBe(1)
    expect(tierSortOrder('upcoming')).toBe(2)
    expect(tierSortOrder('suspended')).toBe(4)
    expect(tierSortOrder('other')).toBe(3)
  })
})
