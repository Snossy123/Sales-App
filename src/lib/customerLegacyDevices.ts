import { api, getErrorMessage } from '../api/client'
import type { CustomerContractDevice } from '../api/types'
import { isGpsUsernameComplete } from './gpsUsername'

export type LegacyDeviceOrigin = 'legacy' | 'external'

export type LegacyDeviceDraft = {
  key: string
  origin: LegacyDeviceOrigin
  serial_number: string
  sim_number: string
  username: string
}

export type LegacyDeviceFieldErrors = {
  serial_number?: string
  sim_number?: string
  username?: string
}

export function newLegacyDeviceKey(): string {
  return `legacy-device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function emptyLegacyDeviceDraft(): LegacyDeviceDraft {
  return {
    key: newLegacyDeviceKey(),
    origin: 'legacy',
    serial_number: '',
    sim_number: '',
    username: '',
  }
}

export function isLegacyDeviceRowFilled(device: LegacyDeviceDraft): boolean {
  return Boolean(
    device.serial_number.trim() || device.sim_number.trim() || device.username.trim(),
  )
}

export function validateLegacyDeviceDraft(device: LegacyDeviceDraft): LegacyDeviceFieldErrors {
  const errors: LegacyDeviceFieldErrors = {}
  if (!device.serial_number.trim()) {
    errors.serial_number = 'السريال مطلوب'
  }
  if (!device.sim_number.trim()) {
    errors.sim_number = 'رقم الشريحة مطلوب'
  }
  if (!isGpsUsernameComplete(device.username)) {
    errors.username = 'اسم المستخدم مطلوب'
  }
  return errors
}

export function legacyDevicesAreComplete(devices: LegacyDeviceDraft[]): boolean {
  if (devices.length === 0) return false
  return devices.every((device) => Object.keys(validateLegacyDeviceDraft(device)).length === 0)
}

export function toRegisterDevicePayload(device: LegacyDeviceDraft) {
  return {
    origin: device.origin,
    serial_number: device.serial_number.trim(),
    sim_number: device.sim_number.trim(),
    username: device.username.trim(),
  }
}

export async function registerCustomerLegacyDevices(
  customerId: number,
  devices: LegacyDeviceDraft[],
  options?: { afterCustomerCreate?: boolean },
): Promise<{ registered: CustomerContractDevice[]; error: string | null }> {
  const registered: CustomerContractDevice[] = []
  const failures: string[] = []

  for (const device of devices) {
    try {
      const { data } = await api.post<{ data: CustomerContractDevice }>(
        `/customers/${customerId}/devices`,
        toRegisterDevicePayload(device),
      )
      if (data.data) registered.push(data.data)
    } catch (error) {
      const serial = device.serial_number.trim() || 'بدون سريال'
      failures.push(`${serial}: ${getErrorMessage(error)}`)
    }
  }

  const prefix = options?.afterCustomerCreate
    ? 'تم حفظ العميل، وتعذر تسجيل بعض الأجهزة. أكملها من صفحة العميل. '
    : 'تعذر تسجيل بعض الأجهزة. '

  return {
    registered,
    error: failures.length ? `${prefix}${failures.join(' — ')}` : null,
  }
}
