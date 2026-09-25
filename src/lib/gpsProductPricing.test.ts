import { describe, expect, it } from 'vitest'
import type { GpsProduct } from '../api/types'
import { subscriptionRenewalUnitPrice } from './contractKinds'
import { resolveGpsUnitPrice } from './gpsProductPricing'

const product: GpsProduct = {
  id: 1,
  name: 'GPS',
  sell_price: 8000,
  cash_price: 7000,
  installment_price: 9000,
  cash_annual_price: 6000,
  cash_permanent_price: 12000,
  installment_annual_price: 6500,
  installment_permanent_price: 13000,
  annual_renewal_price: 1500,
  external_cash_annual_price: 4000,
  external_cash_permanent_price: 8000,
  external_installment_annual_price: 4500,
  external_installment_permanent_price: 8500,
}

describe('resolveGpsUnitPrice', () => {
  it('uses annual vs permanent list prices for a new contract', () => {
    expect(
      resolveGpsUnitPrice(product, {
        contractKind: 'new_contract',
        paymentTerm: 'cash',
        renewalType: 'annual',
      }),
    ).toBe(6000)
    expect(
      resolveGpsUnitPrice(product, {
        contractKind: 'new_contract',
        paymentTerm: 'cash',
        renewalType: 'permanent',
      }),
    ).toBe(12000)
    expect(
      resolveGpsUnitPrice(product, {
        contractKind: 'new_contract',
        paymentTerm: 'installment',
        renewalType: 'annual',
      }),
    ).toBe(6500)
    expect(
      resolveGpsUnitPrice(product, {
        contractKind: 'new_contract',
        paymentTerm: 'installment',
        renewalType: 'permanent',
      }),
    ).toBe(13000)
  })

  it('uses annual renewal price or 25% of cash annual for permanent renewal', () => {
    expect(
      resolveGpsUnitPrice(product, {
        contractKind: 'subscription_renewal',
        paymentTerm: 'cash',
        renewalType: 'annual',
      }),
    ).toBe(1500)
    expect(
      resolveGpsUnitPrice(product, {
        contractKind: 'subscription_renewal',
        paymentTerm: 'installment',
        renewalType: 'permanent',
      }),
    ).toBe(subscriptionRenewalUnitPrice(6000))
  })

  it('uses external-device prices with cash/installment fallbacks', () => {
    expect(
      resolveGpsUnitPrice(product, {
        contractKind: 'external_device',
        paymentTerm: 'cash',
        renewalType: 'annual',
      }),
    ).toBe(4000)
    expect(
      resolveGpsUnitPrice(product, {
        contractKind: 'external_device',
        paymentTerm: 'cash',
        renewalType: 'permanent',
      }),
    ).toBe(8000)
    expect(
      resolveGpsUnitPrice(product, {
        contractKind: 'external_device',
        paymentTerm: 'installment',
        renewalType: 'annual',
      }),
    ).toBe(4500)

    const withoutExternal: GpsProduct = {
      ...product,
      external_cash_annual_price: undefined,
      external_installment_annual_price: undefined,
    }
    expect(
      resolveGpsUnitPrice(withoutExternal, {
        contractKind: 'external_device',
        paymentTerm: 'cash',
        renewalType: 'annual',
      }),
    ).toBe(6000)
    expect(
      resolveGpsUnitPrice(withoutExternal, {
        contractKind: 'external_device',
        paymentTerm: 'installment',
        renewalType: 'annual',
      }),
    ).toBe(6500)
  })

})
