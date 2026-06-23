import type { ZkDevice } from '../../../api/types'

export function branchZkDevice(
  devices: ZkDevice[],
  branchId: number | '' | null | undefined,
): ZkDevice | undefined {
  if (branchId == null || branchId === '') return undefined
  return devices.find((device) => device.branch_id === Number(branchId))
}

export function zkDeviceLabel(device?: ZkDevice | null): string {
  if (!device) return '—'
  return device.name
}

export function zkDeviceOptionLabel(device: ZkDevice): string {
  const branchName = device.branch?.name_ar ?? device.branch?.name ?? `فرع ${device.branch_id}`
  return `${device.name} — ${branchName}`
}
