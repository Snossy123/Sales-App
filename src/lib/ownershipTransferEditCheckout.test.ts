import { describe, expect, it } from 'vitest'
import { shouldReuseInvoiceServiceLinesOnEdit } from './ownershipTransferEditCheckout'

describe('shouldReuseInvoiceServiceLinesOnEdit', () => {
  it('skips copying invoice service lines for ownership transfer (fees are rebuilt)', () => {
    expect(shouldReuseInvoiceServiceLinesOnEdit('ownership_transfer')).toBe(false)
  })

  it('keeps copying invoice service lines for other contract kinds', () => {
    expect(shouldReuseInvoiceServiceLinesOnEdit('new_contract')).toBe(true)
    expect(shouldReuseInvoiceServiceLinesOnEdit('subscription_renewal')).toBe(true)
    expect(shouldReuseInvoiceServiceLinesOnEdit('mixed')).toBe(true)
  })
})
