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
  const cash = num(product?.cash_price, num(product?.sell_price))
  const installment = num(product?.installment_price, cash)

  if (ctx.contractKind === 'subscription_renewal') {
    return subscriptionRenewalUnitPrice(cash)
  }

  if (ctx.contractKind === 'external_device') {
    if (ctx.paymentTerm === 'cash') {
      return ctx.renewalType === 'permanent'
        ? num(product?.external_cash_permanent_price, cash)
        : num(product?.external_cash_annual_price, cash)
    }
    return ctx.renewalType === 'permanent'
      ? num(product?.external_installment_permanent_price, installment)
      : num(product?.external_installment_annual_price, installment)
  }

  return ctx.paymentTerm === 'cash' ? cash : installment
}
