import { describe, expect, it } from 'vitest'
import type { CustomerContractDevice } from '../../api/types'
import { createDeviceLine } from '../pos/DeviceLineCard'
import {
  applyContractDeviceIdentity,
  buildRegisterCustomerDevicePayload,
  contractDeviceLabel,
  identityFromCustomerDevice,
} from './CustomerContractDevicePicker'

const device: CustomerContractDevice = {
  id: 'unit:7',
  product_unit_id: 7,
  serial_number: 'CURRENT-200',
  physical_serial: 'PHYSICAL-100',
  sim_number: '01000000000',
  username: 'gps.user',
}

describe('customer contract device identity', () => {
  it('keeps current and physical serials separate', () => {
    expect(identityFromCustomerDevice(device)).toMatchObject({
      productUnitId: 7,
      serialNumber: 'CURRENT-200',
      physicalSerial: 'PHYSICAL-100',
    })
  })

  it('shows both serials in the device label', () => {
    expect(contractDeviceLabel(device)).toContain('CURRENT-200')
    expect(contractDeviceLabel(device)).toContain('Physical: PHYSICAL-100')
  })

  it('applies physical serial onto the device line', () => {
    const line = createDeviceLine(100, undefined, { contractDate: '2026-01-01', minDownPercent: 10 })
    const next = applyContractDeviceIdentity(line, {
      productUnitId: 7,
      serialNumber: 'CURRENT-200',
      physicalSerial: 'PHYSICAL-100',
      simNumber: '01000000000',
      username: 'gps.user',
    })
    expect(next).toMatchObject({
      productUnitId: 7,
      serialNumber: 'CURRENT-200',
      physicalSerial: 'PHYSICAL-100',
      simNumber: '01000000000',
      username: 'gps.user',
    })
  })

  it('builds register payload with distinct soft and physical serials', () => {
    expect(
      buildRegisterCustomerDevicePayload({
        origin: 'legacy',
        serialNumber: 'SOFT-200',
        physicalSerial: 'PHYSICAL-100',
        simNumber: '01000000000',
        username: 'Eleraqy.user',
      }),
    ).toEqual({
      origin: 'legacy',
      serial_number: 'SOFT-200',
      physical_serial: 'PHYSICAL-100',
      sim_number: '01000000000',
      username: 'Eleraqy.user',
    })
  })
})
