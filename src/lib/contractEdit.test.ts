import { describe, expect, it } from 'vitest'
import type { AuthUser, SalesInvoice } from '../api/types'
import { canConvertCashToInstallment, canEditContract, contractEditPath } from './contractEdit'

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    name: 'Tester',
    email: 't@example.com',
    organization_id: 1,
    permissions: [],
    ...overrides,
  }
}

function invoice(review_status: string, overrides: Partial<SalesInvoice> = {}): SalesInvoice {
  return { id: 12, review_status, payment_term: 'cash', status: 'confirmed', ...overrides } as SalesInvoice
}

describe('contractEdit', () => {
  it('builds the invoice edit path', () => {
    expect(contractEditPath(12)).toBe('/invoices/12/edit')
  })

  it('denies edit without a user or invoice', () => {
    expect(canEditContract(null, invoice('pending'))).toBe(false)
    expect(canEditContract(user(), null)).toBe(false)
  })

  it('allows pending and rejected when the user has edit-before-review', () => {
    const editor = user({ permissions: ['sales.invoices.edit_before_review'] })
    expect(canEditContract(editor, invoice('pending'))).toBe(true)
    expect(canEditContract(editor, invoice('rejected'))).toBe(true)
    expect(canEditContract(user(), invoice('pending'))).toBe(false)
  })

  it('allows pending and rejected for admin demo roles without the permission', () => {
    expect(canEditContract(user({ demo_role: 'admin' }), invoice('pending'))).toBe(true)
    expect(canEditContract(user({ demo_role: 'super_admin' }), invoice('rejected'))).toBe(true)
  })

  it('requires edit-after-review once the invoice is approved', () => {
    const beforeOnly = user({ permissions: ['sales.invoices.edit_before_review'] })
    const after = user({ permissions: ['review.edit_after_review'] })
    expect(canEditContract(beforeOnly, invoice('approved'))).toBe(false)
    expect(canEditContract(after, invoice('approved'))).toBe(true)
    expect(canEditContract(user({ demo_role: 'admin' }), invoice('approved'))).toBe(true)
  })

  it('denies unknown review statuses', () => {
    expect(
      canEditContract(user({ permissions: ['sales.invoices.edit_before_review'] }), invoice('draft')),
    ).toBe(false)
  })

  it('shows cash-to-installment only for editable cash contracts', () => {
    const admin = user({ demo_role: 'admin' })
    expect(canConvertCashToInstallment(admin, invoice('pending'))).toBe(true)
    expect(canConvertCashToInstallment(admin, invoice('pending', { payment_term: 'installment' }))).toBe(
      false,
    )
    expect(canConvertCashToInstallment(admin, invoice('pending', { contract_status: 'cancelled' }))).toBe(
      false,
    )
    expect(
      canConvertCashToInstallment(admin, invoice('pending', { ownership_transferred_at: '2026-01-01' })),
    ).toBe(false)
    expect(canConvertCashToInstallment(user(), invoice('pending'))).toBe(false)
  })
})
