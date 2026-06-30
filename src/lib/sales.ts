import type { Customer, Distributor, DistributorType, InstallmentItem, SalesInvoice } from '../api/types'
import { formatDate as formatAccountingDate } from './accounting'

export { formatDate } from './accounting'

export const invoiceStatusOptions = [
  { value: '', label: 'كل الحالات' },
  { value: 'pending_review', label: 'بانتظار المراجعة' },
  { value: 'confirmed', label: 'مؤكدة' },
  { value: 'rejected', label: 'مرفوضة' },
] as const

export const paymentStatusOptions = [
  { value: '', label: 'كل حالات السداد' },
  { value: 'unpaid', label: 'غير مدفوع' },
  { value: 'partial', label: 'جزئي' },
  { value: 'paid', label: 'مدفوع' },
] as const

export const paymentTermOptions = [
  { value: '', label: 'كل أنواع الدفع' },
  { value: 'cash', label: 'كاش' },
  { value: 'installment', label: 'تقسيط' },
] as const

export function paymentTermLabel(term?: string | null): string {
  if (term === 'mixed') return 'مختلط'
  if (term === 'installment') return 'تقسيط'
  if (term === 'cash') return 'كاش'
  if (term === 'credit') return 'آجل'
  return term ?? '—'
}

export const installmentStatusOptions = [
  { value: '', label: 'كل الحالات' },
  { value: 'pending', label: 'مستحق' },
  { value: 'overdue', label: 'متأخر' },
  { value: 'partial', label: 'جزئي' },
  { value: 'paid', label: 'مدفوع' },
] as const

export const customerStatusOptions = [
  { value: '', label: 'كل الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'blocked', label: 'محظور' },
] as const

export const distributorStatusOptions = [
  { value: '', label: 'كل الحالات' },
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
] as const

export const distributorFormStatusOptions = distributorStatusOptions.filter((o) => o.value !== '')

export const distributorTypeOptions = [
  { value: 'center', label: 'مركز' },
  { value: 'free', label: 'حر' },
] as const

export const distributorTypeLabels: Record<DistributorType, string> = {
  center: 'مركز',
  free: 'حر',
}

export const invoiceStatusLabels: Record<string, string> = {
  pending_review: 'بانتظار المراجعة',
  confirmed: 'مؤكدة',
  rejected: 'مرفوضة',
}

export const reviewStatusLabels: Record<string, string> = {
  pending: 'بانتظار المراجعة',
  approved: 'تمت المراجعة',
  rejected: 'مرفوضة',
}

export const reviewStatusOptions = [
  { value: '', label: 'كل الحالات' },
  { value: 'pending', label: 'بانتظار المراجعة' },
  { value: 'approved', label: 'تمت المراجعة' },
  { value: 'rejected', label: 'مرفوضة' },
] as const

export function reviewStatusForBadge(reviewStatus?: string | null): string {
  if (reviewStatus === 'approved') return 'review_approved'
  if (reviewStatus === 'rejected') return 'rejected'
  return 'pending_review'
}

export function reviewStatusLabel(reviewStatus?: string | null): string {
  const key = reviewStatus ?? 'pending'
  return reviewStatusLabels[key] ?? reviewStatusLabels.pending
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface ApiPaginated<T> {
  data: T[]
  meta?: PaginationMeta
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
}

export function paginatedMeta(response: ApiPaginated<unknown>): PaginationMeta {
  if (response.meta) {
    return response.meta
  }

  return {
    current_page: response.current_page ?? 1,
    last_page: response.last_page ?? 1,
    per_page: response.per_page ?? response.data.length,
    total: response.total ?? response.data.length,
  }
}

type InstallmentLike = InstallmentItem & {
  sequence?: number
  sales_invoice?: {
    id?: number
    invoice_number?: string
    branch_id?: number
    customer?: { name?: string; phone?: string }
  }
}

export function normalizeInstallmentItem(item: InstallmentLike): InstallmentItem {
  const amount = Number(item.amount)
  const paidAmount = Number(item.paid_amount ?? 0)
  const remaining =
    item.remaining ?? Math.max(0, amount - paidAmount)

  return {
    ...item,
    sales_invoice_id:
      item.sales_invoice_id ?? item.sales_invoice?.id,
    branch_id: item.branch_id ?? item.sales_invoice?.branch_id,
    installment_number:
      item.installment_number ?? item.sequence ?? 0,
    customer_name:
      item.customer_name ?? item.sales_invoice?.customer?.name,
    customer_phone:
      item.customer_phone ?? item.sales_invoice?.customer?.phone,
    customer_phones: item.customer_phones ?? [
      item.sales_invoice?.customer?.phone,
      (item.sales_invoice?.customer as Customer | undefined)?.phone_2,
      (item.sales_invoice?.customer as Customer | undefined)?.phone_3,
    ].filter(Boolean) as string[],
    display_tier: item.display_tier,
    late_fee_accrued: item.late_fee_accrued,
    total_due: item.total_due ?? remaining,
    invoice_number:
      item.invoice_number ?? item.sales_invoice?.invoice_number,
    remaining,
  }
}

export function formatInvoiceDate(value: string | null | undefined): string {
  return formatAccountingDate(value)
}

export function distributorLabel(distributor?: Distributor | null): string {
  if (!distributor) return '—'
  return distributor.name_ar || distributor.name || distributor.code
}

export function distributorTypeLabel(type?: DistributorType | string | null): string {
  if (type === 'center' || type === 'free') {
    return distributorTypeLabels[type]
  }
  return '—'
}

export function distributorContractCustomerCount(
  distributor: Distributor,
  invoices?: SalesInvoice[],
): number {
  if (distributor.contract_customers_count != null) {
    return Number(distributor.contract_customers_count)
  }
  if (invoices?.length) {
    return new Set(
      invoices.map((invoice) => invoice.customer_id).filter((id): id is number => id != null),
    ).size
  }
  return 0
}

export function distributorContractsCount(
  distributor: Distributor,
  invoices?: SalesInvoice[],
): number {
  if (distributor.sales_invoices_count != null) {
    return Number(distributor.sales_invoices_count)
  }
  return invoices?.length ?? 0
}

export function formatDistributorAgreedAmount(value?: string | number | null): string {
  return `${Number(value ?? 0).toLocaleString('ar-EG')} ج.م`
}

export function contractPrintPath(
  invoiceId: number,
  options?: { autoPrint?: boolean; lineId?: number },
): string {
  const params = new URLSearchParams()
  if (options?.autoPrint) params.set('print', '1')
  if (options?.lineId) params.set('line', String(options.lineId))
  const qs = params.toString()
  return `/invoices/${invoiceId}/contract-print${qs ? `?${qs}` : ''}`
}

export function serviceContractPrintPath(
  invoiceId: number,
  lineId: number,
  options?: { autoPrint?: boolean },
): string {
  const params = new URLSearchParams()
  if (options?.autoPrint) params.set('print', '1')
  const qs = params.toString()
  return `/invoices/${invoiceId}/service-contract/${lineId}${qs ? `?${qs}` : ''}`
}

export function isServiceInvoiceLine(line: { product_unit_id?: number | null }): boolean {
  return !line.product_unit_id
}

/** يُحسب المقدم تلقائياً: الإجمالي − (قيمة القسط × عدد الأقساط) */
export function computeInstallmentDownPayment(
  total: number,
  installmentAmount: number,
  installmentCount: number,
): number {
  const financed = installmentAmount * installmentCount
  return Math.max(0, Math.round((total - financed) * 100) / 100)
}

/** يُحسب عدد الأقساط تلقائياً من المقدم وقيمة القسط */
export function computeInstallmentCount(
  total: number,
  installmentAmount: number,
  downPayment: number,
  maxCount = 24,
): number {
  if (installmentAmount <= 0 || total <= 0) return 0
  const financed = Math.max(0, total - downPayment)
  if (financed <= 0) return 0
  const count = Math.ceil((financed - 0.001) / installmentAmount)
  return Math.min(maxCount, Math.max(1, count))
}

export function computeMinDownPayment(total: number, minPercent = 10): number {
  return Math.round(total * (minPercent / 100) * 100) / 100
}

export function suggestInstallmentAmount(
  total: number,
  installmentCount: number,
  minDownPercent = 10,
): number {
  if (installmentCount < 1 || total <= 0) return 0
  const minDown = computeMinDownPayment(total, minDownPercent)
  const financed = Math.max(0, total - minDown)
  return Math.floor((financed / installmentCount) * 100) / 100
}
