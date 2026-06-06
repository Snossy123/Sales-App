import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { DashboardStats } from '../api/types'
import { KpiCard } from '../components/KpiCard'
import { AsyncState } from '../components/AsyncState'

function formatMoney(value: number) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function DashboardPage() {
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/dashboard')
      return data
    },
  })

  return (
    <div>
      <h1 className="mb-md text-2xl font-bold text-on-surface">لوحة التحكم</h1>
      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        {query.data && (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="مبيعات اليوم"
              value={formatMoney(query.data.sales_today)}
              icon="payments"
            />
            <KpiCard
              label="فواتير اليوم"
              value={query.data.invoices_today}
              icon="receipt_long"
            />
            <KpiCard
              label="إجمالي العملاء"
              value={query.data.customers_count}
              icon="group"
            />
            <KpiCard
              label="وحدات متاحة"
              value={query.data.available_units}
              icon="inventory_2"
            />
            <KpiCard
              label="أقساط متأخرة"
              value={query.data.overdue_installments}
              icon="warning"
            />
            <KpiCard
              label="مستحقة هذا الأسبوع"
              value={query.data.due_this_week}
              icon="event"
            />
            <KpiCard
              label="رصيد مستحق"
              value={formatMoney(query.data.outstanding_balance)}
              icon="account_balance"
            />
          </div>
        )}
      </AsyncState>
    </div>
  )
}
