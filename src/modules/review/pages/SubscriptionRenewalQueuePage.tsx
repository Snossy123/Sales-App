import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { SubscriptionRenewalQueueItem } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { FilterBar } from '../../../components/FilterBar'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { formatDate } from '../../../lib/accounting'
import { userHasPermission } from '../../../lib/access'
import { useAuthStore } from '../../../stores/authStore'
import {
  listSubscriptionRenewals,
  SUBSCRIPTION_RENEWAL_STATUS_LABELS,
} from '../api'

const DUE_STATUS_OPTIONS = [
  { value: 'overdue', label: 'المنتهي' },
  { value: 'upcoming', label: 'قادم (خلال 30 يوم)' },
  { value: 'all', label: 'كل الاشتراكات السنوية' },
]

function formatDaysUntil(days: number | null | undefined): string {
  if (days == null) return '—'
  if (days < 0) return `متأخر ${Math.abs(days)} يوم`
  if (days === 0) return 'اليوم'
  return `بعد ${days} يوم`
}

export function SubscriptionRenewalQueuePage() {
  const user = useAuthStore((s) => s.user)
  const canRenew = userHasPermission(user, 'sales.pos')
  const [dueStatusFilter, setDueStatusFilter] = useState<'overdue' | 'upcoming' | 'all'>('overdue')

  const query = useQuery({
    queryKey: ['review', 'subscription-renewals', dueStatusFilter],
    queryFn: () =>
      listSubscriptionRenewals({
        due_status: dueStatusFilter,
        days_ahead: 30,
      }),
  })

  const rows = query.data?.data ?? []

  return (
    <div>
      <PageHeader
        title="تجديد الاشتراكات"
        subtitle="العملاء الذين يحتاجون تجديد اشتراكهم السنوي للتواصل معهم"
      />

      <FilterBar
        selects={[
          {
            id: 'due_status',
            label: 'الفلتر',
            value: dueStatusFilter,
            options: DUE_STATUS_OPTIONS,
            onChange: (value) => setDueStatusFilter(value as typeof dueStatusFilter),
          },
        ]}
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<SubscriptionRenewalQueueItem & Record<string, unknown>>
          data={rows as (SubscriptionRenewalQueueItem & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={15}
          emptyMessage="لا توجد اشتراكات تحتاج تجديداً"
          columns={[
            { key: 'customer_name', header: 'العميل', render: (row) => row.customer_name ?? '—' },
            {
              key: 'customer_phone',
              header: 'الهاتف',
              className: 'tabular-nums',
              render: (row) =>
                row.customer_phone ? (
                  <a href={`tel:${row.customer_phone}`} className="text-primary hover:underline">
                    {row.customer_phone}
                  </a>
                ) : (
                  '—'
                ),
            },
            { key: 'invoice_number', header: 'العقد', render: (row) => row.invoice_number ?? '—' },
            {
              key: 'subscription_renewal_date',
              header: 'تاريخ التجديد',
              render: (row) =>
                row.subscription_renewal_date ? formatDate(row.subscription_renewal_date) : '—',
            },
            {
              key: 'days_until_renewal',
              header: 'المدة',
              render: (row) => formatDaysUntil(row.days_until_renewal),
            },
            {
              key: 'renewal_status',
              header: 'الحالة',
              render: (row) =>
                row.renewal_status ? (
                  <StatusBadge
                    status={row.renewal_status}
                    label={SUBSCRIPTION_RENEWAL_STATUS_LABELS[row.renewal_status]}
                  />
                ) : (
                  '—'
                ),
            },
            {
              key: 'vehicle_info',
              header: 'الجهاز / المركبة',
              render: (row) => row.vehicle_info ?? row.serial_number ?? row.sim_number ?? '—',
            },
            { key: 'branch_name', header: 'الفرع', render: (row) => row.branch_name ?? '—' },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  {canRenew ? (
                    <Link
                      to={`/pos?contract_kind=subscription_renewal&renewal_line_id=${row.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      تجديد
                    </Link>
                  ) : null}
                  {row.customer_id ? (
                    <Link
                      to={`/customers/${row.customer_id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      العميل
                    </Link>
                  ) : null}
                  {row.sales_invoice_id ? (
                    <Link
                      to={`/invoices/${row.sales_invoice_id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      العقد
                    </Link>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
