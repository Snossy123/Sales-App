import { useQuery } from '@tanstack/react-query'
import { portalApi } from '../../../api/portalClient'
import type { PaginatedResponse, SalesInvoice } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'

export function PortalInvoicesPage() {
  const query = useQuery({
    queryKey: ['portal-invoices-list'],
    queryFn: async () => {
      const { data } = await portalApi.get<PaginatedResponse<SalesInvoice>>('/portal/invoices', {
        params: { per_page: 50 },
      })
      return data
    },
  })

  return (
    <div>
      <PageHeader title="فواتيري" subtitle="جميع فواتير المبيعات" />
      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        <DataTable<SalesInvoice & Record<string, unknown>>
          data={(query.data?.data ?? []) as (SalesInvoice & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            {
              key: 'invoice_number',
              header: 'رقم الفاتورة',
              render: (row) => row.invoice_number ?? `#${row.id}`,
            },
            {
              key: 'invoice_date',
              header: 'التاريخ',
              className: 'tabular-nums',
              render: (row) =>
                row.invoice_date
                  ? new Date(row.invoice_date).toLocaleDateString('ar-EG')
                  : '—',
            },
            {
              key: 'total',
              header: 'الإجمالي',
              className: 'tabular-nums',
              render: (row) => Number(row.total).toLocaleString('ar-EG'),
            },
            {
              key: 'balance_due',
              header: 'المتبقي',
              className: 'tabular-nums',
              render: (row) => Number(row.balance_due).toLocaleString('ar-EG'),
            },
            {
              key: 'payment_status',
              header: 'الحالة',
              render: (row) => <StatusBadge status={row.payment_status} />,
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
