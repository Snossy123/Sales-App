import type { InstallmentItem, InstallmentPlan, PaymentTransaction, SalesInvoice } from '../api/types'
import { resolveLinePlan } from './contractFields'
import { formatNumber } from './format'
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

function planIdentity(plan: InstallmentPlan): string {
  if (plan.id != null) return `id:${plan.id}`
  if (plan.sales_invoice_line_id != null) return `line:${plan.sales_invoice_line_id}`
  return 'invoice'
}

/** An invoice-level plan is returned for every line. Count that plan once. */
function uniqueResolvedPlans(invoice: SalesInvoice): InstallmentPlan[] {
  const lines = invoice.lines ?? []
  const seen = new Set<string>()
  const plans: InstallmentPlan[] = []

  const add = (plan: InstallmentPlan | null | undefined) => {
    if (!plan) return
    const key = planIdentity(plan)
    if (seen.has(key)) return
    seen.add(key)
    plans.push(plan)
  }

  if (lines.length > 0) {
    for (const line of lines) add(resolveLinePlan(line, invoice))
  } else {
    add(getInstallmentPlan(invoice))
  }

  return plans
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

export function normalizeInstallmentStatus(
  status: string,
  dueDate?: string | null,
): 'paid' | 'partial' | 'pending' | 'overdue' {
  if (status === 'paid') return 'paid'
  if (status === 'overdue') return 'overdue'
  if (status === 'partial') return 'partial'
  if (dueDate && status !== 'paid') {
    const due = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!Number.isNaN(due.getTime()) && due < today) return 'overdue'
  }
  return 'pending'
}

export type InstallmentStatusLabelItem = Pick<
  InstallmentItem,
  'is_ownership_transferred' | 'ownership_transferred_at' | 'is_suspended' | 'suspended_at'
>

export function installmentStatusLabel(
  status: string,
  dueDate?: string | null,
  item?: InstallmentStatusLabelItem | null,
): string {
  if (item?.is_ownership_transferred || item?.ownership_transferred_at) {
    return 'تم نقل ملكية'
  }
  if (item?.is_suspended || item?.suspended_at) {
    return 'موقوف'
  }
  const normalized = normalizeInstallmentStatus(status, dueDate)
  if (normalized === 'paid') return 'مدفوع'
  if (normalized === 'partial') return 'جزئي'
  if (normalized === 'overdue') return 'متأخر'
  return 'معلق'
}

/** Split OT invoice plans into fee rows vs copied device-balance rows. */
export function splitOwnershipTransferInstallmentItems(invoice: SalesInvoice): {
  feeItems: InstallmentItem[]
  transferredBalanceItems: InstallmentItem[]
} {
  const feeItems: InstallmentItem[] = []
  const transferredBalanceItems: InstallmentItem[] = []
  const seen = new Set<string>()
  const plans: InstallmentPlan[] = []

  const addPlan = (plan: InstallmentPlan | null | undefined) => {
    if (!plan) return
    const key = planIdentity(plan)
    if (seen.has(key)) return
    seen.add(key)
    plans.push(plan)
  }

  // Invoice-level plans include transfer_origin=transferred_balance (no line id).
  for (const plan of invoice.installment_plans ?? []) addPlan(plan)
  const camelPlans = (
    invoice as SalesInvoice & { installmentPlans?: InstallmentPlan[] }
  ).installmentPlans
  for (const plan of camelPlans ?? []) addPlan(plan)
  for (const plan of uniqueResolvedPlans(invoice)) addPlan(plan)

  for (const plan of plans) {
    const rows = plan.items ?? []
    if (rows.length === 0) continue
    if (plan.transfer_origin === 'transferred_balance') {
      transferredBalanceItems.push(...rows)
    } else {
      // ownership_transfer_fee, null, or missing → treat as fees (fallback)
      feeItems.push(...rows)
    }
  }

  if (feeItems.length === 0 && transferredBalanceItems.length === 0) {
    feeItems.push(...(invoice.installment_items ?? []))
  }

  return { feeItems, transferredBalanceItems }
}

export function buildContractSummary(invoice: SalesInvoice): ContractSummary {
  const paidAmount = Number(invoice.paid_amount ?? 0)
  const remaining = Number(invoice.balance_due ?? 0)

  // Cash with a partial down payment stores that amount on the same plan as the deferred rows.
  let downPayment = 0
  let installmentCount = 0

  for (const plan of uniqueResolvedPlans(invoice)) {
    downPayment += Number(plan.down_payment ?? 0)
    installmentCount += Number(plan.installment_count ?? 0)
  }

  return {
    downPayment,
    installmentCount,
    paidAmount,
    remaining,
  }
}

export function getInstallmentItems(invoice: SalesInvoice): InstallmentItem[] {
  const aggregated: InstallmentItem[] = []

  for (const plan of uniqueResolvedPlans(invoice)) {
    if (plan.items?.length) {
      aggregated.push(...plan.items)
    }
  }

  if (aggregated.length > 0) {
    return aggregated
  }

  const plan = getInstallmentPlan(invoice)
  if (plan?.items?.length) {
    return plan.items
  }

  return invoice.installment_items ?? []
}

export interface LegacyScheduleCredit {
  installmentItemId: number
  installmentNumber: number | null
  amount: number
  paidAt: string | null
}

export interface ContractLedger {
  downPayment: number
  downPaymentConfirmed: number
  downPaymentUnverified: number
  installmentPrincipal: number
  confirmedInstallmentPaid: number
  confirmedOutstanding: number
  confirmedOverdue: number
  legacyCredit: number
  legacyCredits: LegacyScheduleCredit[]
  unallocated: number
  confirmedPayments: PaymentTransaction[]
}

function isConfirmedPayment(payment: PaymentTransaction): boolean {
  return payment.status !== 'refunded' && payment.status !== 'void'
}

/** Confirmed money comes only from payment transactions. Schedule paid amounts that no transaction covers stay legacy. */
export function reconcileContractLedger(invoice: SalesInvoice): ContractLedger {
  const items = getInstallmentItems(invoice)
  const downPayment = buildContractSummary(invoice).downPayment
  const confirmedPayments = (invoice.payment_transactions ?? []).filter(isConfirmedPayment)

  const appliedByItem = new Map<number, number>()
  let downApplied = 0
  let unallocated = 0

  for (const payment of confirmedPayments) {
    const amount = Number(payment.amount ?? 0)
    if (payment.installment_item_id != null) {
      const itemId = payment.installment_item_id
      appliedByItem.set(itemId, (appliedByItem.get(itemId) ?? 0) + amount)
      continue
    }
    const room = Math.max(0, downPayment - downApplied)
    const toDown = Math.min(amount, room)
    downApplied += toDown
    unallocated += amount - toDown
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const legacyCredits: LegacyScheduleCredit[] = []
  let confirmedOverdue = 0

  for (const item of items) {
    const confirmed = appliedByItem.get(item.id) ?? 0
    const legacy = Math.max(0, Number(item.paid_amount ?? 0) - confirmed)
    if (legacy > 0.009) {
      legacyCredits.push({
        installmentItemId: item.id,
        installmentNumber: item.installment_number ?? item.sequence ?? null,
        amount: legacy,
        paidAt: item.paid_at ?? null,
      })
    }
    const remainder = Math.max(0, Number(item.amount ?? 0) - confirmed)
    const due = item.due_date ? new Date(item.due_date) : null
    if (due && !Number.isNaN(due.getTime()) && due < today && remainder > 0.009) {
      confirmedOverdue += remainder
    }
  }

  const installmentPrincipal = items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)
  const confirmedInstallmentPaid = [...appliedByItem.values()].reduce((sum, amount) => sum + amount, 0)

  return {
    downPayment,
    downPaymentConfirmed: downApplied,
    downPaymentUnverified: Math.max(0, downPayment - downApplied),
    installmentPrincipal,
    confirmedInstallmentPaid,
    confirmedOutstanding: Math.max(0, installmentPrincipal - confirmedInstallmentPaid),
    confirmedOverdue,
    legacyCredit: legacyCredits.reduce((sum, credit) => sum + credit.amount, 0),
    legacyCredits,
    unallocated,
    confirmedPayments,
  }
}

export function legacyCreditForItem(ledger: ContractLedger, itemId: number): number {
  return ledger.legacyCredits.find((credit) => credit.installmentItemId === itemId)?.amount ?? 0
}

export interface PaymentVerificationInput {
  action: 'link' | 'record'
  installmentItemId?: number | null
  downPayment?: boolean
  paymentTransactionId?: number | null
  amount?: number | null
  paymentMethod?: string | null
  paidAt?: string | null
  collectorUserId?: number | null
}

export function assertPaymentVerification(
  invoice: SalesInvoice,
  input: PaymentVerificationInput,
): { amount: number } {
  const ledger = reconcileContractLedger(invoice)
  const forDownPayment = Boolean(input.downPayment) && input.installmentItemId == null
  const legacy = forDownPayment
    ? ledger.downPaymentUnverified
    : legacyCreditForItem(ledger, Number(input.installmentItemId))

  if (!forDownPayment && (input.installmentItemId == null || legacy <= 0.009)) {
    throw new Error('لا يوجد مبلغ غير مؤكد على هذا القسط')
  }
  if (forDownPayment && ledger.downPaymentUnverified <= 0.009) {
    throw new Error('المقدمة مؤكدة بالفعل')
  }

  if (input.action === 'link') {
    if (forDownPayment) {
      throw new Error('السند غير المرتبط محسوب على المقدمة. سجّل سنداً جديداً للمبلغ غير المؤكد.')
    }
    const payment = (invoice.payment_transactions ?? []).find(
      (row) => row.id === input.paymentTransactionId,
    )
    if (!payment || payment.status === 'refunded' || payment.status === 'void') {
      throw new Error('السند غير متاح للربط')
    }
    if (payment.installment_item_id != null) {
      throw new Error('السند مرتبط بقسط بالفعل')
    }
    const amount = Number(payment.amount ?? 0)
    if (amount <= 0.009 || amount > legacy + 0.009) {
      throw new Error('مبلغ السند لا يطابق السجل غير المؤكد')
    }
    return { amount }
  }

  if (!input.paymentMethod?.trim()) throw new Error('طريقة الدفع مطلوبة')
  if (!input.paidAt?.trim()) throw new Error('تاريخ الدفع مطلوب')
  if (!input.collectorUserId) throw new Error('المحصّل مطلوب')
  const amount = Number(input.amount ?? 0)
  if (amount <= 0.009 || amount > legacy + 0.009) {
    throw new Error('المبلغ أكبر من السجل غير المؤكد')
  }
  return { amount }
}

export function ownershipTransferInstallmentSummary(
  invoice: SalesInvoice,
  targetLineIdOrSerial?: number | string | null,
): {
  paidCount: number
  remaining: number
} {
  const lines = invoice.lines ?? []
  let targetLine = lines.find(
    (l) =>
      (targetLineIdOrSerial && l.id === Number(targetLineIdOrSerial)) ||
      (targetLineIdOrSerial && l.serial_number === String(targetLineIdOrSerial)),
  )

  if (!targetLine && lines.length === 1) {
    targetLine = lines[0]
  }

  if (targetLine) {
    const targetPlan = resolveLinePlan(targetLine, invoice)
    if (targetPlan?.items?.length) {
      const paid = targetPlan.items.filter(
        (item) => Number(item.paid_amount ?? 0) > 0 || item.status === 'paid',
      )
      const remaining = targetPlan.items.reduce(
        (sum, item) => sum + installmentRemainingAmount(item),
        0,
      )
      return { paidCount: paid.length, remaining }
    }

    if (lines.length > 1 && invoice.total) {
      const lineTotal = Number(targetLine.line_total ?? targetLine.unit_price ?? 0)
      const lineShare = lineTotal / Number(invoice.total || 1)
      const lineRemaining = Math.round(Number(invoice.balance_due ?? 0) * lineShare * 100) / 100
      const plan = resolveLinePlan(targetLine, invoice)
      const calculatedRemaining = Math.max(
        0,
        lineRemaining > 0 ? lineRemaining : lineTotal - Number(plan?.down_payment ?? 0),
      )
      return { paidCount: 0, remaining: calculatedRemaining }
    }
  }

  const items = getInstallmentItems(invoice)
  const paid = items.filter(
    (item) => Number(item.paid_amount ?? 0) > 0 || item.status === 'paid',
  )
  let remaining = items.reduce(
    (sum, item) => sum + installmentRemainingAmount(item),
    0,
  )

  if (items.length === 0) {
    remaining = Number(invoice.balance_due ?? 0)
    if (remaining <= 0) {
      const plan = getInstallmentPlan(invoice)
      const lineTotal = Number(invoice.lines?.[0]?.line_total ?? invoice.total ?? 0)
      remaining = Math.max(0, lineTotal - Number(plan?.down_payment ?? 0))
    }
  }

  return { paidCount: paid.length, remaining }
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
  return `${formatNumber(value)} ج.م`
}

export function buildContractSummaryLine(invoice: SalesInvoice): string {
  const contractAmount = Math.max(
    0,
    Number(invoice.total ?? 0) - Number(invoice.transportation_fee ?? 0),
  )
  const parts = [
    formatInvoiceDate(invoice.invoice_date),
    formatContractMoney(contractAmount),
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
