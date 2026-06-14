import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Customer, Distributor, SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { StatusBadge } from '../components/StatusBadge'
import { distributorLabel, formatInvoiceDate } from '../lib/sales'

export function DistributorDetailPage() {
  const { id } = useParams<{ id: string }>()

  const query = useQuery({
    queryKey: ['distributor', id],
    queryFn: async () => {
      const { data } = await api.get<Distributor>(`/distributors/${id}`, {
        params: { include: 'branch,customers,salesInvoices' },
      })
      return data
    },
    enabled: Boolean(id),
  })

  const distributor = query.data
  const customers =
    distributor?.customers ??
    (distributor as Distributor & { customers?: Customer[] })?.customers ??
    []
  const invoices =
    distributor?.sales_invoices ??
    (distributor as Distributor & { salesInvoices?: SalesInvoice[] })?.salesInvoices ??
    []

  return (
    <div>
      <Link
        to="/distributors"
        className="mb-md inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Icon name="arrow_forward" size={18} />
        العودة للموزعين
      </Link>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {distributor && (
          <>
            <div className="mb-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
              <div className="flex flex-wrap items-start justify-between gap-md">
                <div>
                  <p className="text-sm text-on-surface-variant">كود الموزع</p>
                  <h1 className="text-2xl font-bold tabular-nums text-on-surface">
                    {distributor.code}
                  </h1>
                  <p className="mt-xs text-lg text-on-surface">{distributorLabel(distributor)}</p>
                  {distributor.phone && (
                    <p className="tabular-nums text-on-surface-variant">{distributor.phone}</p>
                  )}
                </div>
                <StatusBadge status={distributor.status} />
              </div>

              <div className="mt-md grid gap-sm sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-lg bg-surface-container p-sm">
                  <p className="text-xs text-on-surface-variant">الفرع</p>
                  <p className="font-medium">
                    {distributor.branch?.name_ar ?? distributor.branch?.name ?? '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-container p-sm">
                  <p className="text-xs text-on-surface-variant">العمولة</p>
                  <p className="font-medium tabular-nums">
                    {Number(distributor.commission_percent ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg bg-surface-container p-sm">
                  <p className="text-xs text-on-surface-variant">المعاملات المؤكدة</p>
                  <p className="font-medium tabular-nums">
                    {distributor.confirmed_transactions_count ?? 0}
                    {distributor.commission_tier_threshold
                      ? ` / ${distributor.commission_tier_threshold}`
                      : ''}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-container p-sm">
                  <p className="text-xs text-on-surface-variant">عدد العملاء</p>
                  <p className="font-medium tabular-nums">{distributor.customers_count ?? customers.length}</p>
                </div>
                <div className="rounded-lg bg-surface-container p-sm">
                  <p className="text-xs text-on-surface-variant">عدد الفواتير</p>
                  <p className="font-medium tabular-nums">
                    {distributor.sales_invoices_count ?? invoices.length}
                  </p>
                </div>
              </div>
            </div>

            <section className="mb-md">
              <h2 className="mb-sm text-lg font-semibold">عملاء الموزع</h2>
              <DataTable
                data={customers as unknown as Record<string, unknown>[]}
                keyExtractor={(row) => row.id as number}
                emptyMessage="لا يوجد عملاء مرتبطون بهذا الموزع"
                columns={[
                  { key: 'name', header: 'الاسم' },
                  { key: 'phone', header: 'الهاتف' },
                  {
                    key: 'status',
                    header: 'الحالة',
                    render: (row) => <StatusBadge status={String(row.status)} />,
                  },
                  {
                    key: 'actions',
                    header: '',
                    render: (row) => (
                      <Link
                        to={`/customers/${row.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        عرض
                      </Link>
                    ),
                  },
                ]}
              />
            </section>

            <section>
              <h2 className="mb-sm text-lg font-semibold">فواتير الموزع</h2>
              <DataTable
                data={invoices as unknown as Record<string, unknown>[]}
                keyExtractor={(row) => row.id as number}
                emptyMessage="لا توجد فواتير لهذا الموزع"
                columns={[
                  { key: 'invoice_number', header: 'رقم الفاتورة' },
                  {
                    key: 'invoice_date',
                    header: 'التاريخ',
                    render: (row) => formatInvoiceDate(String(row.invoice_date)),
                  },
                  {
                    key: 'customer',
                    header: 'العميل',
                    render: (row) => {
                      const customer = row.customer as Customer | undefined
                      return customer?.name ?? '—'
                    },
                  },
                  {
                    key: 'total',
                    header: 'الإجمالي',
                    render: (row) => `${Number(row.total).toLocaleString('ar-EG')} ج.م`,
                  },
                  {
                    key: 'status',
                    header: 'الحالة',
                    render: (row) => <StatusBadge status={String(row.status)} />,
                  },
                ]}
              />
            </section>
          </>
        )}
      </AsyncState>
    </div>
  )
}
