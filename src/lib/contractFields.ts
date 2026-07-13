import type {
  Customer,
  InstallmentItem,
  InstallmentPlan,
  PaymentTransaction,
  SalesInvoice,
  SalesInvoiceLine,
} from '../api/types'
import { isDeferredCashSchedule } from './cashSchedule'
import { distributorLabel, isServiceInvoiceLine } from './sales'

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

const CONTRACT_NUM_LOCALE = 'en-GB'

export function fmtContractMoney(value: string | number | null | undefined, suffix = true): string {
  if (value == null || value === '') return '—'
  const num = Number(value).toLocaleString(CONTRACT_NUM_LOCALE)
  return suffix ? `${num} ج` : num
}

export function fmtContractDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    // Keep Latin digits if the raw string already has them; strip Arabic-Indic if present.
    return String(value).replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
    )
  }
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd}`
}

const AR_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function fmtContractDateWithWeekday(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return fmtContractDate(value)
  const dayName = AR_WEEKDAYS[d.getDay()] ?? ''
  const dateStr = fmtContractDate(value)
  return dayName ? `${dayName} ${dateStr}` : dateStr
}

export function fmtContractDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const hasTime = value.includes('T') || /\d{1,2}:\d{2}/.test(value)
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return fmtContractDate(value)
  if (!hasTime) return fmtContractDate(value)
  return d.toLocaleString(CONTRACT_NUM_LOCALE, {
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

/** Cash contract layout only for immediate cash; deferred cash uses installment layout. */
export function usesCashContractTemplate(
  line: SalesInvoiceLine | undefined,
  invoice: SalesInvoice,
): boolean {
  if (resolveLinePaymentTerm(line, invoice) !== 'cash') return false
  return !isDeferredCashSchedule(line?.cash_schedule)
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
  const typeKey = line?.vehicle_type ?? ''
  const type = typeKey ? (vehicleTypeLabels[typeKey] ?? typeKey) : ''

  let detail = ''
  if (line?.vehicle_type === 'other') {
    const info = line.vehicle_info?.trim() ?? ''
    detail = info && info.toLowerCase() !== 'other' ? info : ''
  } else if (line?.vehicle_type === 'tuk_tuk') {
    const chassis = line.chassis_number?.trim() ?? ''
    const engine = line.engine_number?.trim() ?? ''
    if (chassis && engine) detail = `${chassis} — ${engine}`
    else detail = chassis || engine
  } else if (line) {
    const plate = resolvePlateLabel(line)
    detail = plate !== '—' ? plate : ''
  }

  if (!detail) {
    const fallback = (invoice?.vehicle_info ?? line?.vehicle_info ?? '').trim()
    if (fallback && fallback.toLowerCase() !== 'other' && fallback !== type) {
      detail = vehicleTypeLabels[fallback] ?? fallback
    }
  }

  if (type && detail) return `${type} — ${detail}`
  return type || detail || ''
}

export function resolveUsername(line?: SalesInvoiceLine, customer?: Customer | null): string {
  return line?.username ?? customer?.username ?? ''
}

export function resolveTechnician(line?: SalesInvoiceLine, invoice?: SalesInvoice): string {
  const name = line?.technician?.name ?? invoice?.technician_name ?? ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).join(' ')
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

export function installmentTableColumnCount(count: number): 1 | 2 | 3 {
  if (count <= 15) return 1
  if (count <= 30) return 2
  return 3
}

export interface InstallmentTableCell {
  amount: string
  due: string
  paid: string
}

const emptyInstallmentCell = (): InstallmentTableCell => ({
  amount: '',
  due: '',
  paid: '',
})

function computeInstallmentDueDate(
  plan: InstallmentPlan | null | undefined,
  indexZeroBased: number,
  fallbackStart?: string | null,
): string {
  const start = plan?.first_due_date || fallbackStart
  if (!start) return ''
  const base = new Date(start)
  if (Number.isNaN(base.getTime())) return ''

  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  if (plan?.interval_type === 'weekly') {
    d.setDate(d.getDate() + indexZeroBased * (plan.interval_days ?? 7))
  } else if (plan?.interval_days && plan.interval_type !== 'monthly') {
    d.setDate(d.getDate() + indexZeroBased * plan.interval_days)
  } else {
    d.setMonth(d.getMonth() + indexZeroBased)
  }

  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return fmtContractDate(`${yyyy}-${mm}-${dd}`)
}

export function buildInstallmentRows(
  line?: SalesInvoiceLine,
  invoice?: SalesInvoice,
): InstallmentTableCell[] {
  const plan = resolveLinePlan(line, invoice)
  const items: InstallmentItem[] = plan?.items ?? []
  const maxItemNum = items.reduce(
    (max, item) => Math.max(max, item.installment_number ?? item.sequence ?? 0),
    0,
  )
  const count = Math.max(plan?.installment_count ?? 0, items.length, maxItemNum)
  const cols = installmentTableColumnCount(count || 1)
  const capacity = cols * 15
  const rows: InstallmentTableCell[] = Array.from({ length: capacity }, emptyInstallmentCell)

  items.forEach((item) => {
    const num = item.installment_number ?? item.sequence
    if (num != null && num >= 1 && num <= capacity) {
      rows[num - 1] = formatInstallmentCell(item, invoice, plan, num - 1)
    }
  })

  if (plan && items.length === 0 && plan.installment_count > 0) {
    const lineTotal = Number(line?.line_total ?? invoice?.subtotal ?? invoice?.total ?? 0)
    const financed = lineTotal - Number(plan.down_payment ?? 0)
    const fixed = plan.installment_amount != null ? Number(plan.installment_amount) : null
    const perInstallment =
      fixed ?? Math.floor((financed / plan.installment_count) * 100) / 100
    for (let i = 0; i < Math.min(plan.installment_count, capacity); i++) {
      rows[i] = {
        amount: fmtContractMoney(perInstallment),
        due: computeInstallmentDueDate(plan, i, invoice?.invoice_date),
        paid: '',
      }
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

function formatInstallmentCell(
  item: InstallmentItem,
  invoice?: SalesInvoice,
  plan?: InstallmentPlan | null,
  indexZeroBased?: number,
): InstallmentTableCell {
  const paid = Number(item.paid_amount ?? 0)
  const amount = Number(item.amount)
  const amountStr =
    paid > 0 && paid < amount
      ? `${paid.toLocaleString(CONTRACT_NUM_LOCALE)}/${amount.toLocaleString(CONTRACT_NUM_LOCALE)} ج`
      : `${amount.toLocaleString(CONTRACT_NUM_LOCALE)} ج`

  let dueStr = item.due_date ? fmtContractDate(item.due_date) : ''
  if (!dueStr || dueStr === '—') {
    const idx =
      indexZeroBased ??
      Math.max(0, (item.installment_number ?? item.sequence ?? 1) - 1)
    dueStr = computeInstallmentDueDate(plan, idx, invoice?.invoice_date)
  }

  let paidStr = ''
  if (paid >= amount) {
    const paidAt = resolveInstallmentPaidAt(item, invoice)
    if (paidAt) {
      const formatted = fmtContractDate(paidAt)
      if (formatted && formatted !== '—') paidStr = formatted
    }
  }

  return {
    amount: amountStr,
    due: dueStr && dueStr !== '—' ? dueStr : '',
    paid: paidStr,
  }
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
