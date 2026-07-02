import type { SalesInvoice, SalesInvoiceLine } from '../../api/types'
import {
  contractSourceLabel,
  displayValue,
  fmtContractMoney,
  fmtInvoiceContractDateTime,
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
import {
  isServiceInvoiceLine,
  paymentTermLabel,
  reviewStatusForBadge,
  reviewStatusLabel,
} from '../../lib/sales'
import { CollapsibleSection } from '../CollapsibleSection'
import { CustomerAttachmentsSection } from '../customers/CustomerAttachmentsSection'
import { DataTable } from '../DataTable'
import { PosSectionCard } from '../pos/PosSectionCard'
import { StatusBadge } from '../StatusBadge'

function DetailRow({
  label,
  value,
  dir,
}: {
  label: string
  value: string
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="flex justify-between gap-sm py-1.5 text-sm">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="text-end font-medium text-on-surface" dir={dir}>
        {value || '—'}
      </dd>
    </div>
  )
}

function MoneyMetric({
  label,
  value,
  dir,
  highlight = false,
}: {
  label: string
  value: string
  dir?: 'ltr' | 'rtl'
  highlight?: boolean
}) {
  return (
    <div className="min-w-0 text-center">
      <p className="text-[11px] font-medium text-on-surface-variant">{label}</p>
      <p
        className={`truncate tabular-nums ${
          highlight ? 'text-base font-extrabold text-primary' : 'text-sm font-bold text-on-surface'
        }`}
        dir={dir}
      >
        {value}
      </p>
    </div>
  )
}

function FinancialBlock({
  title,
  metrics,
  columns = 3,
}: {
  title: string
  metrics: { label: string; value: string; dir?: 'ltr' | 'rtl' }[]
  columns?: 3 | 4
}) {
  return (
    <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low/40 p-sm">
      <h4 className="mb-sm text-xs font-bold text-on-surface">{title}</h4>
      <div
        className={`grid gap-sm ${columns === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}
      >
        {metrics.map((metric) => (
          <MoneyMetric key={metric.label} {...metric} />
        ))}
      </div>
    </div>
  )
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

function ContractReviewHeader({
  invoice,
  summary,
}: {
  invoice: SalesInvoice
  summary: ReturnType<typeof invoiceContractSummary>
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-sm py-sm sm:px-md">
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <div className="min-w-0">
            <h2 className="text-[16px] font-extrabold text-on-surface">ملخص التعاقد</h2>
            <div className="mt-xs flex flex-wrap items-center gap-x-sm gap-y-1 text-[12px] text-on-surface-variant">
              {invoice.invoice_number ? (
                <span className="rounded-md bg-surface-container-high px-1.5 py-0.5 font-medium tabular-nums">
                  {invoice.invoice_number}
                </span>
              ) : null}
              <span>{contractSourceLabel(invoice)}</span>
              <span aria-hidden>·</span>
              <span className="tabular-nums" dir="ltr">
                {fmtInvoiceContractDateTime(invoice)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-xs">
            {invoice.payment_status ? (
              <StatusBadge status={invoice.payment_status} />
            ) : null}
            <StatusBadge
              status={reviewStatusForBadge(invoice.review_status)}
              label={reviewStatusLabel(invoice.review_status)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-sm px-sm py-sm sm:grid-cols-4 sm:px-md">
        <MoneyMetric label="الأجهزة" value={String(summary.lineCount)} />
        <MoneyMetric label="الخدمات" value={String(summary.serviceLineCount)} />
        <MoneyMetric label="الصافي" value={fmtContractMoney(summary.total)} highlight />
        <MoneyMetric label="المدفوع" value={fmtContractMoney(invoice.paid_amount)} />
      </div>

      <div
        className="h-3 bg-surface-container-lowest"
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--color-surface-container-low) 33.33%, transparent 33.33%, transparent 50%, var(--color-surface-container-low) 50%, var(--color-surface-container-low) 83.33%, transparent 83.33%, transparent 100%)',
          backgroundSize: '12px 12px',
        }}
        aria-hidden
      />
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
  if (lines.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-low/30 px-sm py-md text-center text-sm text-on-surface-variant">
        لا توجد أجهزة في هذا التعاقد
      </p>
    )
  }

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
  if (lines.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-low/30 px-sm py-md text-center text-sm text-on-surface-variant">
        لا توجد خدمات في هذا التعاقد
      </p>
    )
  }

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
          {lines.map((line, index) => {
            const discount = Number(line.discount ?? 0)
            return (
              <tr key={line.id} className="border-b border-outline-variant/30 last:border-0">
                <td className="px-sm py-2 font-medium text-on-surface">{index + 1}</td>
                <td className="px-sm py-2 font-medium">{resolveServiceLineLabel(line)}</td>
                <td className="px-sm py-2 tabular-nums">{fmtContractMoney(line.unit_price)}</td>
                <td className="px-sm py-2 tabular-nums">
                  {discount > 0 ? fmtContractMoney(line.discount) : '—'}
                </td>
                <td className="px-sm py-2 font-medium tabular-nums">
                  {fmtContractMoney(line.line_total)}
                </td>
                <td className="px-sm py-2 text-on-surface-variant">
                  {paymentTermLabel(line.payment_term)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DeviceLineDetails({
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

  return (
    <CollapsibleSection
      title={`جهاز ${index + 1}`}
      summary={resolveProductModelName(line) || resolveSerial(line, invoice.customer) || undefined}
      defaultOpen={index === 0}
      className="mb-0 h-full"
    >
      <dl className="divide-y divide-outline-variant/40">
        <DetailRow label="اسم الجهاز" value={resolveProductModelName(line)} />
        <DetailRow
          label="سعر الرسوم"
          value={perDeviceFee ? fmtContractMoney(perDeviceFee.gross) : '—'}
        />
        <DetailRow
          label="خصم الرسوم"
          value={
            perDeviceFee && perDeviceFee.discount > 0
              ? fmtContractMoney(perDeviceFee.discount)
              : '—'
          }
        />
        <DetailRow
          label="صافي الرسوم"
          value={perDeviceFee ? fmtContractMoney(perDeviceFee.net) : '—'}
        />
        <DetailRow label="سعر الجهاز" value={fmtContractMoney(line.unit_price)} />
        <DetailRow
          label="خصم الجهاز"
          value={Number(line.discount ?? 0) > 0 ? fmtContractMoney(line.discount) : '—'}
        />
        <DetailRow label="صافي الجهاز" value={fmtContractMoney(line.line_total)} />
        <DetailRow label="الفني" value={resolveTechnician(line, invoice)} />
        <DetailRow label="تاريخ تجديد الاشتراك" value={resolveRenewalLabel(line, invoice)} />
        <DetailRow label="طريقة الدفع" value={paymentTermLabel(paymentTerm)} />
        <DetailRow
          label="طريقة الأقساط"
          value={resolveInstallmentMethodLabel(line, invoice)}
        />
        <DetailRow label="نوعه" value={resolveRenewalTypeLabel(line, invoice)} />
      </dl>
    </CollapsibleSection>
  )
}

function ServiceLineDetails({
  line,
  index,
  invoice,
}: {
  line: SalesInvoiceLine
  index: number
  invoice: SalesInvoice
}) {
  const discount = Number(line.discount ?? 0)

  return (
    <CollapsibleSection
      title={`خدمة ${index + 1}`}
      summary={resolveServiceLineLabel(line)}
      defaultOpen={index === 0}
      className="mb-0 h-full"
    >
      <dl className="divide-y divide-outline-variant/40">
        <DetailRow label="الوصف" value={displayValue(resolveServiceLineLabel(line))} />
        <DetailRow label="السعر" value={fmtContractMoney(line.unit_price)} />
        <DetailRow
          label="الخصم"
          value={discount > 0 ? fmtContractMoney(line.discount) : '—'}
        />
        <DetailRow label="الصافي" value={fmtContractMoney(line.line_total)} />
        <DetailRow label="طريقة الدفع" value={paymentTermLabel(line.payment_term)} />
        <DetailRow
          label="طريقة الأقساط"
          value={resolveInstallmentMethodLabel(line, invoice)}
        />
      </dl>
    </CollapsibleSection>
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

  const discountDisplay = (amount: number) =>
    amount > 0 ? fmtContractMoney(amount) : '—'

  let sectionNumber = 1

  return (
    <div className="space-y-md">
      <ContractReviewHeader invoice={invoice} summary={summary} />

      <PosSectionCard
        number={sectionNumber++}
        title="بيانات التعاقد"
        subtitle="الأجهزة والخدمات والإجماليات المالية"
        contentClassName="space-y-md p-sm sm:p-md"
      >
        <div>
          <h4 className="mb-sm text-xs font-bold text-on-surface-variant">جدول الأجهزة</h4>
          <DeviceIdentifiersTable lines={deviceLines} customer={customer} />
        </div>

        <div>
          <h4 className="mb-sm text-xs font-bold text-on-surface-variant">جدول الخدمات</h4>
          <ServiceLinesTable lines={serviceLines} />
        </div>

        <div className="grid grid-cols-1 gap-sm md:grid-cols-3">
          <FinancialBlock
            title="التركيب"
            metrics={[
              { label: 'رسوم', value: fmtContractMoney(summary.feeGross) },
              { label: 'خصم', value: discountDisplay(summary.feeDiscount) },
              { label: 'صافي', value: fmtContractMoney(summary.feeNet) },
            ]}
          />
          <FinancialBlock
            title="الأجهزة"
            columns={4}
            metrics={[
              { label: 'عدد', value: String(summary.lineCount) },
              { label: 'رسوم', value: fmtContractMoney(summary.devicesGross) },
              { label: 'خصم', value: discountDisplay(summary.devicesDiscount) },
              { label: 'صافي', value: fmtContractMoney(summary.devicesSubtotal) },
            ]}
          />
          <FinancialBlock
            title="الخدمات"
            columns={4}
            metrics={[
              { label: 'عدد', value: String(summary.serviceLineCount) },
              { label: 'رسوم', value: fmtContractMoney(summary.servicesGross) },
              { label: 'خصم', value: discountDisplay(summary.servicesDiscount) },
              { label: 'صافي', value: fmtContractMoney(summary.servicesSubtotal) },
            ]}
          />
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/8 p-sm">
          <h4 className="mb-sm text-xs font-bold text-on-surface">الإجماليات</h4>
          <div className="grid grid-cols-3 gap-sm">
            <MoneyMetric
              label="إجمالي الرسوم"
              value={fmtContractMoney(summary.grandGross)}
            />
            <MoneyMetric
              label="الخصم"
              value={discountDisplay(summary.grandDiscount)}
            />
            <MoneyMetric label="الصافي" value={fmtContractMoney(summary.total)} highlight />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
          <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low/40 p-sm">
            <dl className="divide-y divide-outline-variant/40">
              <DetailRow label="المدفوع" value={fmtContractMoney(invoice.paid_amount)} />
              <DetailRow label="المتبقي (للأقساط)" value={fmtContractMoney(invoice.balance_due)} />
            </dl>
          </div>
          <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low/40 p-sm">
            <dl className="divide-y divide-outline-variant/40">
              <div className="flex justify-between gap-sm py-1.5 text-sm">
                <dt className="text-on-surface-variant">حالة السداد</dt>
                <dd>
                  {invoice.payment_status ? (
                    <StatusBadge status={invoice.payment_status} />
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-sm py-1.5 text-sm">
                <dt className="text-on-surface-variant">حالة المراجعة</dt>
                <dd>
                  <StatusBadge
                    status={reviewStatusForBadge(invoice.review_status)}
                    label={reviewStatusLabel(invoice.review_status)}
                  />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </PosSectionCard>

      <PosSectionCard
        number={sectionNumber++}
        title="بيانات العميل"
        subtitle={customer?.name ?? undefined}
        contentClassName="p-sm sm:p-md"
      >
        <dl className="divide-y divide-outline-variant/40">
          <DetailRow label="الاسم" value={customer?.name ?? '—'} />
          <DetailRow label="الرقم القومي" value={displayValue(customer?.national_id)} dir="ltr" />
          <DetailRow label="رقم الهاتف 1" value={displayValue(customer?.phone)} dir="ltr" />
          <DetailRow label="رقم الهاتف 2" value={displayValue(customer?.phone_2)} dir="ltr" />
          <DetailRow label="العنوان" value={displayValue(customer?.address)} />
          <DetailRow label="علامة مميزة" value={displayValue(customer?.distinctive_mark)} />
        </dl>

        {guarantors.length > 0 && (
          <div className="mt-md">
            <h4 className="mb-sm text-xs font-bold text-on-surface-variant">الضامنون</h4>
            <DataTable
              data={guarantors as unknown as Record<string, unknown>[]}
              keyExtractor={(row) => Number(row.id)}
              pageSize={10}
              columns={[
                { key: 'name', header: 'الاسم', render: (row) => String(row.name ?? '—') },
                {
                  key: 'phone',
                  header: 'الجوال',
                  render: (row) => String(row.phone ?? '—'),
                },
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
        )}
      </PosSectionCard>

      {deviceLines.length > 0 && (
        <PosSectionCard
          number={sectionNumber++}
          title="تفاصيل الأجهزة"
          subtitle={`${deviceLines.length} جهاز`}
          contentClassName="grid grid-cols-1 gap-sm p-sm sm:p-md xl:grid-cols-2"
        >
          {deviceLines.map((line, index) => (
            <DeviceLineDetails
              key={line.id}
              line={line}
              index={index}
              invoice={invoice}
              perDeviceFee={summary.perDeviceFee}
            />
          ))}
        </PosSectionCard>
      )}

      {serviceLines.length > 0 && (
        <PosSectionCard
          number={sectionNumber++}
          title="تفاصيل الخدمات"
          subtitle={`${serviceLines.length} خدمة`}
          contentClassName="grid grid-cols-1 gap-sm p-sm sm:p-md xl:grid-cols-2"
        >
          {serviceLines.map((line, index) => (
            <ServiceLineDetails key={line.id} line={line} index={index} invoice={invoice} />
          ))}
        </PosSectionCard>
      )}

      {invoice.customer_id && (
        <PosSectionCard number={sectionNumber} title="المرفقات" contentClassName="p-sm sm:p-md">
          <CustomerAttachmentsSection
            customerId={invoice.customer_id}
            mode="view"
            canManage={false}
          />
        </PosSectionCard>
      )}
    </div>
  )
}
