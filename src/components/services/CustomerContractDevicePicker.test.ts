import { describe, expect, it } from 'vitest'
import type { CustomerContractDevice } from '../../api/types'
import {
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
})
