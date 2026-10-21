import { api, getErrorMessage } from '../api/client'
import type { CustomerContractDevice } from '../api/types'
import { isGpsUsernameComplete } from './gpsUsername'

export type LegacyDeviceOrigin = 'legacy' | 'external'
export type LegacyRenewalType = 'annual' | 'permanent'

export type LegacyDeviceDraft = {
  key: string
  origin: LegacyDeviceOrigin
  serial_number: string
  sim_number: string
  username: string
  renewal_type: LegacyRenewalType
  subscription_renewal_date: string
  has_remaining_installments: boolean
  remaining_installment_count: string
  installment_amount: string
  first_due_date: string
}

export type LegacyDeviceFieldErrors = {
  serial_number?: string
  sim_number?: string
  username?: string
  renewal_type?: string
  subscription_renewal_date?: string
  remaining_installment_count?: string
  installment_amount?: string
  first_due_date?: string
}

export function isoLocalDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function defaultSubscriptionRenewalDate(from = new Date()): string {
  const next = new Date(from)
  next.setDate(next.getDate() + 365)
  return isoLocalDate(next)
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
    renewal_type: 'annual',
    subscription_renewal_date: defaultSubscriptionRenewalDate(),
    has_remaining_installments: false,
    remaining_installment_count: '',
    installment_amount: '',
    first_due_date: isoLocalDate(),
  }
}

export function hydrateLegacyDeviceDraft(
  device: Partial<LegacyDeviceDraft> & Pick<LegacyDeviceDraft, 'key'>,
): LegacyDeviceDraft {
  return {
    ...emptyLegacyDeviceDraft(),
    ...device,
    key: device.key,
    renewal_type: device.renewal_type === 'permanent' ? 'permanent' : 'annual',
    has_remaining_installments: Boolean(device.has_remaining_installments),
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
  if (device.renewal_type !== 'annual' && device.renewal_type !== 'permanent') {
    errors.renewal_type = 'نوع الاشتراك مطلوب'
  }
  if (device.renewal_type === 'annual' && !device.subscription_renewal_date.trim()) {
    errors.subscription_renewal_date = 'تاريخ التجديد مطلوب'
  }
  if (device.has_remaining_installments) {
    const count = Number(device.remaining_installment_count)
    const amount = Number(device.installment_amount)
    if (!Number.isInteger(count) || count < 1) {
      errors.remaining_installment_count = 'عدد الأقساط المتبقية مطلوب'
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.installment_amount = 'قيمة القسط مطلوبة'
    }
    if (!device.first_due_date.trim()) {
      errors.first_due_date = 'تاريخ أول قسط مطلوب'
    }
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
    renewal_type: device.renewal_type,
    ...(device.renewal_type === 'annual'
      ? { subscription_renewal_date: device.subscription_renewal_date.trim() }
      : {}),
    ...(device.has_remaining_installments
      ? {
          remaining_installment_count: Number(device.remaining_installment_count),
          installment_amount: Number(device.installment_amount),
          first_due_date: device.first_due_date.trim() || isoLocalDate(),
        }
      : {}),
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
