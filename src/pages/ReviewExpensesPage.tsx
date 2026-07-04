import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { formatMoney } from '../lib/theme'

interface ExpenseRow {
  id: number
  reference_number?: string
  expense_type: string
  amount: number
  status: string
  branch?: { name?: string }
  employee?: { name?: string }
  distributor?: { name?: string }
}

const TYPE_LABELS: Record<string, string> = {
  operating: 'تشغيل',
  petty_cash: 'نثرية',
  distributor_payout: 'صرف عمولة',
  employee_debt: 'مديونية موظف',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  paid: 'مدفوع',
}

export function ReviewExpensesPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')

  const query = useQuery({
    queryKey: ['review-expenses', typeFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 50 }
      if (typeFilter) params['filter[expense_type]'] = typeFilter
      if (statusFilter) params['filter[status]'] = statusFilter
      const { data } = await api.get<{ data: ExpenseRow[] }>('/review/expenses', { params })
      return data.data ?? []
    },
  })

  const columns = useMemo(
    () => [
      {
        key: 'ref',
        header: 'المرجع',
        render: (row: ExpenseRow) => (
          <Link to={`/review/expenses/${row.id}`} className="text-primary hover:underline">
            {row.reference_number ?? `#${row.id}`}
          </Link>
        ),
      },
      {
        key: 'type',
        header: 'النوع',
        render: (row: ExpenseRow) => TYPE_LABELS[row.expense_type] ?? row.expense_type,
      },
      { key: 'amount', header: 'المبلغ', render: (row: ExpenseRow) => formatMoney(Number(row.amount)) },
      { key: 'branch', header: 'الفرع', render: (row: ExpenseRow) => row.branch?.name ?? '—' },
      {
        key: 'status',
        header: 'الحالة',
        render: (row: ExpenseRow) => (
          <StatusBadge
            status={row.status === 'rejected' ? 'error' : row.status === 'paid' ? 'success' : 'warning'}
            label={STATUS_LABELS[row.status] ?? row.status}
          />
        ),
      },
    ],
    [],
  )

  return (
    <SalesPageShell
      title="مراجعة المصروفات"
      subtitle="طلبات المصروفات — تشغيل، نثرية، صرف عمولة، مديونية موظف"
      filters={
        <FilterBar
          selects={[
            {
              id: 'type',
              label: 'النوع',
              value: typeFilter,
              onChange: setTypeFilter,
              options: [
                { value: '', label: 'كل الأنواع' },
                ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ],
            },
            {
              id: 'status',
              label: 'الحالة',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: '', label: 'الكل' },
                ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
              ],
            },
          ]}
        />
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable data={query.data ?? []} keyExtractor={(row) => row.id} pageSize={10} columns={columns} emptyMessage="لا توجد طلبات مصروفات" />
      </AsyncState>
    </SalesPageShell>
  )
}
