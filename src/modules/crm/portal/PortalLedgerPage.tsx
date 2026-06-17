import { useQuery } from '@tanstack/react-query'
import { portalApi } from '../../../api/portalClient'
import type { PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { PageHeader } from '../../../components/PageHeader'

interface LedgerRow {
  id: number
  paid_at?: string
  amount: number | string
  sales_invoice?: { invoice_number?: string }
}

export function PortalLedgerPage() {
  const query = useQuery({
    queryKey: ['portal-ledger'],
    queryFn: async () => {
      const { data } = await portalApi.get<PaginatedResponse<LedgerRow>>('/portal/ledger', {
        params: { per_page: 50 },
      })
      return data
    },
  })

  return (
    <div>
      <PageHeader title="كشف الحساب" subtitle="سجل المدفوعات" />
      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        <DataTable<LedgerRow & Record<string, unknown>>
          data={(query.data?.data ?? []) as (LedgerRow & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          columns={[
            {
              key: 'paid_at',
              header: 'التاريخ',
              className: 'tabular-nums',
              render: (row) =>
                row.paid_at ? new Date(row.paid_at).toLocaleDateString('ar-EG') : '—',
            },
            {
              key: 'invoice',
              header: 'الفاتورة',
              render: (row) => row.sales_invoice?.invoice_number ?? '—',
            },
            {
              key: 'amount',
              header: 'المبلغ',
              className: 'tabular-nums',
              render: (row) => Number(row.amount).toLocaleString('ar-EG'),
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
