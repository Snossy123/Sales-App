import type { ContractKind } from '../api/types'

export type { ContractKind }

export const CONTRACT_KINDS: { value: ContractKind; label: string; description: string }[] = [
  {
    value: 'new_contract',
    label: 'تعاقد جديد',
    description: 'بيع جهاز GPS جديد من مخزون الشركة',
  },
  {
    value: 'subscription_renewal',
    label: 'تجديد اشتراك',
    description: 'تجديد اشتراك جهاز موجود — السعر 25% من سعر الجهاز كاش',
  },
  {
    value: 'external_device',
    label: 'جهاز خارج الشركة',
    description: 'إضافة جهاز لم يُبَع من الشركة إلى النظام',
  },
  {
    value: 'ownership_transfer',
    label: 'نقل ملكية',
    description: 'نقل ملكية الجهاز من عميل إلى آخر',
  },
]

export const REVIEW_CONTRACT_KIND_OPTIONS = [
  { value: '', label: 'كل أنواع الخدمة' },
  ...CONTRACT_KINDS.map(({ value, label }) => ({ value, label })),
]

const KIND_LABELS = CONTRACT_KINDS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {} as Record<ContractKind, string>,
)

export function contractKindLabel(kind?: string | null): string {
  if (!kind) return KIND_LABELS.new_contract
  return KIND_LABELS[kind as ContractKind] ?? kind
}

export function allowsManualDeviceEntry(kind: ContractKind): boolean {
  return kind !== 'new_contract'
}

export function reviewApproveLabel(kind?: string | null): string {
  if (kind === 'ownership_transfer') {
    return `اعتماد ${contractKindLabel(kind)}`
  }
  if (kind === 'external_device') {
    return `اعتماد ${contractKindLabel(kind)}`
  }
  if (kind === 'subscription_renewal') {
    return `اعتماد ${contractKindLabel(kind)}`
  }
  return 'تأكيد وإرسال الأقساط'
}

export function subscriptionRenewalUnitPrice(cashPrice: number): number {
  return Math.round(cashPrice * 0.25 * 100) / 100
}

export function unitPriceForContractKind(
  contractKind: ContractKind,
  cashPrice: number,
  installmentPrice: number,
  paymentTerm: 'cash' | 'installment',
): number {
  if (contractKind === 'subscription_renewal') {
    return subscriptionRenewalUnitPrice(cashPrice)
  }
  return paymentTerm === 'cash' ? cashPrice : installmentPrice
}
