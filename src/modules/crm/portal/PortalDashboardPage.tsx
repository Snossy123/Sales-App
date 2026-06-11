import { useQuery } from '@tanstack/react-query'
import { portalApi } from '../../../api/portalClient'
import type { PaginatedResponse, PortalDashboardData, SalesInvoice } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { KpiCard } from '../../../components/KpiCard'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { usePortalAuthStore } from '../../../stores/portalAuthStore'

export function PortalDashboardPage() {
  const user = usePortalAuthStore((s) => s.user)

  const dashboardQuery = useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: async () => {
      const { data } = await portalApi.get<PortalDashboardData>('/portal/dashboard')
      return data
    },
  })

  const invoicesQuery = useQuery({
    queryKey: ['portal-invoices'],
    queryFn: async () => {
      const { data } = await portalApi.get<PaginatedResponse<SalesInvoice>>('/portal/invoices', {
        params: { per_page: 10 },
      })
      return data
    },
  })

  const balanceDue = Number(dashboardQuery.data?.total_balance_due ?? 0)
  const recentInvoices =
    dashboardQuery.data?.recent_invoices ?? invoicesQuery.data?.data ?? []

  return (
    <div>
      <PageHeader
        title={`مرحباً، ${user?.name ?? 'عميلنا'}`}
        subtitle={user?.customer?.phone ? `هاتف: ${user.customer.phone}` : undefined}
      />

      <AsyncState
        isLoading={dashboardQuery.isLoading}
        isError={dashboardQuery.isError}
        error={dashboardQuery.error}
      >
        <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2">
          <KpiCard
            label="الرصيد المستحق"
            value={`${balanceDue.toLocaleString('ar-EG')} ج.م`}
            icon="account_balance_wallet"
          />
          <KpiCard
            label="آخر الفواتير"
            value={recentInvoices.length}
            icon="receipt_long"
          />
        </div>

        <h2 className="mb-sm text-lg font-bold text-on-surface">الفواتير الأخيرة</h2>
        <DataTable<SalesInvoice & Record<string, unknown>>
          data={recentInvoices as (SalesInvoice & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            {
              key: 'invoice_number',
              header: 'رقم الفاتورة',
              className: 'tabular-nums',
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
