import { describe, expect, it } from 'vitest'
import { createServiceLine } from '../../../components/services/ServiceLineCard'
import { buildServiceCheckout } from './posFlowCheckout'
import { emptyPosFlowDraft } from './posFlowTypes'

describe('buildServiceCheckout', () => {
  it('sends the new serial for software and preserves the physical serial', () => {
    const draft = emptyPosFlowDraft()
    draft.selectedCustomer = {
      id: 1,
      name: 'Test customer',
      phone: '01000000000',
      status: 'active',
    }
    draft.selectedCustomerDevice = {
      id: 'unit:9',
      product_unit_id: 9,
      serial_number: 'OLD-100',
      physical_serial: 'PHYSICAL-100',
      sim_number: '01000000000',
      username: 'gps.user',
    }
    draft.serviceSerial = 'NEW-200'
    draft.feeLines = [
      {
        key: 'software-1',
        chipId: 'software',
        productUnitId: 9,
        line: createServiceLine(
          {
            service_id: 4,
            description: 'Software',
            unit_price: 150,
            cashPrice: 150,
            installmentPrice: 150,
          },
          { contractDate: draft.contractDate },
        ),
      },
    ]

    const payload = buildServiceCheckout(draft, {
      contextBranchId: 1,
      maxInstallmentCount: 12,
      total: 150,
    })

    expect(payload.lines[0]).toMatchObject({
      product_unit_id: 9,
      serial_number: 'NEW-200',
      physical_serial: 'PHYSICAL-100',
    })
  })
})
