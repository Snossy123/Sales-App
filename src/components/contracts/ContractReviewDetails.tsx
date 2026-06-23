import type { SalesInvoice, SalesInvoiceLine } from '../../api/types'
import {
  branchLabel,
  displayValue,
  fmtContractDate,
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
  resolvePlateLabel,
  vehicleTypeLabels,
} from '../../lib/contractFields'
import {
  distributorLabel,
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
  const customer = invoice.customer
  const paymentTerm = line.payment_term ?? invoice.payment_term

  return (
    <CollapsibleSection
      title={`جهاز ${index + 1}`}
      summary={resolveProductModelName(line) || resolveSerial(line, customer) || undefined}
      defaultOpen={index === 0}
      className="mb-0 h-full"
    >
      <dl className="divide-y divide-outline-variant/40">
        <DetailRow label="اسم الجهاز" value={resolveProductModelName(line)} />
        <DetailRow label="سريال" value={resolveSerial(line, customer)} dir="ltr" />
        <DetailRow label="شريحة" value={resolveSim(line, customer)} dir="ltr" />
        <DetailRow label="اسم المستخدم" value={resolveUsername(line, customer)} dir="ltr" />
        <DetailRow label="الفني" value={resolveTechnician(line, invoice)} />
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
        <DetailRow
          label="نوع المركبة"
          value={
            line.vehicle_type ? vehicleTypeLabels[line.vehicle_type] ?? line.vehicle_type : '—'
          }
        />
        <DetailRow label="اللوحة" value={resolvePlateLabel(line)} dir="ltr" />
        <DetailRow label="الشاسيه" value={displayValue(line.chassis_number)} dir="ltr" />
        <DetailRow label="الماتور" value={displayValue(line.engine_number)} dir="ltr" />
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

interface ContractReviewDetailsProps {
  invoice: SalesInvoice
}

export function ContractReviewDetails({ invoice }: ContractReviewDetailsProps) {
  const customer = invoice.customer
  const lines = invoice.lines ?? []
  const guarantors = customer?.guarantors ?? []
  const summary = invoiceContractSummary(invoice)

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
            {invoice.sales_user_id || invoice.sales_user ? (
              <DetailRow
                label="موظف المبيعات"
                value={invoice.sales_user?.name ?? '—'}
              />
            ) : (
              <>
                <DetailRow label="الفرع" value={branchLabel(invoice)} />
                <DetailRow label="الموزع" value={distributorLabel(invoice.distributor) || '—'} />
              </>
            )}
            <DetailRow label="تاريخ التعاقد" value={fmtContractDate(invoice.invoice_date)} />
            <DetailRow label="إجمالي رسوم التركيب" value={fmtContractMoney(summary.feeGross)} />
            <DetailRow
              label="إجمالي خصم رسوم التركيب"
              value={
                summary.feeDiscount > 0 ? fmtContractMoney(summary.feeDiscount) : '—'
              }
            />
            <DetailRow label="عدد الأجهزة" value={String(summary.lineCount)} />
            <DetailRow label="إجمالي سعر الأجهزة" value={fmtContractMoney(summary.devicesSubtotal)} />
            <DetailRow label="إجمالي تعاقد جميع الأجهزة" value={fmtContractMoney(summary.total)} />
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
        </CollapsibleSection>
      </div>

      {lines.length > 0 && (
        <section>
          <h3 className="mb-sm text-sm font-bold text-on-surface">تفاصيل الأجهزة ({lines.length})</h3>
          <div className="grid grid-cols-1 gap-sm xl:grid-cols-2">
            {lines.map((line, index) => (
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
