import type { CheckoutPayload, Service, ServiceCategory } from '../api/types'
import type { ServiceLineDraft } from '../components/services/ServiceLineCard'

export type CombinerChipId =
  | 'annual_renewal'
  | 'external_device'
  | 'uninstall'
  | 'installation'
  | 'programming'
  | 'software'

export const COMBINER_CHIPS: { id: CombinerChipId; label: string }[] = [
  { id: 'annual_renewal', label: 'تجديد اشتراك سنوي' },
  { id: 'external_device', label: 'جهاز خارج الشركة' },
  { id: 'uninstall', label: 'فك' },
  { id: 'installation', label: 'تركيب' },
  { id: 'programming', label: 'برمجة' },
  { id: 'software', label: 'سوفت' },
]

export type CombinerFeeChipId = Exclude<CombinerChipId, 'annual_renewal' | 'external_device'>

export interface FeeLineInstance {
  key: string
  chipId: CombinerFeeChipId
  line: ServiceLineDraft
  productUnitId?: number
}

function isFeeChipId(value: unknown): value is CombinerFeeChipId {
  return COMBINER_FEE_CHIPS.some((chip) => chip.id === value)
}

function uniqueFeeLinesByChip(items: FeeLineInstance[]): FeeLineInstance[] {
  const seen = new Set<CombinerFeeChipId>()
  return items.filter((item) => {
    if (!isFeeChipId(item.chipId) || seen.has(item.chipId)) return false
    seen.add(item.chipId)
    return true
  })
}

export function normalizeFeeLineInstances(raw: unknown): FeeLineInstance[] {
  if (Array.isArray(raw)) {
    return uniqueFeeLinesByChip(
      raw.filter(
        (item): item is FeeLineInstance =>
          Boolean(item && typeof item === 'object' && 'key' in item && 'chipId' in item && 'line' in item),
      ),
    )
  }
  if (raw && typeof raw === 'object') {
    return uniqueFeeLinesByChip(
      Object.entries(raw as Record<string, ServiceLineDraft>).flatMap(([chipId, line]) => {
        if (!isFeeChipId(chipId) || !line) return []
        return [
          {
            key: chipId,
            chipId,
            line,
            productUnitId: undefined,
          },
        ]
      }),
    )
  }
  return []
}

export function newFeeLineKey(): string {
  return `fee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export type CombinerAccessoryLine = {
  key: string
  line_type: 'accessory' | 'package'
  product_model_id?: number
  accessory_package_id?: number
  name: string
  quantity: number
  unitSellPrice: number
  line: ServiceLineDraft
}

export function newAccessoryLineKey(prefix: string, id: number): string {
  return `${prefix}-${id}-${Date.now().toString(36)}`
}

export function accessoryLineTotal(item: CombinerAccessoryLine): number {
  return Math.max(0, item.unitSellPrice * item.quantity)
}

export function normalizeAccessoryLines(raw: unknown): CombinerAccessoryLine[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is CombinerAccessoryLine =>
    Boolean(
      item &&
        typeof item === 'object' &&
        'key' in item &&
        'line_type' in item &&
        'name' in item &&
        'line' in item,
    ),
  )
}

export const COMBINER_FEE_CHIPS: {
  id: CombinerFeeChipId
  label: string
  code: string
  category: ServiceCategory
  nameHint?: string
}[] = [
  { id: 'uninstall', label: 'فك', code: 'SRV-FK', category: 'uninstall' },
  { id: 'installation', label: 'تركيب', code: 'SRV-TRK', category: 'installation' },
  { id: 'programming', label: 'برمجة', code: 'SRV-SIM', category: 'software', nameHint: 'برمجة' },
  { id: 'software', label: 'سوفت', code: 'SRV-SFT', category: 'software', nameHint: 'سوفت' },
]

export function findCombinerService(
  services: Service[],
  chip: (typeof COMBINER_FEE_CHIPS)[number],
): Service | undefined {
  const byCode = services.find((service) => service.code === chip.code && service.is_active)
  if (byCode) return byCode

  const inCategory = services.filter(
    (service) => service.category === chip.category && service.is_active,
  )
  if (chip.nameHint) {
    const hinted = inCategory.find((service) =>
      `${service.name_ar ?? ''} ${service.name}`.includes(chip.nameHint!),
    )
    if (hinted) return hinted
  }

  return inCategory[0]
}

export function deriveCombinerContractKind(selected: Set<CombinerChipId>): CheckoutPayload['contract_kind'] {
  const hasRenewal = selected.has('annual_renewal')
  const hasExternal = selected.has('external_device')
  const hasFee = COMBINER_FEE_CHIPS.some((chip) => selected.has(chip.id))

  const typeCount = Number(hasRenewal) + Number(hasExternal) + Number(hasFee)
  if (typeCount > 1 || (hasFee && !hasRenewal && !hasExternal)) return 'mixed'
  if (hasRenewal) return 'subscription_renewal'
  if (hasExternal) return 'external_device'
  return 'mixed'
}
