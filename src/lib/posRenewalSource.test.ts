import { describe, expect, it } from 'vitest'
import type { Customer, CustomerContractDevice, SubscriptionRenewalCandidate } from '../api/types'
import {
  candidateFromCustomerDevice,
  isRenewalSourceReady,
  matchCustomerDevice,
  shouldShowRenewalIdentityFields,
} from './posRenewalSource'

const customer = {
  id: 9,
  name: 'عمرو السيد',
  phone: '01000000000',
  phone_2: '01111111111',
} as Customer

const deviceWithContract: CustomerContractDevice = {
  id: 'line:44',
  sales_invoice_id: 80,
  sales_invoice_line_id: 44,
  invoice_number: 'INV-000007',
  serial_number: '1234',
  sim_number: '01012345678',
  username: 'Eleraqy1234',
}

const registeredOnly: CustomerContractDevice = {
  id: 'unit:3',
  product_unit_id: 3,
  serial_number: '9999',
  sim_number: '01099999999',
  username: 'Eleraqy9999',
}

describe('posRenewalSource', () => {
  it('builds a source candidate only when the device has a contract', () => {
    expect(candidateFromCustomerDevice(deviceWithContract, customer)?.sales_invoice_id).toBe(80)
    expect(candidateFromCustomerDevice(registeredOnly, customer)).toBeNull()
  })

  it('matches a queued renewal line to the customer device', () => {
    const candidate = {
      id: 44,
      sales_invoice_id: 80,
      serial_number: '1234',
    } as SubscriptionRenewalCandidate

    expect(matchCustomerDevice([registeredOnly, deviceWithContract], candidate)?.id).toBe('line:44')
  })

  it('allows checkout from a source contract or complete device identity', () => {
    expect(
      isRenewalSourceReady({
        candidate: { id: 1, sales_invoice_id: 80 },
        serialNumber: '',
        simNumber: '',
        username: '',
      }),
    ).toBe(true)

    expect(
      isRenewalSourceReady({
        candidate: null,
        serialNumber: '1234',
        simNumber: '01012345678',
        username: 'Eleraqy1234',
      }),
    ).toBe(true)

    expect(
      isRenewalSourceReady({
        candidate: null,
        serialNumber: '1234',
        simNumber: '',
        username: 'Eleraqy1234',
      }),
    ).toBe(false)
  })

  it('shows the three identity fields when the customer has no devices', () => {
    expect(
      shouldShowRenewalIdentityFields({
        hasCustomer: false,
        deviceCount: 0,
        manual: false,
        hasSelectedDevice: false,
      }),
    ).toBe(false)

    expect(
      shouldShowRenewalIdentityFields({
        hasCustomer: true,
        deviceCount: 0,
        manual: false,
        hasSelectedDevice: false,
      }),
    ).toBe(true)

    expect(
      shouldShowRenewalIdentityFields({
        hasCustomer: true,
        deviceCount: 2,
        manual: false,
        hasSelectedDevice: false,
      }),
    ).toBe(false)
  })
})
