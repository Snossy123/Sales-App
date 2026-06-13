import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { AccountingAccTransMapping, AccountingDashboard } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { KpiCard } from '../../../components/KpiCard'
import { PageHeader } from '../../../components/PageHeader'
import { StartTourButton } from '../../../components/tour/StartTourButton'
import { usePageTour } from '../../../hooks/usePageTour'
import { formatDate, formatMoney, primaryTypeLabels } from '../../../lib/accounting'

export function AccountingDashboardPage() {
  usePageTour('accounting')
  const query = useQuery({
    queryKey: ['accounting', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<AccountingDashboard>('/accounting/dashboard')
      return data
    },
  })

  const dashboard = query.data

  return (
    <div>
      <PageHeader
        title="المحاسبة"
        subtitle="نظرة عامة على الحسابات والقيود والمعاملات غير المربوطة"
        actions={<StartTourButton tourId="accounting" />}
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {dashboard && (
          <>
            <div
              data-tour="accounting-kpis"
              className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4"
            >
              <KpiCard label="الحسابات النشطة" value={dashboard.total_accounts} icon="account_balance" />
              <KpiCard label="قيود اليومية" value={dashboard.journal_entries_count} icon="edit_note" />
              <KpiCard label="التحويلات" value={dashboard.transfers_count} icon="swap_horiz" />
              <KpiCard
                label="مبيعات غير مربوطة"
                value={dashboard.unmapped_sales}
                icon="link_off"
                trend={dashboard.unmapped_sales > 0 ? 'تحتاج ربط' : undefined}
                trendUp={false}
              />
            </div>

            <div className="mb-md grid grid-cols-1 gap-md lg:grid-cols-2">
              <div
                data-tour="accounting-balances"
                className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
              >
                <h2 className="mb-sm text-sm font-bold text-on-surface">الأرصدة حسب النوع</h2>
                <div className="flex flex-col gap-xs">
                  {Object.entries(dashboard.balances_by_type).map(([type, balance]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded-lg bg-surface-container-low px-sm py-xs text-sm"
                    >
                      <span className="text-on-surface-variant">
                        {primaryTypeLabels[type as keyof typeof primaryTypeLabels] ?? type}
                      </span>
                      <span className="tabular-nums font-medium text-on-surface">
                        {formatMoney(balance)}
                      </span>
                    </div>
                  ))}
                  {Object.keys(dashboard.balances_by_type).length === 0 && (
                    <p className="text-sm text-on-surface-variant">لا توجد أرصدة بعد</p>
                  )}
                </div>
              </div>

              {dashboard.unmapped_sales > 0 && (
                <div
                  data-tour="accounting-unmapped"
                  className="rounded-lg border border-error/30 bg-error-container/20 p-md"
                >
                  <p className="mb-sm text-sm font-bold text-on-surface">
                    {dashboard.unmapped_sales} فاتورة مبيعات بانتظار الربط المحاسبي
                  </p>
                  <Link
                    to="/accounting/transactions"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    الانتقال لربط المبيعات ←
                  </Link>
                </div>
              )}
            </div>

            <div data-tour="accounting-recent">
            <h2 className="mb-sm text-lg font-bold text-on-surface">آخر القيود</h2>
            <DataTable<AccountingAccTransMapping & Record<string, unknown>>
              data={(dashboard.recent_entries ?? []) as (AccountingAccTransMapping & Record<string, unknown>)[]}
              keyExtractor={(row) => row.id}
              emptyMessage="لا توجد قيود حديثة"
              columns={[
                { key: 'ref_no', header: 'المرجع', render: (row) => row.ref_no ?? `#${row.id}` },
                {
                  key: 'type',
                  header: 'النوع',
                  render: (row) =>
                    row.type === 'transfer' ? 'تحويل' : row.type === 'journal_entry' ? 'قيد يومية' : row.type,
                },
                {
                  key: 'operation_date',
                  header: 'التاريخ',
                  render: (row) => formatDate(row.operation_date),
                },
                { key: 'note', header: 'ملاحظة', render: (row) => row.note ?? '—' },
                {
                  key: 'lines',
                  header: 'البنود',
                  render: (row) => String(row.lines?.length ?? 0),
                },
              ]}
            />
            </div>
          </>
        )}
      </AsyncState>
    </div>
  )
}
