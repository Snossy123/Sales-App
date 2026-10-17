import { describe, expect, it } from 'vitest'
import type { Service } from '../api/types'
import type { ServiceLineDraft } from '../components/services/ServiceLineCard'
import type { CombinerChipId, CombinerFeeChipId } from './serviceCombiner'
import {
  COMBINER_FEE_CHIPS,
  deriveCombinerContractKind,
  findCombinerService,
  normalizeFeeLineInstances,
} from './serviceCombiner'

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
    expect(deriveCombinerContractKind(chips('reset_password'))).toBe('mixed')
    expect(deriveCombinerContractKind(chips(), true)).toBe('mixed')
  })

  it('maps two contract types together to mixed', () => {
    expect(deriveCombinerContractKind(chips('annual_renewal', 'external_device'))).toBe('mixed')
    expect(deriveCombinerContractKind(chips('annual_renewal', 'installation'))).toBe('mixed')
    expect(deriveCombinerContractKind(chips('annual_renewal'), true)).toBe('mixed')
  })
})

describe('findCombinerService', () => {
  it('finds an active reset password service by its dedicated category', () => {
    const resetPasswordChip = COMBINER_FEE_CHIPS.find((chip) => chip.id === 'reset_password')
    const service: Service = {
      id: 50,
      code: 'CUSTOM-RESET',
      name: 'Reset Password',
      category: 'reset_password',
      default_price: 175,
      cash_price: 175,
      installment_price: 200,
      is_active: true,
    }

    expect(resetPasswordChip).toBeDefined()
    expect(findCombinerService([service], resetPasswordChip!)).toBe(service)
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

  it('keeps different catalog services even when they share a category', () => {
    const first = {
      key: 'fee-1',
      serviceId: 10,
      serviceCategory: 'other' as const,
      line: { ...draftLine('خدمة أولى'), service_id: 10 },
    }
    const second = {
      key: 'fee-2',
      serviceId: 11,
      serviceCategory: 'other' as const,
      line: { ...draftLine('خدمة ثانية'), service_id: 11 },
    }

    expect(normalizeFeeLineInstances([first, second])).toEqual([first, second])
  })

  it('removes duplicate catalog lines by service id', () => {
    const first = {
      key: 'fee-1',
      serviceId: 10,
      serviceCategory: 'maintenance' as const,
      line: { ...draftLine('صيانة'), service_id: 10 },
    }
    const duplicate = {
      ...first,
      key: 'fee-2',
    }

    expect(normalizeFeeLineInstances([first, duplicate])).toEqual([first])
  })

  it('normalizes legacy chip-keyed drafts with their service id', () => {
    const line = { ...draftLine('فك'), service_id: 20 }

    expect(normalizeFeeLineInstances({ uninstall: line })).toEqual([
      {
        key: 'uninstall',
        chipId: 'uninstall',
        serviceId: 20,
        line,
        productUnitId: undefined,
      },
    ])
  })
})
