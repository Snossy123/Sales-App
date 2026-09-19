import { describe, expect, it } from 'vitest'
import {
  buildCollectionFollowUpPayload,
  computeContractStats,
  contractFilterTier,
  filterInstallmentCollectionRows,
  filterRowsByContractTier,
  filterRowsWithFutureReminder,
  filterRowsWithParkedFollowUp,
  filterRowsWithoutFutureReminder,
  filterRowsWithoutParkedFollowUp,
  hasCollectionFollowUpDraft,
  hasFutureCollectionReminder,
  firstDueStatus,
  getCurrentInstallment,
  previewExcessAllocation,
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

  it('previews excess allocation across following installments', () => {
    const selected = makeRow({
      id: 1,
      sales_invoice_id: 10,
      sequence: 1,
      total_due: 100,
      remaining: 100,
    })
    const preview = previewExcessAllocation(selected, 250, [
      selected,
      makeRow({ id: 2, sales_invoice_id: 10, sequence: 2, total_due: 200, remaining: 200 }),
      makeRow({ id: 3, sales_invoice_id: 10, sequence: 3, total_due: 200, remaining: 200 }),
      makeRow({ id: 4, sales_invoice_id: 11, sequence: 2, total_due: 200 }),
    ])

    expect(preview).toEqual([
      { installmentId: 1, sequence: 1, amount: 100, remainingAfter: 0 },
      { installmentId: 2, sequence: 2, amount: 150, remainingAfter: 50 },
    ])
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
    ).toBe('upcoming')

    expect(
      contractFilterTier([
        makeRow({ id: 1, status: 'paid' }),
        makeRow({ id: 2, status: 'pending', display_tier: 'overdue' }),
      ]),
    ).toBe('overdue')

    expect(
      contractFilterTier(
        [makeRow({ id: 1, status: 'pending', display_tier: 'grace', due_date: '2026-09-19' })],
        '2026-09-19',
      ),
    ).toBe('due_soon')

    expect(
      contractFilterTier(
        [makeRow({ id: 1, status: 'pending', display_tier: 'upcoming', due_date: '2026-10-01' })],
        '2026-09-19',
      ),
    ).toBe('upcoming')
  })

  it('filters rows to matching contract tiers', () => {
    const rows = [
      makeRow({ id: 1, sales_invoice_id: 10, status: 'pending', display_tier: 'overdue' }),
      makeRow({
        id: 2,
        sales_invoice_id: 20,
        status: 'pending',
        display_tier: 'upcoming',
        due_date: '2026-10-01',
      }),
      makeRow({ id: 3, sales_invoice_id: 30, status: 'pending', display_tier: 'grace', due_date: '2026-09-19' }),
    ]

    expect(filterRowsByContractTier(rows, 'all', '2026-09-19')).toHaveLength(3)
    expect(filterRowsByContractTier(rows, 'overdue', '2026-09-19').map((row) => row.id)).toEqual([1])
    expect(filterRowsByContractTier(rows, 'due_soon', '2026-09-19').map((row) => row.id)).toEqual([3])
    expect(filterRowsByContractTier(rows, 'upcoming', '2026-09-19').map((row) => row.id)).toEqual([2])
  })

  it('filters contracts that have an open reconciliation', () => {
    const rows = [
      makeRow({ id: 1, sales_invoice_id: 10, status: 'pending', has_open_reconciliation: true }),
      makeRow({ id: 2, sales_invoice_id: 20, status: 'pending', display_tier: 'overdue' }),
    ]

    expect(filterRowsByContractTier(rows, 'open_reconciliation').map((row) => row.id)).toEqual([1])
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
      upcoming_contracts: 0,
    })
  })

  it('counts upcoming visible contracts separately from due and overdue', () => {
    const stats = computeContractStats(
      [
        makeRow({
          id: 1,
          sales_invoice_id: 10,
          status: 'pending',
          display_tier: 'upcoming',
          due_date: '2026-10-01',
        }),
        makeRow({ id: 2, sales_invoice_id: 20, status: 'pending', is_suspended: true }),
        makeRow({ id: 3, sales_invoice_id: 30, status: 'pending', display_tier: 'overdue' }),
      ],
      Date.now(),
      '2026-09-19',
    )

    expect(stats).toEqual({
      total_contracts: 3,
      overdue_contracts: 1,
      due_soon_contracts: 0,
      upcoming_contracts: 2,
    })
  })

  it('parks fully suspended contracts in the list but counts them as upcoming on the card', () => {
    const now = new Date('2026-09-19T12:00:00.000Z').getTime()
    const rows = [
      makeRow({ id: 1, sales_invoice_id: 10, status: 'pending', is_suspended: true }),
      makeRow({ id: 2, sales_invoice_id: 20, status: 'pending', display_tier: 'overdue' }),
    ]

    expect(filterRowsWithoutParkedFollowUp(rows, now).map((row) => row.id)).toEqual([2])
    expect(filterRowsWithParkedFollowUp(rows, now).map((row) => row.id)).toEqual([1])
    expect(computeContractStats(rows, now).upcoming_contracts).toBe(1)
    expect(computeContractStats(rows, now).total_contracts).toBe(2)
  })

  it('counts a future reminder as upcoming on the card and hides it from the list', () => {
    const now = new Date('2026-09-19T12:00:00.000Z').getTime()
    const future = '2026-09-20T10:00:00.000Z'
    const past = '2026-09-18T10:00:00.000Z'
    const rows = [
      makeRow({
        id: 1,
        sales_invoice_id: 10,
        status: 'pending',
        display_tier: 'overdue',
        collection_reminder_at: future,
      }),
      makeRow({
        id: 2,
        sales_invoice_id: 20,
        status: 'pending',
        display_tier: 'overdue',
        collection_reminder_at: past,
      }),
      makeRow({
        id: 3,
        sales_invoice_id: 30,
        status: 'pending',
        display_tier: 'grace',
      }),
    ]

    expect(hasFutureCollectionReminder([rows[0]], now)).toBe(true)
    expect(hasFutureCollectionReminder([rows[1]], now)).toBe(false)
    expect(filterRowsWithoutFutureReminder(rows, now).map((row) => row.id)).toEqual([2, 3])
    expect(filterRowsWithFutureReminder(rows, now).map((row) => row.id)).toEqual([1])

    const stats = computeContractStats(rows, now)
    expect(stats.total_contracts).toBe(3)
    expect(stats.overdue_contracts).toBe(1)
    expect(stats.due_soon_contracts).toBe(1)
    expect(stats.upcoming_contracts).toBe(1)
  })

  it('matches branch card totals: 6 = 2 overdue + 0 due + 4 upcoming', () => {
    const now = new Date('2026-09-19T12:00:00.000Z').getTime()
    const rows = [
      makeRow({ id: 1, sales_invoice_id: 1, status: 'pending', display_tier: 'overdue' }),
      makeRow({ id: 2, sales_invoice_id: 2, status: 'pending', display_tier: 'overdue' }),
      makeRow({
        id: 3,
        sales_invoice_id: 3,
        status: 'pending',
        display_tier: 'upcoming',
        due_date: '2026-10-01',
      }),
      makeRow({
        id: 4,
        sales_invoice_id: 4,
        status: 'pending',
        display_tier: 'overdue',
        collection_reminder_at: '2026-09-20T10:00:00.000Z',
      }),
      makeRow({ id: 5, sales_invoice_id: 5, status: 'pending', is_suspended: true }),
      makeRow({ id: 6, sales_invoice_id: 6, status: 'pending', suspended_at: '2026-09-01' }),
    ]

    expect(computeContractStats(rows, now, '2026-09-19')).toEqual({
      total_contracts: 6,
      overdue_contracts: 2,
      due_soon_contracts: 0,
      upcoming_contracts: 4,
    })
    expect(filterRowsWithoutParkedFollowUp(rows, now).map((row) => row.id)).toEqual([1, 2, 3])
  })

  it('builds a follow-up payload from filled fields only', () => {
    expect(
      buildCollectionFollowUpPayload({
        collectionStatus: '',
        collectionReminderAt: '',
        collectionNotes: '   ',
      }),
    ).toEqual({})
    expect(
      hasCollectionFollowUpDraft({
        collectionStatus: '',
        collectionReminderAt: '',
        collectionNotes: '   ',
      }),
    ).toBe(false)
    expect(
      buildCollectionFollowUpPayload({
        collectionStatus: 'responded',
        collectionReminderAt: '2026-09-20T10:00',
        collectionNotes: ' هاتف ',
      }),
    ).toEqual({
      collection_status: 'responded',
      collection_reminder_at: '2026-09-20T10:00',
      collection_notes: 'هاتف',
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
