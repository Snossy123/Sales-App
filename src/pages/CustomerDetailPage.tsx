import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Customer, SalesInvoice } from '../api/types'
import { CustomerAttachmentsSection } from '../components/customers/CustomerAttachmentsSection'
import { CustomerContractsSection } from '../components/customers/CustomerContractsSection'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { StatusBadge } from '../components/StatusBadge'
import { getUserRole } from '../lib/permissions'
import { useAuthStore } from '../stores/authStore'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const canManage = ['super_admin', 'admin', 'sales'].includes(getUserRole(user))

  const query = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${id}`, {
        params: {
          include: 'branch,guarantors,salesInvoices.installmentPlan.items',
          sales_invoice_status: 'all',
        },
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
              {customer.distinctive_mark && (
                <p className="mt-sm text-sm text-on-surface-variant">
                  علامة مميزة: {customer.distinctive_mark}
                </p>
              )}
              <dl className="mt-md grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-on-surface-variant">رقم الهاتف 2</dt>
                  <dd className="tabular-nums">{customer.phone_2 ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">رقم الهاتف 3</dt>
                  <dd className="tabular-nums">{customer.phone_3 ?? '—'}</dd>
                </div>
              </dl>
            </div>

            {customer.guarantors && customer.guarantors.length > 0 && (
              <section className="mb-md">
                <h2 className="mb-sm text-lg font-semibold">الضامنون</h2>
                <DataTable
                  data={customer.guarantors as unknown as Record<string, unknown>[]}
                  keyExtractor={(row) => row.id as number}
                  pageSize={10}
                  columns={[
                    { key: 'name', header: 'الاسم' },
                    { key: 'national_id', header: 'الرقم القومي' },
                    { key: 'phone', header: 'الهاتف' },
                    { key: 'address', header: 'العنوان' },
                    { key: 'relationship', header: 'الصلة' },
                  ]}
                />
              </section>
            )}

            <div className="mb-md">
              <CustomerAttachmentsSection
                mode="view"
                customerId={customer.id}
                canManage={canManage}
              />
            </div>

            <CustomerContractsSection invoices={invoices} />
          </>
        )}
      </AsyncState>
    </div>
  )
}
