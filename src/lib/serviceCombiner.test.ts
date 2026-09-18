import { describe, expect, it } from 'vitest'
import type { CombinerChipId } from './serviceCombiner'
import { deriveCombinerContractKind } from './serviceCombiner'

function chips(...ids: CombinerChipId[]): Set<CombinerChipId> {
  return new Set(ids)
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
