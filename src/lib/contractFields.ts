import type {
  Customer,
  InstallmentItem,
  InstallmentPlan,
  PaymentTransaction,
  SalesInvoice,
  SalesInvoiceLine,
} from '../api/types'
import { distributorLabel, formatInvoiceDate, isServiceInvoiceLine } from './sales'

export const vehicleTypeLabels: Record<string, string> = {
  car: 'سيارة',
  tuk_tuk: 'توك توك',
  motorcycle: 'دراجة',
  other: 'أخرى',
}

export const renewalTypeLabels: Record<string, string> = {
  annual: 'اشتراك سنوي',
  permanent: 'اشتراك مدى الحياة',
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

export function fmtContractDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const hasTime = value.includes('T') || /\d{1,2}:\d{2}/.test(value)
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return formatInvoiceDate(value)
  if (!hasTime) return formatInvoiceDate(value)
  return d.toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function fmtInvoiceContractDateTime(
  invoice: Pick<SalesInvoice, 'confirmed_at' | 'invoice_date'>,
): string {
  return fmtContractDateTime(invoice.confirmed_at ?? invoice.invoice_date)
}

export function contractSortTimestamp(
  invoice: Pick<SalesInvoice, 'confirmed_at' | 'invoice_date' | 'id'>,
): number {
  const value = invoice.confirmed_at ?? invoice.invoice_date
  if (!value) return invoice.id ?? 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? invoice.id ?? 0 : time
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

export function resolveLinePaymentTerm(
  line: SalesInvoiceLine | undefined,
  invoice: SalesInvoice,
): 'cash' | 'installment' {
  const term = line?.payment_term ?? invoice.payment_term
  return term === 'cash' ? 'cash' : 'installment'
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

export function contractSourceLabel(invoice: SalesInvoice): string {
  if (invoice.sales_user_id || invoice.sales_user) {
    const name = invoice.sales_user?.name
    return name ? `موظف ${name}` : 'موظف —'
  }
  if (invoice.distributor_id || invoice.distributor) {
    const name = distributorLabel(invoice.distributor)
    return name !== '—' ? `موزع ${name}` : '—'
  }
  const branch = branchLabel(invoice)
  return branch !== '—' ? `فرع ${branch}` : '—'
}

export interface PerDeviceFee {
  gross: number
  discount: number
  net: number
}

export interface InvoiceContractSummary {
  lineCount: number
  serviceLineCount: number
  feeGross: number
  feeDiscount: number
  feeNet: number
  devicesGross: number
  devicesDiscount: number
  devicesSubtotal: number
  servicesGross: number
  servicesDiscount: number
  servicesSubtotal: number
  grandGross: number
  grandDiscount: number
  total: number
  perDeviceFee: PerDeviceFee | null
}

function sumLineField(
  lines: SalesInvoiceLine[],
  field: 'unit_price' | 'discount' | 'line_total',
): number {
  return lines.reduce((sum, line) => {
    if (field === 'unit_price') return sum + Number(line.unit_price ?? 0)
    if (field === 'discount') return sum + Number(line.discount ?? 0)
    return sum + Number(line.line_total ?? 0)
  }, 0)
}

export function resolveVehicleDistinctiveDetail(line: SalesInvoiceLine): string {
  if (line.vehicle_type === 'tuk_tuk') {
    const chassis = line.chassis_number?.trim()
    const engine = line.engine_number?.trim()
    if (chassis && engine) return `${chassis} / ${engine}`
    return chassis || engine || displayValue(line.vehicle_info)
  }
  const plate = resolvePlateLabel(line)
  if (plate !== '—') return plate
  return displayValue(line.vehicle_info)
}

export function invoiceContractSummary(invoice: SalesInvoice): InvoiceContractSummary {
  const allLines = invoice.lines ?? []
  const deviceLines = allLines.filter((line) => !isServiceInvoiceLine(line))
  const serviceLines = allLines.filter((line) => isServiceInvoiceLine(line))
  const lineCount = deviceLines.length
  const serviceLineCount = serviceLines.length
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

  const devicesGross = sumLineField(deviceLines, 'unit_price')
  const devicesDiscount = sumLineField(deviceLines, 'discount')
  const devicesSubtotal = sumLineField(deviceLines, 'line_total')
  const servicesGross = sumLineField(serviceLines, 'unit_price')
  const servicesDiscount = sumLineField(serviceLines, 'discount')
  const servicesSubtotal = sumLineField(serviceLines, 'line_total')
  const grandGross = feeGross + devicesGross + servicesGross
  const grandDiscount = feeDiscount + devicesDiscount + servicesDiscount
  const total = Number(invoice.total ?? 0)

  return {
    lineCount,
    serviceLineCount,
    feeGross,
    feeDiscount,
    feeNet,
    devicesGross,
    devicesDiscount,
    devicesSubtotal,
    servicesGross,
    servicesDiscount,
    servicesSubtotal,
    grandGross,
    grandDiscount,
    total,
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
