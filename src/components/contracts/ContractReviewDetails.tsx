import type { SalesInvoice, SalesInvoiceLine } from '../../api/types'
import {
  displayValue,
  fmtContractMoney,
  invoiceContractSummary,
  resolveInstallmentMethodLabel,
  resolveProductModelName,
  resolveRenewalLabel,
  resolveRenewalTypeLabel,
  resolveSerial,
  resolveSim,
  resolveTechnician,
  resolveUsername,
  resolveVehicleDistinctiveDetail,
} from '../../lib/contractFields'
import { isServiceInvoiceLine, paymentTermLabel } from '../../lib/sales'
import { CustomerAttachmentsSection } from '../customers/CustomerAttachmentsSection'
import { DataTable } from '../DataTable'
import { PosSectionCard } from '../pos/PosSectionCard'
import { StatusBadge } from '../StatusBadge'

function hasAmount(value: string | number | null | undefined): boolean {
  return Number(value ?? 0) > 0
}

function moneyOrDash(value: string | number | null | undefined): string {
  return hasAmount(value) ? fmtContractMoney(value) : '—'
}

function resolveServiceLineLabel(line: SalesInvoiceLine): string {
  return (
    line.description ??
    line.service?.name_ar ??
    line.service?.name ??
    line.product_name_ar ??
    '—'
  )
}

function MetricCell({
  label,
  value,
  dir,
  bold,
}: {
  label: string
  value: string
  dir?: 'ltr' | 'rtl'
  bold?: boolean
}) {
  return (
    <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low/30 px-sm py-2">
      <p className="text-[11px] text-on-surface-variant">{label}</p>
      <p
        className={`mt-0.5 text-sm tabular-nums ${bold ? 'font-bold text-on-surface' : 'font-medium text-on-surface'}`}
        dir={dir}
      >
        {value}
      </p>
    </div>
  )
}

function DeviceIdentifiersTable({
  lines,
  customer,
}: {
  lines: SalesInvoiceLine[]
  customer: SalesInvoice['customer']
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="border-b border-outline-variant/60 bg-surface-container-low text-[11px] text-on-surface-variant">
            <th className="px-sm py-2 text-start font-bold">#</th>
            <th className="px-sm py-2 text-start font-bold">السريال (1)</th>
            <th className="px-sm py-2 text-start font-bold">المستخدم (2)</th>
            <th className="px-sm py-2 text-start font-bold">رقم الشريحة (3)</th>
            <th className="px-sm py-2 text-start font-bold">علامة مميزة بالتفصيل</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id} className="border-b border-outline-variant/30 last:border-0">
              <td className="px-sm py-2 font-medium text-on-surface">{index + 1}</td>
              <td className="px-sm py-2 font-medium tabular-nums" dir="ltr">
                {resolveSerial(line, customer)}
              </td>
              <td className="px-sm py-2 font-medium tabular-nums" dir="ltr">
                {resolveUsername(line, customer)}
              </td>
              <td className="px-sm py-2 font-medium tabular-nums" dir="ltr">
                {resolveSim(line, customer)}
              </td>
              <td className="px-sm py-2 font-medium" dir="ltr">
                {resolveVehicleDistinctiveDetail(line)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ServiceLinesTable({ lines }: { lines: SalesInvoiceLine[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="border-b border-outline-variant/60 bg-surface-container-low text-[11px] text-on-surface-variant">
            <th className="px-sm py-2 text-start font-bold">#</th>
            <th className="px-sm py-2 text-start font-bold">الخدمة</th>
            <th className="px-sm py-2 text-start font-bold">السعر</th>
            <th className="px-sm py-2 text-start font-bold">الخصم</th>
            <th className="px-sm py-2 text-start font-bold">الصافي</th>
            <th className="px-sm py-2 text-start font-bold">الدفع</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id} className="border-b border-outline-variant/30 last:border-0">
              <td className="px-sm py-2 font-medium text-on-surface">{index + 1}</td>
              <td className="px-sm py-2 font-medium">{resolveServiceLineLabel(line)}</td>
              <td className="px-sm py-2 tabular-nums">{fmtContractMoney(line.unit_price)}</td>
              <td className="px-sm py-2 tabular-nums">
                {hasAmount(line.discount) ? fmtContractMoney(line.discount) : '—'}
              </td>
              <td className="px-sm py-2 font-medium tabular-nums">
                {fmtContractMoney(line.line_total)}
              </td>
              <td className="px-sm py-2 text-on-surface-variant">
                {paymentTermLabel(line.payment_term)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FinancialSummaryCard({
  title,
  metrics,
}: {
  title: string
  metrics: { label: string; value: string }[]
}) {
  const visible = metrics.filter((m) => m.value !== '—' && m.value !== '0')
  if (visible.length === 0) return null

  return (
    <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low/40 p-sm">
      <h4 className="mb-sm text-xs font-bold text-on-surface">{title}</h4>
      <div className={`grid gap-sm ${visible.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
        {visible.map((metric) => (
          <MetricCell key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </div>
    </div>
  )
}

function CustomerField({
  label,
  value,
  dir,
}: {
  label: string
  value: string
  dir?: 'ltr' | 'rtl'
}) {
  if (!value || value === '—') return null
  return (
    <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low/20 px-sm py-2">
      <p className="text-[11px] text-on-surface-variant">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-on-surface" dir={dir}>
        {value}
      </p>
    </div>
  )
}

function DeviceDetailCard({
  line,
  index,
  invoice,
  perDeviceFee,
}: {
  line: SalesInvoiceLine
  index: number
  invoice: SalesInvoice
  perDeviceFee: { gross: number; discount: number; net: number } | null
}) {
  const paymentTerm = line.payment_term ?? invoice.payment_term
  const modelName = resolveProductModelName(line)

  const cells: { label: string; value: string; dir?: 'ltr' | 'rtl' }[] = [
    { label: 'سعر الجهاز', value: fmtContractMoney(line.unit_price) },
  ]
  if (hasAmount(line.discount)) {
    cells.push({ label: 'خصم الجهاز', value: fmtContractMoney(line.discount) })
  }
  cells.push({ label: 'صافي الجهاز', value: fmtContractMoney(line.line_total) })

  if (perDeviceFee && perDeviceFee.gross > 0) {
    cells.push({ label: 'سعر الرسوم', value: fmtContractMoney(perDeviceFee.gross) })
  }
  if (perDeviceFee && perDeviceFee.discount > 0) {
    cells.push({ label: 'خصم الرسوم', value: fmtContractMoney(perDeviceFee.discount) })
  }
  if (perDeviceFee && perDeviceFee.net > 0) {
    cells.push({ label: 'صافي الرسوم', value: fmtContractMoney(perDeviceFee.net) })
  }

  const technician = resolveTechnician(line, invoice)
  if (technician) cells.push({ label: 'الفني', value: technician })

  const renewal = resolveRenewalLabel(line, invoice)
  if (renewal) cells.push({ label: 'تاريخ التجديد', value: renewal })

  cells.push({ label: 'طريقة الدفع', value: paymentTermLabel(paymentTerm) })

  const installmentMethod = resolveInstallmentMethodLabel(line, invoice)
  if (installmentMethod && installmentMethod !== '—') {
    cells.push({ label: 'طريقة الأقساط', value: installmentMethod })
  }

  const renewalType = resolveRenewalTypeLabel(line, invoice)
  if (renewalType && renewalType !== '—') {
    cells.push({ label: 'نوع التجديد', value: renewalType })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-sm bg-primary px-sm py-sm text-on-primary sm:px-md">
        <div className="min-w-0">
          <p className="text-sm font-bold">جهاز {index + 1}</p>
          <p className="truncate text-[13px] opacity-90">{modelName || resolveSerial(line, invoice.customer)}</p>
        </div>
        <p className="shrink-0 text-base font-extrabold tabular-nums">
          {fmtContractMoney(line.line_total)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-sm p-sm sm:grid-cols-3 lg:grid-cols-4">
        {cells.map((cell) => (
          <MetricCell key={cell.label} {...cell} />
        ))}
      </div>
    </div>
  )
}

function ServiceDetailCard({
  line,
  index,
  invoice,
}: {
  line: SalesInvoiceLine
  index: number
  invoice: SalesInvoice
}) {
  const label = resolveServiceLineLabel(line)
  const cells: { label: string; value: string }[] = [
    { label: 'السعر', value: fmtContractMoney(line.unit_price) },
  ]
  if (hasAmount(line.discount)) {
    cells.push({ label: 'الخصم', value: fmtContractMoney(line.discount) })
  }
  cells.push({ label: 'الصافي', value: fmtContractMoney(line.line_total) })
  cells.push({ label: 'طريقة الدفع', value: paymentTermLabel(line.payment_term) })

  const installmentMethod = resolveInstallmentMethodLabel(line, invoice)
  if (installmentMethod && installmentMethod !== '—') {
    cells.push({ label: 'طريقة الأقساط', value: installmentMethod })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-sm border-b border-outline-variant/60 px-sm py-sm sm:px-md">
        <div className="min-w-0">
          <p className="text-sm font-bold text-on-surface">خدمة {index + 1}</p>
          <p className="truncate text-[13px] text-on-surface-variant">{label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-sm">
          <StatusBadge
            status={line.payment_term === 'cash' ? 'paid' : 'pending'}
            label={paymentTermLabel(line.payment_term)}
          />
          <p className="text-base font-extrabold tabular-nums text-on-surface">
            {fmtContractMoney(line.line_total)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-sm p-sm sm:grid-cols-3">
        {cells.map((cell) => (
          <MetricCell key={cell.label} {...cell} />
        ))}
      </div>
    </div>
  )
}

interface ContractReviewDetailsProps {
  invoice: SalesInvoice
}

export function ContractReviewDetails({ invoice }: ContractReviewDetailsProps) {
  const customer = invoice.customer
  const allLines = invoice.lines ?? []
  const deviceLines = allLines.filter((line) => !isServiceInvoiceLine(line))
  const serviceLines = allLines.filter((line) => isServiceInvoiceLine(line))
  const guarantors = customer?.guarantors ?? []
  const summary = invoiceContractSummary(invoice)

  let sectionNumber = 1

  const financialCards = [
    summary.feeGross > 0 || summary.feeNet > 0 ? (
      <FinancialSummaryCard
        key="fee"
        title="التركيب"
        metrics={[
          { label: 'رسوم', value: fmtContractMoney(summary.feeGross) },
          { label: 'خصم', value: moneyOrDash(summary.feeDiscount) },
          { label: 'صافي', value: fmtContractMoney(summary.feeNet) },
        ]}
      />
    ) : null,
    summary.lineCount > 0 ? (
      <FinancialSummaryCard
        key="devices"
        title="الأجهزة"
        metrics={[
          { label: 'عدد', value: String(summary.lineCount) },
          { label: 'رسوم', value: fmtContractMoney(summary.devicesGross) },
          { label: 'خصم', value: moneyOrDash(summary.devicesDiscount) },
          { label: 'صافي', value: fmtContractMoney(summary.devicesSubtotal) },
        ]}
      />
    ) : null,
    summary.serviceLineCount > 0 ? (
      <FinancialSummaryCard
        key="services"
        title="الخدمات"
        metrics={[
          { label: 'عدد', value: String(summary.serviceLineCount) },
          { label: 'رسوم', value: fmtContractMoney(summary.servicesGross) },
          { label: 'خصم', value: moneyOrDash(summary.servicesDiscount) },
          { label: 'صافي', value: fmtContractMoney(summary.servicesSubtotal) },
        ]}
      />
    ) : null,
  ].filter(Boolean)

  return (
    <div className="space-y-md">
      <PosSectionCard
        number={sectionNumber++}
        title="بيانات التعاقد"
        subtitle="الأجهزة والخدمات والإجماليات المالية"
        contentClassName="space-y-md p-sm sm:p-md"
      >
        {deviceLines.length > 0 ? (
          <div>
            <h4 className="mb-sm text-xs font-bold text-on-surface-variant">جدول الأجهزة</h4>
            <DeviceIdentifiersTable lines={deviceLines} customer={customer} />
          </div>
        ) : null}

        {serviceLines.length > 0 ? (
          <div>
            <h4 className="mb-sm text-xs font-bold text-on-surface-variant">جدول الخدمات</h4>
            <ServiceLinesTable lines={serviceLines} />
          </div>
        ) : null}

        {financialCards.length > 0 ? (
          <div className="grid grid-cols-1 gap-sm md:grid-cols-3">{financialCards}</div>
        ) : null}

        <div className="rounded-lg border border-primary/20 bg-primary/8 px-sm py-sm">
          <div className="grid grid-cols-3 gap-sm text-center">
            <div>
              <p className="text-[11px] text-on-surface-variant">إجمالي الرسوم</p>
              <p className="text-sm font-bold tabular-nums">{fmtContractMoney(summary.grandGross)}</p>
            </div>
            {summary.grandDiscount > 0 ? (
              <div>
                <p className="text-[11px] text-on-surface-variant">الخصم</p>
                <p className="text-sm font-bold tabular-nums">
                  {fmtContractMoney(summary.grandDiscount)}
                </p>
              </div>
            ) : null}
            <div className={summary.grandDiscount > 0 ? '' : 'col-span-2'}>
              <p className="text-[11px] text-on-surface-variant">الصافي</p>
              <p className="text-lg font-extrabold tabular-nums text-primary">
                {fmtContractMoney(summary.total)}
              </p>
            </div>
          </div>
        </div>
      </PosSectionCard>

      <PosSectionCard
        number={sectionNumber++}
        title="بيانات العميل"
        subtitle={customer?.name ?? undefined}
        contentClassName="p-sm sm:p-md"
      >
        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3">
          <CustomerField label="الاسم" value={customer?.name ?? ''} />
          <CustomerField
            label="الرقم القومي"
            value={displayValue(customer?.national_id)}
            dir="ltr"
          />
          <CustomerField label="رقم الهاتف 1" value={displayValue(customer?.phone)} dir="ltr" />
          <CustomerField label="رقم الهاتف 2" value={displayValue(customer?.phone_2)} dir="ltr" />
          <CustomerField label="العنوان" value={displayValue(customer?.address)} />
          <CustomerField label="علامة مميزة" value={displayValue(customer?.distinctive_mark)} />
        </div>

        {guarantors.length > 0 ? (
          <div className="mt-md">
            <h4 className="mb-sm text-xs font-bold text-on-surface-variant">الضامنون</h4>
            <DataTable
              data={guarantors as unknown as Record<string, unknown>[]}
              keyExtractor={(row) => Number(row.id)}
              pageSize={10}
              columns={[
                { key: 'name', header: 'الاسم', render: (row) => String(row.name ?? '—') },
                { key: 'phone', header: 'الجوال', render: (row) => String(row.phone ?? '—') },
                {
                  key: 'national_id',
                  header: 'الرقم القومي',
                  render: (row) => String(row.national_id ?? '—'),
                },
                {
                  key: 'relationship',
                  header: 'الصلة',
                  render: (row) => String(row.relationship ?? '—'),
                },
              ]}
            />
          </div>
        ) : null}
      </PosSectionCard>

      {deviceLines.length > 0 ? (
        <PosSectionCard
          number={sectionNumber++}
          title="تفاصيل الأجهزة"
          subtitle={`${deviceLines.length} جهاز`}
          contentClassName="flex flex-col gap-sm p-sm sm:p-md"
        >
          {deviceLines.map((line, index) => (
            <DeviceDetailCard
              key={line.id}
              line={line}
              index={index}
              invoice={invoice}
              perDeviceFee={summary.perDeviceFee}
            />
          ))}
        </PosSectionCard>
      ) : null}

      {serviceLines.length > 0 ? (
        <PosSectionCard
          number={sectionNumber++}
          title="تفاصيل الخدمات"
          subtitle={`${serviceLines.length} خدمة`}
          contentClassName="flex flex-col gap-sm p-sm sm:p-md"
        >
          {serviceLines.map((line, index) => (
            <ServiceDetailCard key={line.id} line={line} index={index} invoice={invoice} />
          ))}
        </PosSectionCard>
      ) : null}

      {invoice.customer_id ? (
        <PosSectionCard
          number={sectionNumber}
          title="المرفقات"
          contentClassName="p-sm sm:p-md"
        >
          <CustomerAttachmentsSection
            customerId={invoice.customer_id}
            mode="view"
            canManage={false}
          />
        </PosSectionCard>
      ) : null}
    </div>
  )
}
