import { Link } from 'react-router-dom'
import type { OwnershipTransfer } from '../../api/types'
import { formatContractMoney } from '../../lib/customerContracts'
import { formatInvoiceDate } from '../../lib/sales'
import { CollapsibleSection } from '../CollapsibleSection'
import { DataTable } from '../DataTable'
import { StatusBadge } from '../StatusBadge'

interface CustomerOwnershipTransfersSectionProps {
  transfersFrom: OwnershipTransfer[]
  transfersTo: OwnershipTransfer[]
}

function paidInstallmentsTable(transfer: OwnershipTransfer) {
  const rows = transfer.paid_installments_snapshot ?? []
  if (rows.length === 0) {
    return <p className="text-sm text-on-surface-variant">لا توجد أقساط مسددة مسجّلة</p>
  }

  return (
    <DataTable
      data={rows as unknown as Record<string, unknown>[]}
      keyExtractor={(row) => `${transfer.id}-${row.sequence as number}`}
      pageSize={10}
      columns={[
        {
          key: 'sequence',
          header: 'قسط رقم',
          render: (row) => row.sequence as number,
        },
        {
          key: 'due_date',
          header: 'الاستحقاق',
          render: (row) => formatInvoiceDate(String(row.due_date)),
        },
        {
          key: 'amount',
          header: 'المبلغ',
          render: (row) => formatContractMoney(Number(row.amount)),
        },
        {
          key: 'paid_amount',
          header: 'مسدد',
          render: (row) => formatContractMoney(Number(row.paid_amount ?? 0)),
        },
        {
          key: 'paid_at',
          header: 'تاريخ السداد',
          render: (row) => {
            const paidAt = row.paid_at as string | null | undefined
            return paidAt ? formatInvoiceDate(paidAt) : '—'
          },
        },
        {
          key: 'status',
          header: 'الحالة',
          render: (row) => (
            <StatusBadge status={String(row.status)} label={row.status === 'paid' ? 'مدفوع' : 'جزئي'} />
          ),
        },
      ]}
    />
  )
}

export function CustomerOwnershipTransfersSection({
  transfersFrom,
  transfersTo,
}: CustomerOwnershipTransfersSectionProps) {
  if (transfersFrom.length === 0 && transfersTo.length === 0) {
    return null
  }

  return (
    <section className="mb-md space-y-md">
      {transfersFrom.length > 0 && (
        <div>
          <h2 className="mb-sm text-lg font-semibold">تعاقدات تم نقل ملكيتها (مالك سابق)</h2>
          <div className="space-y-sm">
            {transfersFrom.map((transfer) => (
              <CollapsibleSection
                key={transfer.id}
                title={`${transfer.source_invoice?.invoice_number ?? `#${transfer.source_sales_invoice_id}`} — نُقل إلى ${transfer.to_customer?.name ?? 'عميل آخر'}`}
                summary={transfer.transferred_at ? formatInvoiceDate(transfer.transferred_at) : undefined}
                defaultOpen={false}
              >
                <div className="space-y-md">
                  <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-sm">
                    <p>
                      <span className="text-on-surface-variant">المالك الجديد: </span>
                      {transfer.to_customer ? (
                        <Link
                          to={`/customers/${transfer.to_customer.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {transfer.to_customer.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </p>
                    <p className="mt-xs tabular-nums">
                      <span className="text-on-surface-variant">إجمالي المدفوع قبل النقل: </span>
                      {formatContractMoney(Number(transfer.paid_total_at_transfer ?? 0))}
                    </p>
                    <p className="mt-xs tabular-nums">
                      <span className="text-on-surface-variant">المتبقي انتقل للمالك الجديد: </span>
                      {formatContractMoney(Number(transfer.remaining_balance_at_transfer ?? 0))}
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-sm text-sm font-semibold">الأقساط التي تم سدادها</h3>
                    {paidInstallmentsTable(transfer)}
                  </div>
                </div>
              </CollapsibleSection>
            ))}
          </div>
        </div>
      )}

      {transfersTo.length > 0 && (
        <div>
          <h2 className="mb-sm text-lg font-semibold">تعاقدات مستلمة بنقل ملكية</h2>
          <div className="space-y-sm">
            {transfersTo.map((transfer) => (
              <CollapsibleSection
                key={transfer.id}
                title={`${transfer.source_invoice?.invoice_number ?? `#${transfer.source_sales_invoice_id}`} — من ${transfer.from_customer?.name ?? 'مالك سابق'}`}
                summary={transfer.transferred_at ? formatInvoiceDate(transfer.transferred_at) : undefined}
                defaultOpen={false}
              >
                <div className="rounded-lg border border-primary/25 bg-primary/5 px-md py-sm text-sm">
                  <p>
                    <span className="text-on-surface-variant">المالك السابق: </span>
                    {transfer.from_customer ? (
                      <Link
                        to={`/customers/${transfer.from_customer.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {transfer.from_customer.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </p>
                  <p className="mt-xs tabular-nums">
                    <span className="text-on-surface-variant">المتبقي بعد النقل: </span>
                    {formatContractMoney(Number(transfer.remaining_balance_at_transfer ?? 0))}
                  </p>
                  {transfer.source_invoice?.id && (
                    <Link
                      to={`/invoices/${transfer.source_invoice.id}/contract-print`}
                      className="mt-sm inline-block text-primary hover:underline"
                    >
                      عرض التعاقد
                    </Link>
                  )}
                </div>
              </CollapsibleSection>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
