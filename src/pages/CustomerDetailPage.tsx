import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Customer, SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { StatusBadge } from '../components/StatusBadge'
import { formatInvoiceDate, distributorLabel } from '../lib/sales'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()

  const query = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${id}`, {
        params: { include: 'branch,distributor,guarantors,salesInvoices.installmentPlan.items' },
      })
      return data
    },
    enabled: Boolean(id),
  })

  const customer = query.data
  const invoices =
    customer?.sales_invoices ??
    (customer as Customer & { salesInvoices?: SalesInvoice[] })?.salesInvoices ??
    []

  const installmentRows = invoices
    .filter((inv) => inv.status === 'confirmed' && inv.payment_term === 'installment')
    .flatMap((inv) => {
      const plan = inv.installment_plan ?? (inv as SalesInvoice & { installmentPlan?: SalesInvoice['installment_plan'] }).installmentPlan
      const items = plan?.items ?? []
      return items.map((item) => {
        const installmentNumber =
          (item as { installment_number?: number; sequence?: number }).installment_number ??
          (item as { sequence?: number }).sequence

        return {
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          ...item,
          installment_number: installmentNumber,
        }
      })
    })

  return (
    <div>
      <Link
        to="/customers"
        className="mb-md inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Icon name="arrow_forward" size={18} />
        العودة للعملاء
      </Link>

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        {customer && (
          <>
            <div className="mb-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
              <div className="flex flex-wrap items-start justify-between gap-md">
                <div>
                  <h1 className="text-2xl font-bold text-on-surface">{customer.name}</h1>
                  <p className="tabular-nums text-on-surface-variant">{customer.phone}</p>
                  {customer.national_id && (
                    <p className="text-sm text-on-surface-variant">
                      الرقم القومي: {customer.national_id}
                    </p>
                  )}
                  {customer.distributor && (
                    <p className="mt-xs text-sm text-on-surface-variant">
                      الموزع:{' '}
                      <Link
                        to={`/distributors/${customer.distributor.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {customer.distributor.code} — {distributorLabel(customer.distributor)}
                      </Link>
                    </p>
                  )}
                </div>
                <StatusBadge status={customer.status} />
              </div>
              {customer.address && (
                <p className="mt-sm text-sm text-on-surface-variant">{customer.address}</p>
              )}
              <dl className="mt-md grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-on-surface-variant">رقم العميل 2</dt>
                  <dd className="tabular-nums">{customer.phone_2 ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">رقم الشريحة</dt>
                  <dd className="tabular-nums">{customer.sim_number ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">اسم المستخدم</dt>
                  <dd>{customer.username ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">السريال</dt>
                  <dd className="tabular-nums">{customer.device_serial ?? '—'}</dd>
                </div>
              </dl>
            </div>

            {customer.guarantors && customer.guarantors.length > 0 && (
              <section className="mb-md">
                <h2 className="mb-sm text-lg font-semibold">الضامنون</h2>
                <DataTable
                  data={customer.guarantors as unknown as Record<string, unknown>[]}
                  keyExtractor={(row) => row.id as number}
                  columns={[
                    { key: 'name', header: 'الاسم' },
                    { key: 'phone', header: 'الهاتف' },
                    { key: 'relationship', header: 'الصلة' },
                  ]}
                />
              </section>
            )}

            <section className="mb-md">
              <h2 className="mb-sm text-lg font-semibold">الفواتير المؤكدة</h2>
              <DataTable
                data={invoices as unknown as Record<string, unknown>[]}
                keyExtractor={(row) => row.id as number}
                emptyMessage="لا توجد فواتير مؤكدة"
                columns={[
                  { key: 'invoice_number', header: 'رقم' },
                  {
                    key: 'invoice_date',
                    header: 'التاريخ',
                    render: (row) => formatInvoiceDate(String(row.invoice_date)),
                  },
                  {
                    key: 'total',
                    header: 'الإجمالي',
                    render: (row) => `${Number(row.total).toLocaleString('ar-EG')} ج.م`,
                  },
                  {
                    key: 'payment_term',
                    header: 'الدفع',
                    render: (row) =>
                      row.payment_term === 'installment' ? 'تقسيط' : 'نقدي',
                  },
                  {
                    key: 'payment_status',
                    header: 'السداد',
                    render: (row) => (
                      <StatusBadge status={String(row.payment_status)} />
                    ),
                  },
                ]}
              />
            </section>

            {installmentRows.length > 0 && (
              <section>
                <h2 className="mb-sm text-lg font-semibold">جدول الأقساط (بعد التأكيد)</h2>
                <DataTable
                  data={installmentRows as Record<string, unknown>[]}
                  keyExtractor={(row) => `${row.invoice_id}-${row.id}`}
                  columns={[
                    { key: 'invoice_number', header: 'فاتورة' },
                    { key: 'installment_number', header: 'قسط' },
                    {
                      key: 'due_date',
                      header: 'الاستحقاق',
                      render: (row) => formatInvoiceDate(String(row.due_date)),
                    },
                    {
                      key: 'amount',
                      header: 'المبلغ',
                      render: (row) => Number(row.amount).toLocaleString('ar-EG'),
                    },
                    {
                      key: 'paid_amount',
                      header: 'المدفوع',
                      render: (row) => Number(row.paid_amount).toLocaleString('ar-EG'),
                    },
                    {
                      key: 'status',
                      header: 'الحالة',
                      render: (row) => (
                        <StatusBadge status={String(row.status)} />
                      ),
                    },
                  ]}
                />
              </section>
            )}
          </>
        )}
      </AsyncState>
    </div>
  )
}
