import type { ReferralLeadReportByUser, ReferralLeadReportSummary } from '../../../api/types'
import { REFERRAL_STATUSES } from './referralLeads'

export type ReferralReportPeriod = 'week' | 'month' | 'quarter' | 'year' | 'custom'

export interface ReferralReportDateRange {
  from: string
  to: string
}

const PERIOD_OPTIONS: { id: ReferralReportPeriod; label: string }[] = [
  { id: 'week', label: 'آخر 7 أيام' },
  { id: 'month', label: 'آخر 30 يوم' },
  { id: 'quarter', label: 'آخر 3 أشهر' },
  { id: 'year', label: 'آخر سنة' },
  { id: 'custom', label: 'فترة مخصصة' },
]

export function getReferralReportPeriodOptions() {
  return PERIOD_OPTIONS
}

function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getReferralReportDateRange(period: ReferralReportPeriod): ReferralReportDateRange {
  const to = new Date()
  const from = new Date()

  switch (period) {
    case 'week':
      from.setDate(to.getDate() - 7)
      break
    case 'month':
      from.setDate(to.getDate() - 30)
      break
    case 'quarter':
      from.setMonth(to.getMonth() - 3)
      break
    case 'year':
      from.setFullYear(to.getFullYear() - 1)
      break
    default:
      from.setMonth(to.getMonth() - 3)
  }

  return { from: toLocalIsoDate(from), to: toLocalIsoDate(to) }
}

export function formatReportDateLabel(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const SUMMARY_KEY_BY_STATUS: Record<string, keyof ReferralLeadReportSummary> = {
  no_answer: 'no_answer',
  not_interested: 'not_interested',
  installation_scheduled: 'installation_scheduled',
  installed: 'installed',
}

const STATUS_BAR_COLORS: Record<string, string> = {
  no_answer: 'bg-on-surface-variant',
  not_interested: 'bg-error',
  installation_scheduled: 'bg-[#ef9900]',
  installed: 'bg-secondary',
}

export function buildStatusBreakdown(summary: ReferralLeadReportSummary) {
  const total = summary.total || 1

  return REFERRAL_STATUSES.map((status) => {
    const key = SUMMARY_KEY_BY_STATUS[status.key]
    const count = summary[key] ?? 0
    return {
      key: status.key,
      label: status.label,
      count,
      percent: summary.total > 0 ? Math.round((count / total) * 100) : 0,
      barColor: STATUS_BAR_COLORS[status.key] ?? 'bg-primary',
    }
  })
}

export function userConversionRate(row: ReferralLeadReportByUser): number {
  const total = Number(row.total) || 0
  const installed = Number(row.installed) || 0
  if (total === 0) return 0
  return Math.round((installed / total) * 100)
}
