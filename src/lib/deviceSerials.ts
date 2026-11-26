export interface DeviceSerialFields {
  serial_number?: string | null
  physical_serial?: string | null
}

export interface DeviceSerialDisplay {
  primary: string
  current: string
  changed: boolean
  label: string
}

export function describeDeviceSerials(device: DeviceSerialFields): DeviceSerialDisplay {
  const current = device.serial_number?.trim() ?? ''
  const physical = device.physical_serial?.trim() ?? ''
  const primary = physical || current
  const changed = Boolean(physical && current && physical !== current)

  if (changed) {
    return {
      primary,
      current,
      changed: true,
      label: `السيريال الأساسية: ${primary} — تم تغييرها إلى: ${current}`,
    }
  }

  return {
    primary,
    current,
    changed: false,
    label: `السيريال الأساسية: ${primary || 'غير مسجل'}`,
  }
}
