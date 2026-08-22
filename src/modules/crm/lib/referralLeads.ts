import type { ReferralLeadStatus } from '../../../api/types'

export const REFERRAL_STATUS_META: Record<
  ReferralLeadStatus,
  { label: string; color: string; tint: string; dotClass: string }
> = {
  no_answer: {
    label: 'لم يرد',
    color: '#64748b',
    tint: '#eef1f7',
    dotClass: 'bg-[#64748b]',
  },
  not_interested: {
    label: 'غير مهتم',
    color: '#dc2626',
    tint: '#fdecec',
    dotClass: 'bg-[#dc2626]',
  },
  installation_scheduled: {
    label: 'موعد تركيب مجدول',
    color: '#b45309',
    tint: '#fef3e2',
    dotClass: 'bg-[#b45309]',
  },
  installed: {
    label: 'تم التركيب',
    color: '#15803d',
    tint: '#e7f6ec',
    dotClass: 'bg-[#15803d]',
  },
}

/** Statuses that need extra fields before PATCH — open modal instead of silent update */
export const REFERRAL_STATUSES_NEED_MODAL: ReferralLeadStatus[] = [
  'no_answer',
  'not_interested',
  'installation_scheduled',
]

export const REFERRAL_STATUSES: {
  key: ReferralLeadStatus
  label: string
  color: string
  tint: string
  hex: string
}[] = (
  ['no_answer', 'not_interested', 'installation_scheduled', 'installed'] as ReferralLeadStatus[]
).map((key) => ({
  key,
  label: REFERRAL_STATUS_META[key].label,
  color: REFERRAL_STATUS_META[key].tint,
  tint: REFERRAL_STATUS_META[key].tint,
  hex: REFERRAL_STATUS_META[key].color,
}))

export function referralStatusLabel(status: ReferralLeadStatus | string): string {
  return REFERRAL_STATUS_META[status as ReferralLeadStatus]?.label ?? status
}

export function referralStatusMeta(status: ReferralLeadStatus | string) {
  return (
    REFERRAL_STATUS_META[status as ReferralLeadStatus] ?? {
      label: status,
      color: '#64748b',
      tint: '#eef1f7',
      dotClass: 'bg-[#64748b]',
    }
  )
}

export function formatReferralDateTime(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG', { numberingSystem: 'latn',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function formatReferralRelativeDue(value?: string | null): {
  label: string
  overdue: boolean
} {
  if (!value) return { label: '—', overdue: false }
  const date = new Date(value)
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((startTarget.getTime() - startToday.getTime()) / 86400000)

  if (diffDays < 0) {
    return {
      label: `متأخرة ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'يوم' : 'أيام'}`,
      overdue: true,
    }
  }
  if (diffDays === 0) {
    return {
      label: `اليوم ${date.toLocaleTimeString('ar-EG', { numberingSystem: 'latn', hour: 'numeric', minute: '2-digit' })}`,
      overdue: false,
    }
  }
  if (diffDays === 1) {
    return {
      label: `غداً ${date.toLocaleTimeString('ar-EG', { numberingSystem: 'latn', hour: 'numeric', minute: '2-digit' })}`,
      overdue: false,
    }
  }
  return { label: formatReferralDateTime(value), overdue: false }
}

export function referrerLabel(lead: {
  referred_by_customer?: { name: string } | null
  referred_by_referral_lead?: { phone: string; name?: string | null } | null
}): string {
  if (lead.referred_by_customer?.name) {
    return lead.referred_by_customer.name
  }
  if (lead.referred_by_referral_lead) {
    return lead.referred_by_referral_lead.name || lead.referred_by_referral_lead.phone
  }
  return '—'
}

export function leadDisplayCode(lead: { id: number }): string {
  return `REF-${lead.id}`
}
