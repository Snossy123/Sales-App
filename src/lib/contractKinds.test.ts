import { describe, expect, it } from 'vitest'
import type { ContractKind } from './contractKinds'
import {
  CONTRACT_KINDS,
  allowsManualDeviceEntry,
  contractKindLabel,
  reviewApproveLabel,
  subscriptionRenewalUnitPrice,
  unitPriceForContractKind,
} from './contractKinds'

describe('contractKinds', () => {
  it('exposes the four POS service types', () => {
    expect(CONTRACT_KINDS.map((kind) => kind.value)).toEqual([
      'new_contract',
      'subscription_renewal',
      'external_device',
      'ownership_transfer',
    ])
  })

  it('labels known kinds and falls back for mixed', () => {
    expect(contractKindLabel('new_contract')).toBe('تعاقد جديد')
    expect(contractKindLabel('subscription_renewal')).toBe('تجديد اشتراك')
    expect(contractKindLabel('external_device')).toBe('جهاز خارج الشركة')
    expect(contractKindLabel('ownership_transfer')).toBe('نقل ملكية')
    expect(contractKindLabel('mixed')).toBe('خدمات مجمّعة')
    expect(contractKindLabel(null)).toBe('تعاقد جديد')
  })

  it('allows manual device entry for every kind except new_contract', () => {
    const kinds: ContractKind[] = [
      'new_contract',
      'subscription_renewal',
      'external_device',
      'ownership_transfer',
    ]
    expect(allowsManualDeviceEntry('new_contract')).toBe(false)
    for (const kind of kinds.filter((value) => value !== 'new_contract')) {
      expect(allowsManualDeviceEntry(kind)).toBe(true)
    }
  })

  it('prices subscription renewal at 25% of cash, rounded to cents', () => {
    expect(subscriptionRenewalUnitPrice(1000)).toBe(250)
    expect(subscriptionRenewalUnitPrice(10.1)).toBe(2.53)
  })

  it('picks cash or installment list price except for subscription renewal', () => {
    expect(unitPriceForContractKind('new_contract', 2000, 2400, 'cash')).toBe(2000)
    expect(unitPriceForContractKind('new_contract', 2000, 2400, 'installment')).toBe(2400)
    expect(unitPriceForContractKind('subscription_renewal', 2000, 2400, 'installment')).toBe(500)
  })

  it('uses kind-specific review approve labels', () => {
    expect(reviewApproveLabel('new_contract')).toBe('تأكيد وإرسال الأقساط')
    expect(reviewApproveLabel('ownership_transfer')).toBe('اعتماد نقل ملكية')
    expect(reviewApproveLabel('external_device')).toBe('اعتماد جهاز خارج الشركة')
    expect(reviewApproveLabel('subscription_renewal')).toBe('اعتماد تجديد اشتراك')
    expect(reviewApproveLabel('mixed')).toBe('اعتماد خدمات مجمّعة')
  })
})
