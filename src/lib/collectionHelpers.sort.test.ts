import { describe, expect, it } from 'vitest'
import { groupInstallmentsByCustomerAndContract } from '../components/installments/InstallmentCollectionGroupedList'
import {
  compareContractCollection,
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

describe('collection sort helpers', () => {
  it('ranks overdue contracts before upcoming ones', () => {
    const overdue = [makeRow({ id: 1, display_tier: 'overdue', due_date: '2026-05-01' })]
    const upcoming = [makeRow({ id: 2, display_tier: 'upcoming', due_date: '2026-07-01' })]

    expect(compareContractCollection(overdue, upcoming)).toBeLessThan(0)
    expect(compareContractCollection(upcoming, overdue)).toBeGreaterThan(0)
  })

  it('ranks older due dates first within the same tier', () => {
    const older = [makeRow({ id: 1, display_tier: 'overdue', due_date: '2026-04-01' })]
    const newer = [makeRow({ id: 2, display_tier: 'overdue', due_date: '2026-05-15' })]

    expect(compareContractCollection(older, newer)).toBeLessThan(0)
  })

  it('ranks expired reminders before future reminders', () => {
    const expired = [
      makeRow({
        id: 1,
        display_tier: 'upcoming',
        due_date: '2026-07-01',
        collection_reminder_at: '2026-06-01T10:00:00.000Z',
      }),
    ]
    const future = [
      makeRow({
        id: 2,
        display_tier: 'upcoming',
        due_date: '2026-07-01',
        collection_reminder_at: '2026-08-01T10:00:00.000Z',
      }),
    ]

    expect(compareContractCollection(expired, future, 'reminder')).toBeLessThan(0)
  })

  it('puts customers with overdue contracts before due-only customers', () => {
    const rows: InstallmentCollectionRow[] = [
      makeRow({
        id: 1,
        customer_id: 10,
        customer_name: 'أحمد',
        sales_invoice_id: 100,
        invoice_number: 'INV-100',
        display_tier: 'upcoming',
        due_date: '2026-07-01',
      }),
      makeRow({
        id: 2,
        customer_id: 20,
        customer_name: 'سارة',
        sales_invoice_id: 200,
        invoice_number: 'INV-200',
        display_tier: 'overdue',
        due_date: '2026-04-01',
      }),
    ]

    const groups = groupInstallmentsByCustomerAndContract(rows, 'priority')

    expect(groups[0]?.customerName).toBe('سارة')
    expect(groups[1]?.customerName).toBe('أحمد')
  })
})
