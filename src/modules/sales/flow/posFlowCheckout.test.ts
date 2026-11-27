import { describe, expect, it } from 'vitest'
import { createDeviceLine } from '../../../components/pos/DeviceLineCard'
import { createServiceLine } from '../../../components/services/ServiceLineCard'
import { buildRenewalCheckout, buildServiceCheckout, detailsReady } from './posFlowCheckout'
import { emptyPosFlowDraft } from './posFlowTypes'

describe('buildRenewalCheckout', () => {
  it('sends product_unit_id with soft and physical serials for a registered device', () => {
    const draft = emptyPosFlowDraft()
    draft.action = 'renewal'
    draft.selectedCustomer = {
      id: 1,
      name: 'Test customer',
      phone: '01000000000',
      status: 'active',
    }
    draft.selectedCustomerDevice = {
      id: 'unit:9',
      product_unit_id: 9,
      serial_number: 'SOFT-200',
      physical_serial: 'PHYSICAL-100',
      sim_number: '01000000000',
      username: 'gps.user',
    }
    draft.renewalSerial = 'SOFT-200'
    draft.renewalPhysicalSerial = 'PHYSICAL-100'
    draft.renewalSim = '01000000000'
    draft.renewalUsername = 'gps.user'
    const line = createDeviceLine(825, { id: 9, serial_number: 'SOFT-200' }, {
      contractDate: draft.contractDate,
      minDownPercent: 10,
    })
    line.physicalSerial = 'PHYSICAL-100'
    line.simNumber = '01000000000'
    line.username = 'gps.user'
    line.vehicleType = 'other'
    draft.deviceLines = [line]

    const payload = buildRenewalCheckout(draft, {
      contextBranchId: 1,
      maxInstallmentCount: 12,
    })

    expect(payload.lines[0]).toMatchObject({
      product_unit_id: 9,
      serial_number: 'SOFT-200',
      physical_serial: 'PHYSICAL-100',
      sim_number: '01000000000',
      username: 'gps.user',
    })
  })

  it('requires a selected customer device before renewal checkout', () => {
    const draft = emptyPosFlowDraft()
    draft.action = 'renewal'
    draft.selectedCustomer = {
      id: 1,
      name: 'Test customer',
      phone: '01000000000',
      status: 'active',
    }
    draft.customerConfirmed = true
    draft.renewalManualDevice = true
    draft.renewalSerial = 'SOFT-200'
    draft.renewalPhysicalSerial = 'PHYSICAL-100'
    draft.renewalSim = '01000000000'
    draft.renewalUsername = 'gps.user'
    draft.deviceLines = []

    const errors = detailsReady(draft, {
      warehouseId: null,
      minDownPercent: 10,
      maxInstallmentCount: 12,
    })

    expect(errors).toContain('اختار الجهاز أو سجّله وربطه بالعميل')
  })
})

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
