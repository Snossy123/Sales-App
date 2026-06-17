import type { InstallmentItem, InstallmentPlan, SalesInvoice } from '../api/types'
import { formatInvoiceDate } from './sales'

export type ContractStatusFilter = 'confirmed' | 'unconfirmed' | 'all'

export interface ContractSummary {
  downPayment: number
  installmentCount: number
  paidAmount: number
  remaining: number
}

function getInstallmentPlan(invoice: SalesInvoice): InstallmentPlan | null | undefined {
  return (
    invoice.installment_plan ??
    (invoice as SalesInvoice & { installmentPlan?: InstallmentPlan | null }).installmentPlan
  )
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

export function buildContractSummary(invoice: SalesInvoice): ContractSummary | null {
  if (invoice.payment_term !== 'installment') {
    return null
  }

  const plan = getInstallmentPlan(invoice)
  if (!plan) {
    return null
  }

  return {
    downPayment: Number(plan.down_payment ?? 0),
    installmentCount: Number(plan.installment_count ?? 0),
    paidAmount: Number(invoice.paid_amount ?? 0),
    remaining: Number(invoice.balance_due ?? 0),
  }
}

export function getInstallmentItems(invoice: SalesInvoice): InstallmentItem[] {
  const plan = getInstallmentPlan(invoice)
  return plan?.items ?? []
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
