import type { InstallmentItem, SalesInvoice } from '../api/types'
import { resolveLinePlan } from './contractFields'
import { formatInvoiceDate } from './sales'

export type ContractStatusFilter = 'confirmed' | 'unconfirmed' | 'all'

export interface ContractSummary {
  downPayment: number
  installmentCount: number
  paidAmount: number
  remaining: number
}

function getInstallmentPlan(invoice: SalesInvoice) {
  return resolveLinePlan(invoice.lines?.[0], invoice)
}

export function filterContracts(
  invoices: SalesInvoice[],
  statusFilter: ContractStatusFilter,
): SalesInvoice[] {
  if (statusFilter === 'all') {
    return invoices
  }

  if (statusFilter === 'confirmed') {
    return invoices.filter((invoice) => invoice.status === 'confirmed')
  }

  return invoices.filter((invoice) => invoice.status !== 'confirmed')
}

export function formatPaymentTerm(term: string): string {
  return term === 'installment' ? 'قسط' : 'كاش'
}

export function formatIntervalType(type?: string | null): string | null {
  if (!type) return null
  if (type === 'monthly') return 'شهري'
  if (type === 'weekly') return 'أسبوعي'
  return type
}

export function normalizeInstallmentStatus(status: string): 'paid' | 'partial' | 'pending' {
  if (status === 'paid') return 'paid'
  if (status === 'partial') return 'partial'
  return 'pending'
}

export function installmentStatusLabel(status: string): string {
  const normalized = normalizeInstallmentStatus(status)
  if (normalized === 'paid') return 'مدفوع'
  if (normalized === 'partial') return 'جزئي'
  return 'معلق'
}

export function buildContractSummary(invoice: SalesInvoice): ContractSummary {
  const paidAmount = Number(invoice.paid_amount ?? 0)
  const remaining = Number(invoice.balance_due ?? 0)

  if (invoice.payment_term !== 'installment') {
    return {
      downPayment: 0,
      installmentCount: 0,
      paidAmount,
      remaining,
    }
  }

  const lines = invoice.lines ?? []
  let downPayment = 0
  let installmentCount = 0

  if (lines.length > 0) {
    for (const line of lines) {
      const plan = resolveLinePlan(line, invoice)
      if (plan) {
        downPayment += Number(plan.down_payment ?? 0)
        installmentCount += Number(plan.installment_count ?? 0)
      }
    }
  } else {
    const plan = getInstallmentPlan(invoice)
    downPayment = Number(plan?.down_payment ?? 0)
    installmentCount = Number(plan?.installment_count ?? 0)
  }

  return {
    downPayment,
    installmentCount,
    paidAmount,
    remaining,
  }
}

export function getInstallmentItems(invoice: SalesInvoice): InstallmentItem[] {
  const lines = invoice.lines ?? []
  const aggregated: InstallmentItem[] = []

  for (const line of lines) {
    const plan = resolveLinePlan(line, invoice)
    if (plan?.items?.length) {
      aggregated.push(...plan.items)
    }
  }

  if (aggregated.length > 0) {
    return aggregated
  }

  const plan = getInstallmentPlan(invoice)
  return plan?.items ?? []
}

export function paymentStatusLabel(status?: string | null): string {
  if (status === 'paid') return 'مدفوع بالكامل'
  if (status === 'partial') return 'مدفوع جزئياً'
  return 'غير مدفوع'
}

export function installmentRemainingAmount(item: InstallmentItem): number {
  return Math.max(0, Number(item.amount) - Number(item.paid_amount ?? 0))
}

export function formatContractMoney(value: number): string {
  return `${value.toLocaleString('ar-EG')} ج.م`
}

export function buildContractSummaryLine(invoice: SalesInvoice): string {
  const parts = [
    formatInvoiceDate(invoice.invoice_date),
    formatContractMoney(Number(invoice.total)),
    formatPaymentTerm(invoice.payment_term),
  ]

  if (invoice.payment_term === 'installment') {
    const interval = formatIntervalType(getInstallmentPlan(invoice)?.interval_type)
    if (interval) {
      parts.push(interval)
    }
  }

  if (invoice.payment_status) {
    parts.push(paymentStatusLabel(invoice.payment_status))
  }

  return parts.join(' · ')
}

export function invoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed: 'مؤكدة',
    pending_review: 'بانتظار المراجعة',
    rejected: 'مرفوضة',
  }
  return labels[status] ?? status
}

export function getInstallmentNumber(item: InstallmentItem): number {
  return (
    item.installment_number ??
    (item as InstallmentItem & { sequence?: number }).sequence ??
    0
  )
}
