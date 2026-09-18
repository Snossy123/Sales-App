import { describe, expect, it } from 'vitest'
import type { Customer, Distributor } from '../api/types'
import {
  customerAllPhoneNumbers,
  formatPhoneDisplay,
  hasGuarantorData,
  phoneEntriesToPayload,
} from './customerForm'
import { resolveCustomerTransactionSource } from './posCustomerSource'

describe('customerForm', () => {
  it('detects guarantor data from name or phone', () => {
    expect(hasGuarantorData({ name: '', national_id: '', address: '', phone: '', relationship: '' })).toBe(
      false,
    )
    expect(
      hasGuarantorData({ name: 'علي', national_id: '', address: '', phone: '', relationship: '' }),
    ).toBe(true)
    expect(
      hasGuarantorData({ name: '', national_id: '', address: '', phone: '01000000000', relationship: '' }),
    ).toBe(true)
  })

  it('collects non-empty phone numbers including extras', () => {
    expect(
      customerAllPhoneNumbers({
        phone: '0101',
        phone_2: '  ',
        phone_3: '0103',
        extra_phones: [{ number: '0104' }, { number: '' }],
      }),
    ).toEqual(['0101', '0103', '0104'])
  })

  it('maps the first three phone entries and keeps the rest as extras', () => {
    const payload = phoneEntriesToPayload([
      { number: ' 0101 ', label: 'رئيسي' },
      { number: '0102', label: '' },
      { number: '0103', label: 'عمل' },
      { number: '0104', label: 'إضافي' },
      { number: '', label: 'فارغ' },
    ])
    expect(payload.phone).toBe('0101')
    expect(payload.phone_label).toBe('رئيسي')
    expect(payload.phone_2).toBe('0102')
    expect(payload.phone_2_label).toBeNull()
    expect(payload.phone_3).toBe('0103')
    expect(payload.extra_phones).toEqual([{ number: '0104', label: 'إضافي' }])
  })

  it('formats phone display with an optional label', () => {
    expect(formatPhoneDisplay('منزل', '01000000000')).toBe('منزل — 01000000000')
    expect(formatPhoneDisplay(null, '01000000000')).toBe('01000000000')
    expect(formatPhoneDisplay('منزل', '  ')).toBe('—')
  })
})

describe('posCustomerSource', () => {
  const distributor = { id: 7, name: 'موزع النيل', code: 'D7' } as Distributor

  it('uses sales as the source when the customer has a sales user', () => {
    const customer = {
      id: 1,
      name: 'عميل',
      phone: '010',
      status: 'active',
      sales_user_id: 4,
      sales_user: { id: 4, name: 'مندوب', branch_id: 2 },
      distributor_id: 7,
      distributor,
    } as Customer

    const resolved = resolveCustomerTransactionSource(customer)
    expect(resolved.source).toBe('sales')
    expect(resolved.salesRep).toEqual({ id: 4, name: 'مندوب', branch_id: 2 })
    expect(resolved.salesRepSearch).toBe('مندوب')
    expect(resolved.distributor).toEqual(distributor)
  })

  it('suggests the distributor when there is no sales user', () => {
    const customer = {
      id: 2,
      name: 'عميل',
      phone: '010',
      status: 'active',
      distributor_id: 7,
      distributor,
    } as Customer

    const resolved = resolveCustomerTransactionSource(customer)
    expect(resolved.source).toBe('distributor')
    expect(resolved.salesRep).toBeNull()
    expect(resolved.distributor).toEqual(distributor)
    expect(resolved.distributorSearch).toBe('موزع النيل')
  })
})
