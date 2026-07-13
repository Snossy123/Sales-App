import type { ContractKind, GpsProduct } from '../api/types'
import { subscriptionRenewalUnitPrice } from './contractKinds'

export type RenewalType = 'annual' | 'permanent'

export interface GpsUnitPriceContext {
  contractKind: ContractKind
  paymentTerm: 'cash' | 'installment'
  renewalType: RenewalType
}

function num(value: number | string | null | undefined, fallback = 0): number {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function resolveGpsUnitPrice(product: GpsProduct | undefined, ctx: GpsUnitPriceContext): number {
  const cashAnnual = num(product?.cash_annual_price, num(product?.cash_price, num(product?.sell_price)))
  const cashPermanent = num(product?.cash_permanent_price, cashAnnual)
  const installmentAnnual = num(product?.installment_annual_price, num(product?.installment_price, cashAnnual))
  const installmentPermanent = num(product?.installment_permanent_price, installmentAnnual)

  if (ctx.contractKind === 'subscription_renewal') {
    if (ctx.renewalType === 'permanent') {
      return subscriptionRenewalUnitPrice(cashAnnual)
    }
    return num(product?.annual_renewal_price)
  }

  if (ctx.contractKind === 'external_device') {
    if (ctx.paymentTerm === 'cash') {
      return ctx.renewalType === 'permanent'
        ? num(product?.external_cash_permanent_price, cashPermanent)
        : num(product?.external_cash_annual_price, cashAnnual)
    }
    return ctx.renewalType === 'permanent'
      ? num(product?.external_installment_permanent_price, installmentPermanent)
      : num(product?.external_installment_annual_price, installmentAnnual)
  }

  if (ctx.paymentTerm === 'cash') {
    return ctx.renewalType === 'permanent' ? cashPermanent : cashAnnual
  }

  return ctx.renewalType === 'permanent' ? installmentPermanent : installmentAnnual
}
