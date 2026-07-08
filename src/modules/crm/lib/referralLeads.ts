import type { ReferralLeadStatus } from '../../../api/types'

export const REFERRAL_STATUSES: {
  key: ReferralLeadStatus
  label: string
  color: string
}[] = [
  { key: 'no_answer', label: 'لم يرد', color: 'bg-surface-container-high' },
  { key: 'not_interested', label: 'غير مهتم', color: 'bg-error/10' },
  { key: 'installation_scheduled', label: 'موعد تركيب مجدول', color: 'bg-[#ef9900]/10' },
  { key: 'installed', label: 'تم التركيب', color: 'bg-secondary/10' },
]

export function referralStatusLabel(status: ReferralLeadStatus | string): string {
  return REFERRAL_STATUSES.find((s) => s.key === status)?.label ?? status
}

export function formatReferralDateTime(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
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
