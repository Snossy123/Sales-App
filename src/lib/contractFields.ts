import type {
  Customer,
  InstallmentItem,
  InstallmentPlan,
  PaymentTransaction,
  SalesInvoice,
  SalesInvoiceLine,
} from '../api/types'
import { formatInvoiceDate } from './sales'

export const vehicleTypeLabels: Record<string, string> = {
  car: 'سيارة',
  tuk_tuk: 'توك توك',
  motorcycle: 'دراجة',
  other: 'أخرى',
}

export const renewalTypeLabels: Record<string, string> = {
  annual: 'سنوي',
  permanent: 'مدى الحياة',
}

export const intervalTypeLabels: Record<string, string> = {
  monthly: 'شهري',
  weekly: 'أسبوعي',
}

export function fmtContractMoney(value: string | number | null | undefined, suffix = true): string {
  if (value == null || value === '') return '—'
  const formatted = `${Number(value).toLocaleString('ar-EG')} ج.م`
  return suffix ? formatted : Number(value).toLocaleString('ar-EG')
}

export function fmtContractDate(value: string | null | undefined): string {
  if (!value) return '—'
  return formatInvoiceDate(value)
}

export function displayValue(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—'
  return String(value)
}

export function resolveInvoiceLine(invoice: SalesInvoice, lineId?: number): SalesInvoiceLine | undefined {
  const lines = invoice.lines ?? []
  if (!lines.length) return undefined
  if (lineId) {
    return lines.find((line) => line.id === lineId) ?? lines[0]
  }
  return lines[0]
}

export function resolveSerial(line?: SalesInvoiceLine, customer?: Customer | null): string {
  return (
    line?.serial_number ??
    line?.product_unit?.serial_number ??
    line?.product_unit?.imei ??
    customer?.device_serial ??
    ''
  )
}

export function resolveImei(line?: SalesInvoiceLine): string {
  return line?.product_unit?.imei ?? ''
}

export function resolveProductModelName(line?: SalesInvoiceLine): string {
  const model = line?.product_unit?.product_model
  if (model?.name_ar || model?.name) {
    return model.name_ar ?? model.name ?? ''
  }
  return line?.product_name_ar ?? ''
}

export function resolveSim(line?: SalesInvoiceLine, customer?: Customer | null): string {
  return line?.sim_number ?? customer?.sim_number ?? ''
}

export function resolveVehicle(line?: SalesInvoiceLine, invoice?: SalesInvoice): string {
  if (line?.vehicle_info) return line.vehicle_info
  if (line?.vehicle_type === 'car' || line?.vehicle_type === 'motorcycle') {
    return `${line.vehicle_plate_letters ?? ''} ${line.vehicle_plate_numbers ?? ''}`.trim()
  }
  if (line?.vehicle_type === 'tuk_tuk') {
    return `شاسيه: ${line.chassis_number ?? ''} — موتور: ${line.engine_number ?? ''}`.trim()
  }
  return invoice?.vehicle_info ?? ''
}

export function resolveUsername(line?: SalesInvoiceLine, customer?: Customer | null): string {
  return line?.username ?? customer?.username ?? ''
}

export function resolveTechnician(line?: SalesInvoiceLine, invoice?: SalesInvoice): string {
  return line?.technician?.name ?? invoice?.technician_name ?? ''
}

type InstallmentPlanCarrier = {
  installment_plan?: InstallmentPlan | null
  installmentPlan?: InstallmentPlan | null
  installment_plans?: InstallmentPlan[]
  installmentPlans?: InstallmentPlan[]
}

export function resolveLinePlan(
  line?: SalesInvoiceLine,
  invoice?: SalesInvoice | null,
): InstallmentPlan | null | undefined {
  if (!line && !invoice) return undefined

  const linePlan =
    line?.installment_plan ??
    (line as SalesInvoiceLine & { installmentPlan?: InstallmentPlan | null })?.installmentPlan
  if (linePlan) return linePlan

  const carrier = invoice as (SalesInvoice & InstallmentPlanCarrier) | null | undefined
  const plans = carrier?.installment_plans ?? carrier?.installmentPlans ?? []

  if (line?.id && plans.length > 0) {
    const planForLine = plans.find((plan) => plan.sales_invoice_line_id === line.id)
    if (planForLine) return planForLine
  }

  const invoicePlan = carrier?.installment_plan ?? carrier?.installmentPlan
  if (invoicePlan && (!invoicePlan.sales_invoice_line_id || !line?.id)) {
    return invoicePlan
  }

  if (plans.length === 1) return plans[0]

  return invoicePlan ?? undefined
}

export function resolveRenewalLabel(
  line?: SalesInvoiceLine,
  invoice?: SalesInvoice,
): string {
  const renewalType = line?.renewal_type ?? invoice?.renewal_type
  const renewalDate = line?.subscription_renewal_date ?? invoice?.subscription_renewal_date
  if (renewalType === 'permanent') return renewalTypeLabels.permanent
  if (renewalDate) return fmtContractDate(renewalDate)
  if (renewalType) return renewalTypeLabels[renewalType] ?? renewalType
  return '—'
}

export function resolveIntervalLabel(plan?: InstallmentPlan | null): string {
  if (!plan) return '—'
  if (plan.interval_type && intervalTypeLabels[plan.interval_type]) {
    return intervalTypeLabels[plan.interval_type]
  }
  if (plan.interval_days) return `كل ${plan.interval_days} يوم`
  return '—'
}

export interface LineFinancialSummary {
  installationShare: number
  paid: number
  balance: number
}

export function lineFinancialSummary(
  line: SalesInvoiceLine,
  invoice: SalesInvoice,
): LineFinancialSummary {
  const plan = resolveLinePlan(line, invoice)
  const lineCount = invoice.lines?.length ?? 1
  const installationShare = Number(invoice.installation_fee ?? 0) / lineCount
  const lineTotal = Number(line.line_total ?? 0)
  const linePaid =
    line.payment_term === 'cash' ? lineTotal : Number(plan?.down_payment ?? 0)
  const paid = linePaid + installationShare
  const balance =
    line.payment_term === 'cash'
      ? 0
      : Math.max(0, lineTotal - Number(plan?.down_payment ?? 0))

  return { installationShare, paid, balance }
}

export function buildInstallmentRows(
  line?: SalesInvoiceLine,
  invoice?: SalesInvoice,
): string[] {
  const plan = resolveLinePlan(line, invoice)
  const items: InstallmentItem[] = plan?.items ?? []
  const rows: string[] = Array.from({ length: 30 }, () => '')

  items.forEach((item) => {
    const num = item.installment_number ?? item.sequence
    if (num != null && num >= 1 && num <= 30) {
      rows[num - 1] = formatInstallmentCellValue(item, invoice)
    }
  })

  if (plan && items.length === 0 && plan.installment_count > 0) {
    const lineTotal = Number(line?.line_total ?? invoice?.subtotal ?? invoice?.total ?? 0)
    const financed = lineTotal - Number(plan.down_payment ?? 0)
    const fixed = plan.installment_amount != null ? Number(plan.installment_amount) : null
    const perInstallment =
      fixed ?? Math.floor((financed / plan.installment_count) * 100) / 100
    for (let i = 0; i < Math.min(plan.installment_count, 30); i++) {
      rows[i] = fmtContractMoney(perInstallment, false)
    }
  }

  return rows
}

function resolveInstallmentPaidAt(
  item: InstallmentItem,
  invoice?: SalesInvoice,
): string | null {
  if (item.paid_at) return item.paid_at

  const payments = invoice?.payment_transactions ?? []
  const related = payments
    .filter(
      (payment: PaymentTransaction) =>
        payment.installment_item_id === item.id &&
        payment.status !== 'refunded' &&
        payment.status !== 'void',
    )
    .map((payment) => payment.paid_at)
    .filter(Boolean) as string[]

  if (related.length === 0) return null
  return related.sort((a, b) => b.localeCompare(a))[0]
}

function formatInstallmentCellValue(item: InstallmentItem, invoice?: SalesInvoice): string {
  const paid = Number(item.paid_amount ?? 0)
  const amount = Number(item.amount)

  if (paid >= amount) {
    const paidAt = resolveInstallmentPaidAt(item, invoice)
    return paidAt ? fmtContractDate(paidAt) : '✓'
  }

  if (paid > 0) {
    return `${paid.toLocaleString('ar-EG')}/${amount.toLocaleString('ar-EG')}`
  }

  return fmtContractMoney(amount, false)
}

export function branchLabel(invoice: SalesInvoice): string {
  return invoice.branch?.name_ar ?? invoice.branch?.name ?? '—'
}

export interface PerDeviceFee {
  gross: number
  discount: number
  net: number
}

export interface InvoiceContractSummary {
  lineCount: number
  feeGross: number
  feeDiscount: number
  feeNet: number
  devicesSubtotal: number
  total: number
  perDeviceFee: PerDeviceFee | null
}

export function invoiceContractSummary(invoice: SalesInvoice): InvoiceContractSummary {
  const lineCount = invoice.lines?.length ?? 0
  const feeDiscount = Number(invoice.discount_amount ?? 0)
  const feeNet = Number(invoice.installation_fee ?? 0)
  const feeGross = feeNet + feeDiscount
  const perDeviceFee =
    lineCount > 0
      ? {
          gross: feeGross / lineCount,
          discount: feeDiscount / lineCount,
          net: feeNet / lineCount,
        }
      : null

  return {
    lineCount,
    feeGross,
    feeDiscount,
    feeNet,
    devicesSubtotal: Number(invoice.subtotal ?? 0),
    total: Number(invoice.total ?? 0),
    perDeviceFee,
  }
}

export function resolvePlateLabel(line?: SalesInvoiceLine): string {
  const letters = line?.vehicle_plate_letters?.trim() ?? ''
  const numbers = line?.vehicle_plate_numbers?.trim() ?? ''
  const combined = `${letters} ${numbers}`.trim()
  return combined || '—'
}

export function resolveInstallmentMethodLabel(
  line?: SalesInvoiceLine,
  invoice?: SalesInvoice,
): string {
  const paymentTerm = line?.payment_term ?? invoice?.payment_term
  if (paymentTerm !== 'installment') return '—'

  const plan = resolveLinePlan(line, invoice)
  if (!plan) return '—'

  const count = plan.installment_count ?? '—'
  const interval = resolveIntervalLabel(plan)
  return `${count} قسط — ${interval}`
}

export function resolveRenewalTypeLabel(
  line?: SalesInvoiceLine,
  invoice?: SalesInvoice,
): string {
  const renewalType = line?.renewal_type ?? invoice?.renewal_type
  if (!renewalType) return '—'
  return renewalTypeLabels[renewalType] ?? renewalType
}
