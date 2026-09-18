import { describe, expect, it } from 'vitest'
import type { AuthUser, SalesInvoice } from '../api/types'
import { canEditContract, contractEditPath } from './contractEdit'

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

function invoice(review_status: string): SalesInvoice {
  return { id: 12, review_status } as SalesInvoice
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
})
