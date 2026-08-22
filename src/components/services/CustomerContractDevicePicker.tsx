import { useMemo, useState } from 'react'
import type { CustomerContractDevice } from '../../api/types'
import { normalizeScannedInput } from '../../lib/scanner'
import type { DeviceLineDraft } from '../pos/DeviceLineCard'
import { SearchableSelect } from '../SearchableSelect'
import {
  posInputClass,
  posLabelClass,
  posRequiredWrap,
  posScanClass,
} from '../pos/posFormStyles'

export const MANUAL_CONTRACT_DEVICE_ID = 'manual'

export type ContractDeviceOption =
  | CustomerContractDevice
  | { id: typeof MANUAL_CONTRACT_DEVICE_ID }

export function contractDeviceLabel(device: CustomerContractDevice): string {
  const serial = device.serial_number?.trim() || 'بدون سريال'
  const sim = device.sim_number?.trim()
  const invoice = device.invoice_number?.trim()
  const model = device.product_model?.name_ar || device.product_model?.name
  return [serial, sim, model, invoice].filter(Boolean).join(' — ')
}

export function applyContractDeviceIdentity(
  line: DeviceLineDraft,
  identity: {
    productUnitId?: number
    serialNumber: string
    simNumber: string
    username?: string
    vehicleType?: DeviceLineDraft['vehicleType']
    vehiclePlateLetters?: string
    vehiclePlateNumbers?: string
    chassisNumber?: string
    engineNumber?: string
  },
): DeviceLineDraft {
  return {
    ...line,
    productUnitId: identity.productUnitId,
    serialNumber: identity.serialNumber,
    simNumber: identity.simNumber,
    username: identity.username?.trim() || line.username || identity.serialNumber,
    vehicleType: identity.vehicleType || line.vehicleType || 'other',
    vehiclePlateLetters: identity.vehiclePlateLetters ?? line.vehiclePlateLetters,
    vehiclePlateNumbers: identity.vehiclePlateNumbers ?? line.vehiclePlateNumbers,
    chassisNumber: identity.chassisNumber ?? line.chassisNumber,
    engineNumber: identity.engineNumber ?? line.engineNumber,
  }
}

export function identityFromCustomerDevice(device: CustomerContractDevice): {
  productUnitId?: number
  serialNumber: string
  simNumber: string
  username: string
  vehicleType: DeviceLineDraft['vehicleType']
  vehiclePlateLetters: string
  vehiclePlateNumbers: string
  chassisNumber: string
  engineNumber: string
} {
  const serial = device.serial_number?.trim() ?? ''
  return {
    productUnitId: device.product_unit_id ?? undefined,
    serialNumber: serial,
    simNumber: device.sim_number?.trim() ?? '',
    username: device.username?.trim() || serial,
    vehicleType: (device.vehicle_type as DeviceLineDraft['vehicleType']) || 'other',
    vehiclePlateLetters: device.vehicle_plate_letters ?? '',
    vehiclePlateNumbers: device.vehicle_plate_numbers ?? '',
    chassisNumber: device.chassis_number ?? '',
    engineNumber: device.engine_number ?? '',
  }
}

interface CustomerContractDevicePickerProps {
  devices: CustomerContractDevice[]
  loading?: boolean
  selectedDevice: CustomerContractDevice | null
  manual: boolean
  serialNumber: string
  simNumber: string
  username: string
  onSelectDevice: (device: CustomerContractDevice) => void
  onManual: () => void
  onClear?: () => void
  onSerialChange: (value: string) => void
  onSimChange: (value: string) => void
  onUsernameChange: (value: string) => void
  showIdentityFields: boolean
  identityLocked: boolean
  showErrors?: boolean
}

const MANUAL_OPTION: ContractDeviceOption = { id: MANUAL_CONTRACT_DEVICE_ID }

export function CustomerContractDevicePicker({
  devices,
  loading = false,
  selectedDevice,
  manual,
  serialNumber,
  simNumber,
  username,
  onSelectDevice,
  onManual,
  onClear,
  onSerialChange,
  onSimChange,
  onUsernameChange,
  showIdentityFields,
  identityLocked,
  showErrors = false,
}: CustomerContractDevicePickerProps) {
  const [search, setSearch] = useState('')
  const options = useMemo<ContractDeviceOption[]>(() => {
    const q = search.trim().toLowerCase()
    const listed = q
      ? devices.filter((device) => contractDeviceLabel(device).toLowerCase().includes(q))
      : devices
    return [...listed, MANUAL_OPTION]
  }, [devices, search])
  const selected = manual ? MANUAL_OPTION : selectedDevice
  const serialError = showErrors && !serialNumber.trim()
  const simError = showErrors && !simNumber.trim()
  const usernameError = showErrors && !username.trim()

  return (
    <div className="space-y-md">
      <SearchableSelect
        label="جهاز العميل"
        options={options}
        value={selected}
        onChange={(option) => {
          if (!option) {
            onClear?.()
            return
          }
          if (option.id === MANUAL_CONTRACT_DEVICE_ID) {
            onManual()
            return
          }
          onSelectDevice(option)
        }}
        onSearchChange={setSearch}
        getOptionValue={(option) => option.id}
        getOptionLabel={(option) =>
          option.id === MANUAL_CONTRACT_DEVICE_ID
            ? 'جهاز غير مسجل — إدخال يدوي'
            : contractDeviceLabel(option)
        }
        placeholder={devices.length ? 'اختر جهازًا أو أدخل السريال يدويًا' : 'لا توجد أجهزة مسجلة'}
        loading={loading}
        emptyMessage={search.trim() ? 'لا يوجد جهاز مطابق' : 'لا توجد أجهزة'}
        hasError={showErrors && !manual && !selectedDevice}
      />

      {devices.length === 0 && !loading && (
        <p className="text-xs text-on-surface-variant">
          لا توجد أجهزة مسجلة لهذا العميل — أدخل السريال والشريحة يدويًا
        </p>
      )}

      {showIdentityFields && (
        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className={posRequiredWrap(serialError)}>
            <label className={posLabelClass}>السريال</label>
            <input
              value={serialNumber}
              onChange={(e) => onSerialChange(normalizeScannedInput(e.target.value))}
              placeholder="امسح أو أدخل السريال"
              className={`${posScanClass}${serialError ? ' border-error' : ''}`}
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              disabled={identityLocked}
            />
            {serialError && <p className="mt-xs text-xs text-error">السريال مطلوب</p>}
          </div>
          <div className={posRequiredWrap(simError)}>
            <label className={posLabelClass}>رقم الشريحة / الكارت</label>
            <input
              value={simNumber}
              onChange={(e) => onSimChange(normalizeScannedInput(e.target.value))}
              placeholder="امسح أو أدخل رقم الشريحة"
              className={`${posScanClass}${simError ? ' border-error' : ''}`}
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              inputMode="numeric"
              disabled={identityLocked}
            />
            {simError && <p className="mt-xs text-xs text-error">رقم الشريحة مطلوب</p>}
          </div>
          <div className={posRequiredWrap(usernameError)}>
            <label className={posLabelClass}>اسم المستخدم</label>
            <input
              value={username}
              onChange={(e) => onUsernameChange(normalizeScannedInput(e.target.value))}
              placeholder="username"
              className={`${posInputClass}${usernameError ? ' border-error' : ''}`}
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              disabled={identityLocked}
            />
            {usernameError && <p className="mt-xs text-xs text-error">اسم المستخدم مطلوب</p>}
          </div>
        </div>
      )}
    </div>
  )
}
