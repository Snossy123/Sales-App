import { describe, expect, it } from 'vitest'
import type { ServiceLineDraft } from '../components/services/ServiceLineCard'
import type { CombinerChipId, CombinerFeeChipId } from './serviceCombiner'
import { deriveCombinerContractKind, normalizeFeeLineInstances } from './serviceCombiner'

function chips(...ids: CombinerChipId[]): Set<CombinerChipId> {
  return new Set(ids)
}

function draftLine(description: string): ServiceLineDraft {
  return {
    id: 1,
    description,
    unit_price: 100,
    cashPrice: 100,
    installmentPrice: 120,
    paymentTerm: 'cash',
    cashSchedule: 'immediate',
    cashScheduleItems: [],
    downPayment: 0,
    installmentAmount: 0,
    intervalType: 'monthly',
    firstDueDate: '2026-10-01',
  }
}

function feeInstance(chipId: CombinerFeeChipId, key: string, description: string = chipId) {
  return { key, chipId, line: draftLine(description) }
}

describe('deriveCombinerContractKind', () => {
  it('maps annual renewal only to subscription_renewal', () => {
    expect(deriveCombinerContractKind(chips('annual_renewal'))).toBe('subscription_renewal')
  })

  it('maps external device only to external_device', () => {
    expect(deriveCombinerContractKind(chips('external_device'))).toBe('external_device')
  })

  it('maps fee-only chips to mixed', () => {
    expect(deriveCombinerContractKind(chips('uninstall'))).toBe('mixed')
    expect(deriveCombinerContractKind(chips('installation', 'software'))).toBe('mixed')
  })

  it('maps two contract types together to mixed', () => {
    expect(deriveCombinerContractKind(chips('annual_renewal', 'external_device'))).toBe('mixed')
    expect(deriveCombinerContractKind(chips('annual_renewal', 'installation'))).toBe('mixed')
  })
})

describe('normalizeFeeLineInstances', () => {
  it('keeps the first uninstall line when a draft stacks the same service twice', () => {
    const first = feeInstance('uninstall', 'fee-1', 'فك أول')
    const duplicate = feeInstance('uninstall', 'fee-2', 'فك تاني')
    expect(normalizeFeeLineInstances([first, duplicate])).toEqual([first])
  })

  it('keeps uninstall and installation when they are different services', () => {
    const uninstall = feeInstance('uninstall', 'fee-1', 'فك')
    const installation = feeInstance('installation', 'fee-2', 'تركيب')
    expect(normalizeFeeLineInstances([uninstall, installation])).toEqual([uninstall, installation])
  })
})
