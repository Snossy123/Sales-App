import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Customer } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { StatusBadge } from '../components/StatusBadge'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()

  const query = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${id}`, {
        params: { include: 'branch,guarantors,salesInvoices.installmentPlan' },
      })
      return data
    },
    enabled: Boolean(id),
  })

  const customer = query.data
  const invoices = customer?.sales_invoices ?? []

  const installmentRows = invoices.flatMap((inv) => {
    const items = inv.installment_plan?.items ?? []
    return items.map((item) => ({
      invoice_id: inv.id,
      invoice_date: inv.invoice_date,
      ...item,
    }))
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
                </div>
                <StatusBadge status={customer.status} />
              </div>
              {customer.address && (
                <p className="mt-sm text-sm text-on-surface-variant">{customer.address}</p>
              )}
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
              <h2 className="mb-sm text-lg font-semibold">الفواتير</h2>
              <DataTable
                data={invoices as unknown as Record<string, unknown>[]}
                keyExtractor={(row) => row.id as number}
                emptyMessage="لا توجد فواتير"
                columns={[
                  { key: 'id', header: 'رقم' },
                  { key: 'invoice_date', header: 'التاريخ' },
                  {
                    key: 'total',
                    header: 'الإجمالي',
                    render: (row) =>
                      Number(row.total).toLocaleString('ar-EG') + ' ج.م',
                  },
                  {
                    key: 'payment_term',
                    header: 'الدفع',
                    render: (row) => String(row.payment_term),
                  },
                  {
                    key: 'payment_status',
                    header: 'الحالة',
                    render: (row) => (
                      <StatusBadge status={String(row.payment_status)} />
                    ),
                  },
                ]}
              />
            </section>

            {installmentRows.length > 0 && (
              <section>
                <h2 className="mb-sm text-lg font-semibold">جدول الأقساط</h2>
                <DataTable
                  data={installmentRows as Record<string, unknown>[]}
                  keyExtractor={(row) => `${row.invoice_id}-${row.id}`}
                  columns={[
                    { key: 'invoice_id', header: 'فاتورة' },
                    { key: 'installment_number', header: 'قسط' },
                    { key: 'due_date', header: 'الاستحقاق' },
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
