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
}: {
  label: string
  value: string
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="min-w-0 text-center">
      <p className="text-[11px] font-medium text-on-surface-variant">{label}</p>
      <p className="truncate text-sm font-bold tabular-nums text-on-surface" dir={dir}>
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

function DeviceIdentifiersTable({
  lines,
  customer,
}: {
  lines: SalesInvoiceLine[]
  customer: SalesInvoice['customer']
}) {
  if (lines.length === 0) return null

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
      summary={line.description || line.service?.name_ar || line.service?.name || line.product_name_ar || undefined}
      defaultOpen={index === 0}
      className="mb-0 h-full"
    >
      <dl className="divide-y divide-outline-variant/40">
        <DetailRow
          label="الوصف"
          value={displayValue(
            line.description ?? line.service?.name_ar ?? line.service?.name ?? line.product_name_ar,
          )}
        />
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

  return (
    <div className="space-y-md">
      <div className="grid grid-cols-1 items-start gap-md xl:grid-cols-2">
        <CollapsibleSection title="بيانات العميل" defaultOpen className="mb-0 h-full">
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
        </CollapsibleSection>

        <CollapsibleSection title="بيانات تعاقد جميع الأجهزة" defaultOpen className="mb-0 h-full">
          <dl className="divide-y divide-outline-variant/40">
            <DetailRow label="المصدر" value={contractSourceLabel(invoice)} />
            <DetailRow label="تاريخ التعاقد" value={fmtInvoiceContractDateTime(invoice)} />
          </dl>

          <div className="mt-md space-y-md">
            <DeviceIdentifiersTable lines={deviceLines} customer={customer} />

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

            {serviceLines.length > 0 ? (
              <div className="space-y-sm">
                {serviceLines.map((line, index) => (
                  <FinancialBlock
                    key={line.id}
                    title={`خدمة ${index + 1}${line.description ? ` — ${line.description}` : ''}`}
                    columns={4}
                    metrics={[
                      { label: 'عدد', value: String(line.quantity ?? 1) },
                      { label: 'رسوم', value: fmtContractMoney(line.unit_price) },
                      {
                        label: 'خصم',
                        value: discountDisplay(Number(line.discount ?? 0)),
                      },
                      { label: 'صافي', value: fmtContractMoney(line.line_total) },
                    ]}
                  />
                ))}
              </div>
            ) : null}

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
                <MoneyMetric label="الصافي" value={fmtContractMoney(summary.total)} />
              </div>
            </div>

            <dl className="divide-y divide-outline-variant/40 border-t border-outline-variant/40 pt-sm">
              <DetailRow label="المدفوع" value={fmtContractMoney(invoice.paid_amount)} />
              <DetailRow label="المتبقي (للأقساط)" value={fmtContractMoney(invoice.balance_due)} />
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
        </CollapsibleSection>
      </div>

      {deviceLines.length > 0 && (
        <section>
          <h3 className="mb-sm text-sm font-bold text-on-surface">
            تفاصيل الأجهزة ({deviceLines.length})
          </h3>
          <div className="grid grid-cols-1 gap-sm xl:grid-cols-2">
            {deviceLines.map((line, index) => (
              <DeviceLineDetails
                key={line.id}
                line={line}
                index={index}
                invoice={invoice}
                perDeviceFee={summary.perDeviceFee}
              />
            ))}
          </div>
        </section>
      )}

      {serviceLines.length > 0 && (
        <section>
          <h3 className="mb-sm text-sm font-bold text-on-surface">
            تفاصيل الخدمات ({serviceLines.length})
          </h3>
          <div className="grid grid-cols-1 gap-sm xl:grid-cols-2">
            {serviceLines.map((line, index) => (
              <ServiceLineDetails key={line.id} line={line} index={index} invoice={invoice} />
            ))}
          </div>
        </section>
      )}

      {invoice.customer_id && (
        <CollapsibleSection title="المرفقات" defaultOpen>
          <CustomerAttachmentsSection
            customerId={invoice.customer_id}
            mode="view"
            canManage={false}
          />
        </CollapsibleSection>
      )}
    </div>
  )
}
