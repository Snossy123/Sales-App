export const INVENTORY_BUCKET_LABELS: Record<string, string> = {
  new: 'جديدة',
  custody_customer: 'أجهزة عملاء',
  custody_software: 'سوفت',
  custody_maintenance: 'صيانة',
  custody_branch_tracking: 'متابعة فرع',
}

/** عناوين أقسام مخزون الفرع */
export const INVENTORY_BUCKET_SECTION_LABELS: Record<string, string> = {
  new: 'جديدة',
  custody_customer: 'عهدة — أجهزة عملاء',
  custody_software: 'عهدة — سوفت',
  custody_maintenance: 'عهدة — صيانة',
  custody_branch_tracking: 'عهدة — متابعة فرع',
}

export const PRODUCT_UNIT_STATE_LABELS: Record<string, string> = {
  available: 'متاح',
  sold: 'مباع',
  maintenance: 'صيانة',
  in_transfer: 'قيد النقل',
  pending: 'قيد المراجعة',
  returned: 'مرتجع',
  exchanged: 'مستبدل',
}

export const CUSTODY_BUCKET_OPTIONS = [
  { value: 'custody_customer', label: 'أجهزة عملاء' },
  { value: 'custody_software', label: 'سوفت' },
  { value: 'custody_maintenance', label: 'صيانة' },
] as const

export function inventoryBucketLabel(bucket?: string | null): string | null {
  if (!bucket) return null
  return INVENTORY_BUCKET_LABELS[bucket] ?? bucket
}

export function productUnitStateLabel(state?: string | null): string | null {
  if (!state) return null
  return PRODUCT_UNIT_STATE_LABELS[state] ?? state
}

export function maintenanceVisitStatusLabel(unit: {
  maintenance_entered_on?: string | null
  maintenance_exited_on?: string | null
}): string {
  if (unit.maintenance_exited_on) return 'خلص صيانة'
  if (unit.maintenance_entered_on) return 'راح الصيانة'
  return 'لم يدخل'
}

export function formatVisitDate(value?: string | null): string {
  if (!value) return '—'
  const date = value.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return date
  return `${match[3]}/${match[2]}/${match[1]}`
}

export function productUnitDisplayCode(unit: {
  serial_number?: string | null
  imei?: string | null
  id?: number
}): string {
  return unit.serial_number ?? unit.imei ?? `#${unit.id ?? '?'}`
}
