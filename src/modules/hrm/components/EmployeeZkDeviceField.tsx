import type { ZkDevice } from '../../../api/types'
import { zkDeviceOptionLabel } from '../lib/zkDevice'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

interface EmployeeZkDeviceFieldProps {
  value: number | ''
  onChange: (deviceId: number | '') => void
  devices: ZkDevice[]
  isLoading?: boolean
}

export function EmployeeZkDeviceField({
  value,
  onChange,
  devices,
  isLoading,
}: EmployeeZkDeviceFieldProps) {
  const activeDevices = devices.filter((device) => device.is_active !== false)

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
      disabled={isLoading}
      aria-label="جهاز البصمة"
      className={inputClass}
    >
      <option value="">{isLoading ? 'جاري التحميل...' : 'اختر جهاز بصمة'}</option>
      {activeDevices.map((device) => (
        <option key={device.id} value={device.id}>
          {zkDeviceOptionLabel(device)}
        </option>
      ))}
    </select>
  )
}
