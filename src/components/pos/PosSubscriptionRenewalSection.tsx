import { useState } from 'react'
import type { Customer, CustomerContractDevice } from '../../api/types'
import { shouldShowRenewalIdentityFields } from '../../lib/posRenewalSource'
import {
  CustomerContractDevicePicker,
  type RegisterCustomerDevicePayload,
} from '../services/CustomerContractDevicePicker'
import { PosSectionCard } from './PosSectionCard'

export interface PosSubscriptionRenewalSectionProps {
  customer: Customer | null
  devices: CustomerContractDevice[]
  devicesLoading?: boolean
  selectedDevice: CustomerContractDevice | null
  manual: boolean
  serialNumber: string
  physicalSerial?: string
  simNumber: string
  username: string
  onSelectDevice: (device: CustomerContractDevice) => void
  onManual: () => void
  onClear?: () => void
  onSerialChange: (value: string) => void
  onPhysicalSerialChange?: (value: string) => void
  onSimChange: (value: string) => void
  onUsernameChange: (value: string) => void
  onRegister?: (payload: RegisterCustomerDevicePayload) => void
  registering?: boolean
  registerError?: string | null
  submitAttempted?: boolean
}

export function PosSubscriptionRenewalSection({
  customer,
  devices,
  devicesLoading = false,
  selectedDevice,
  manual,
  serialNumber,
  physicalSerial = '',
  simNumber,
  username,
  onSelectDevice,
  onManual,
  onClear,
  onSerialChange,
  onPhysicalSerialChange,
  onSimChange,
  onUsernameChange,
  onRegister,
  registering = false,
  registerError = null,
  submitAttempted = false,
}: PosSubscriptionRenewalSectionProps) {
  const [registerOrigin, setRegisterOrigin] = useState<'legacy' | 'external'>('legacy')
  const showIdentityFields = shouldShowRenewalIdentityFields({
    hasCustomer: Boolean(customer),
    deviceCount: devices.length,
    manual,
    hasSelectedDevice: Boolean(selectedDevice),
  })
  const identityLocked = Boolean(selectedDevice?.product_unit_id) && !manual
  const sourceError =
    submitAttempted && Boolean(customer) && !manual && !selectedDevice && devices.length > 0

  return (
    <PosSectionCard
      number={2}
      title="جهاز العميل"
      subtitle={
        customer
          ? 'اختار جهازًا أو تعاقدًا مسجلًا، أو سجّل جهازًا غير موجود في السيستم'
          : 'اختر العميل أو أضفه من بيانات التعاقد أولًا'
      }
      highlighted={sourceError}
      contentClassName="space-y-md p-sm sm:p-md"
    >
      {!customer && (
        <p className="rounded-lg border border-dashed border-outline-variant px-md py-sm text-sm text-on-surface-variant">
          اختر العميل أو أضفه إن لم يكن موجودًا، ثم اختار الجهاز أو سجّله لإكمال التجديد.
        </p>
      )}

      {customer && (
        <CustomerContractDevicePicker
          devices={devices}
          loading={devicesLoading}
          selectedDevice={selectedDevice}
          manual={manual}
          serialNumber={serialNumber}
          physicalSerial={physicalSerial}
          simNumber={simNumber}
          username={username}
          onSelectDevice={onSelectDevice}
          onManual={onManual}
          onClear={onClear}
          onSerialChange={onSerialChange}
          onPhysicalSerialChange={onPhysicalSerialChange}
          onSimChange={onSimChange}
          onUsernameChange={onUsernameChange}
          showIdentityFields={showIdentityFields}
          identityLocked={identityLocked}
          allowSerialEdit={Boolean(selectedDevice)}
          showErrors={submitAttempted}
          registerOrigin={registerOrigin}
          onRegisterOriginChange={setRegisterOrigin}
          onRegister={onRegister}
          registering={registering}
          registerError={registerError}
        />
      )}
    </PosSectionCard>
  )
}
