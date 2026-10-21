import type { InstallmentItem, SalesInvoice, SalesInvoiceLine } from '../api/types'
import { fmtContractDate } from './contractFields'

export interface OwnershipTransferFinancialBreakdown {
  transferDate: string
  ownershipTransferFee: number
  subscriptionRenewalFee: number
  disassemblyInstallationFee: number
  remainingInstallmentsOnSource: number
  paidAmount: number
  remainingBalance: number
  paymentScheduleText: string | null
}

function lineAmount(line: SalesInvoiceLine): number {
  const total = line.line_total != null ? Number(line.line_total) : NaN
  if (Number.isFinite(total)) {
    return Math.max(0, total)
  }
  const qty = Number(line.quantity ?? 1)
  const unit = Number(line.unit_price ?? 0)
  const discount = Number(line.discount ?? 0)
  return Math.max(0, unit * qty - discount)
}

function isServiceLine(line: SalesInvoiceLine): boolean {
  if (line.line_type === 'service' || line.service_id) {
    return true
  }
  return line.line_type !== 'device' && lineAmount(line) > 0
}

export function resolveServiceCategory(line: SalesInvoiceLine): string {
  const fromService = line.service?.category
  if (fromService) {
    return fromService
  }
  const desc = (line.description ?? '').toLowerCase()
  if (desc.includes('نقل ملكية') || desc.includes('ownership')) {
    return 'ownership_transfer'
  }
  if (desc.includes('اشتراك') || desc.includes('subscription')) {
    return 'subscription'
  }
  if (desc.includes('فك') || desc.includes('uninstall')) {
    return 'uninstall'
  }
  if (desc.includes('تركيب') || desc.includes('installation')) {
    return 'installation'
  }
  return 'other'
}

export function sumLinesByCategories(
  lines: SalesInvoiceLine[] | undefined,
  categories: string[],
): number {
  if (!lines?.length) {
    return 0
  }
  const set = new Set(categories)
  return lines.reduce((sum, line) => {
    if (!isServiceLine(line)) {
      return sum
    }
    const category = resolveServiceCategory(line)
    if (!set.has(category)) {
      return sum
    }
    return sum + lineAmount(line)
  }, 0)
}

function remainingOnSource(invoice: SalesInvoice): number {
  const fromRecord = invoice.ownership_transfer_record?.remaining_balance_at_transfer
  if (fromRecord != null && fromRecord !== '') {
    return Math.max(0, Number(fromRecord))
  }
  const fromSource = invoice.source_invoice?.balance_due
  if (fromSource != null && fromSource !== '') {
    return Math.max(0, Number(fromSource))
  }
  return 0
}

function intervalLabel(intervalType?: string | null): string {
  if (intervalType === 'weekly') {
    return 'أسبوعياً'
  }
  return 'شهرياً'
}

function buildScheduleFromPlan(
  intervalType: string | undefined | null,
  firstDueDate: string | undefined | null,
): string | null {
  if (!firstDueDate) {
    return null
  }
  const date = fmtContractDate(firstDueDate)
  if (date === '—') {
    return null
  }
  return `يتم الدفع ${intervalLabel(intervalType)} — تاريخ أول قسط: ${date}`
}

function findTransferServiceInstallmentPlan(invoice: SalesInvoice) {
  for (const line of invoice.lines ?? []) {
    if (!isServiceLine(line)) {
      continue
    }
    if (line.payment_term !== 'installment' && !line.installment_plan) {
      continue
    }
    const plan = line.installment_plan
    if (plan?.first_due_date) {
      return plan
    }
  }
  for (const plan of invoice.installment_plans ?? []) {
    if (plan.first_due_date) {
      return plan
    }
  }
  if (invoice.installment_plan?.first_due_date) {
    return invoice.installment_plan
  }
  return null
}

function findNextUnpaidSourceItem(invoice: SalesInvoice): InstallmentItem | null {
  const source = invoice.source_invoice
  if (!source) {
    return null
  }
  const items: InstallmentItem[] = []
  for (const plan of source.installment_plans ?? []) {
    if (plan.items?.length) {
      items.push(...plan.items)
    }
  }
  if (source.installment_plan?.items?.length) {
    items.push(...source.installment_plan.items)
  }
  if (source.installment_items?.length) {
    items.push(...source.installment_items)
  }
  const unpaid = items
    .filter((item) => {
      const status = (item.status ?? '').toLowerCase()
      if (status === 'paid') {
        return false
      }
      const amount = Number(item.amount ?? 0)
      const paid = Number(item.paid_amount ?? 0)
      return amount - paid > 0.009
    })
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
  return unpaid[0] ?? null
}

function resolvePaymentScheduleText(invoice: SalesInvoice): string | null {
  const transferPlan = findTransferServiceInstallmentPlan(invoice)
  if (transferPlan) {
    const text = buildScheduleFromPlan(transferPlan.interval_type, transferPlan.first_due_date)
    if (text) {
      return text
    }
  }

  const nextItem = findNextUnpaidSourceItem(invoice)
  if (nextItem?.due_date) {
    const sourcePlan =
      invoice.source_invoice?.installment_plans?.[0] ??
      invoice.source_invoice?.installment_plan
    const interval = sourcePlan?.interval_type ?? 'monthly'
    return buildScheduleFromPlan(interval, nextItem.due_date)
  }

  return null
}

export function buildOwnershipTransferFinancialBreakdown(
  invoice: SalesInvoice,
): OwnershipTransferFinancialBreakdown {
  const lines = invoice.lines ?? []
  const ownershipTransferFee = sumLinesByCategories(lines, ['ownership_transfer'])
  const subscriptionRenewalFee = sumLinesByCategories(lines, ['subscription'])
  const disassemblyInstallationFee = sumLinesByCategories(lines, ['uninstall', 'installation'])
  const remainingInstallmentsOnSource = remainingOnSource(invoice)
  const paidAmount = Math.max(0, Number(invoice.paid_amount ?? 0))
  const transferBalanceDue = Math.max(0, Number(invoice.balance_due ?? 0))
  const remainingBalance = Math.max(0, transferBalanceDue + remainingInstallmentsOnSource)

  return {
    transferDate: fmtContractDate(invoice.invoice_date),
    ownershipTransferFee,
    subscriptionRenewalFee,
    disassemblyInstallationFee,
    remainingInstallmentsOnSource,
    paidAmount,
    remainingBalance,
    paymentScheduleText: resolvePaymentScheduleText(invoice),
  }
}
