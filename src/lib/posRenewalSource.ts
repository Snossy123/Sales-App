import type { Customer, CustomerContractDevice, SubscriptionRenewalCandidate } from '../api/types'
import { isGpsUsernameComplete } from './gpsUsername'

export function candidateFromCustomerDevice(
  device: CustomerContractDevice,
  customer: Customer,
): SubscriptionRenewalCandidate | null {
  if (!device.sales_invoice_id) {
    return null
  }

  return {
    id: device.sales_invoice_line_id ?? 0,
    sales_invoice_id: device.sales_invoice_id,
    customer_id: customer.id,
    invoice_number: device.invoice_number,
    customer_name: customer.name,
    customer_phone: customer.phone,
    customer_phone_2: customer.phone_2 ?? null,
    serial_number: device.serial_number,
    sim_number: device.sim_number,
    username: device.username,
    vehicle_type: device.vehicle_type,
    vehicle_plate_letters: device.vehicle_plate_letters,
    vehicle_plate_numbers: device.vehicle_plate_numbers,
    chassis_number: device.chassis_number,
    engine_number: device.engine_number,
  }
}

export function matchCustomerDevice(
  devices: CustomerContractDevice[],
  candidate: SubscriptionRenewalCandidate,
): CustomerContractDevice | undefined {
  return devices.find((device) => {
    if (candidate.id && device.sales_invoice_line_id === candidate.id) {
      return true
    }

    const serial = candidate.serial_number?.trim()
    return Boolean(serial && device.serial_number?.trim() === serial)
  })
}

export function isRenewalIdentityComplete(identity: {
  serialNumber?: string
  simNumber?: string
  username?: string
}): boolean {
  return (
    Boolean(identity.serialNumber?.trim()) &&
    Boolean(identity.simNumber?.trim()) &&
    isGpsUsernameComplete(identity.username ?? '')
  )
}

export function isRenewalSourceReady(input: {
  candidate: SubscriptionRenewalCandidate | null
  serialNumber?: string
  simNumber?: string
  username?: string
}): boolean {
  if (input.candidate?.sales_invoice_id) {
    return true
  }

  return isRenewalIdentityComplete(input)
}

export function shouldShowRenewalIdentityFields(input: {
  hasCustomer: boolean
  deviceCount: number
  manual: boolean
  hasSelectedDevice: boolean
}): boolean {
  if (!input.hasCustomer) {
    return false
  }

  return input.manual || input.deviceCount === 0 || input.hasSelectedDevice
}
