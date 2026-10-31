import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { ExpenseRequestForm } from '../components/expenses/ExpenseRequestForm'
import { KpiCard } from '../components/KpiCard'
import { Pagination } from '../components/Pagination'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import { formatMoney } from '../lib/theme'
import { useAuthStore } from '../stores/authStore'

interface ExpenseRow {
  id: number
  reference_number?: string
  expense_type: string
  amount: number
  status: string
  notes?: string | null
}

interface ExpensesListResponse extends PaginatedResponse<ExpenseRow> {
  total_amount?: string | number
}

const TYPE_LABELS: Record<string, string> = {
  operating: 'تشغيل',
  petty_cash: 'نثرية',
  distributor_payout: 'صرف عمولة',
  employee_debt: 'مديونية موظف',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'مسجّل — مراجعة آخر اليوم',
  approved: 'معتمد',
  rejected: 'مرفوض',
  paid: 'مدفوع',
}

export function ExpenseNewPage() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const [formOpen, setFormOpen] = useState(false)
  const [page, setPage] = useState(1)

  const expensesQuery = useQuery({
    queryKey: ['my-expense-requests-today', userId, page],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await api.get<ExpensesListResponse>('/expense-requests', {
        params: {
          per_page: 15,
          page,
          period: 'day',
          'filter[created_by]': userId,
        },
      })
      return data
    },
  })

  const expensesTotal = Number(expensesQuery.data?.total_amount ?? 0)
  const rows = expensesQuery.data?.data ?? []

  const columns = useMemo(
    () => [
      {
        key: 'ref',
        header: 'المرجع',
        render: (row: ExpenseRow) => row.reference_number ?? `#${row.id}`,
      },
      {
        key: 'type',
        header: 'النوع',
        render: (row: ExpenseRow) => TYPE_LABELS[row.expense_type] ?? row.expense_type,
      },
      {
        key: 'notes',
        header: 'الوصف',
        render: (row: ExpenseRow) => row.notes?.trim() || '—',
      },
      { key: 'amount', header: 'المبلغ', render: (row: ExpenseRow) => formatMoney(Number(row.amount)) },
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

  const refreshToday = () => {
    queryClient.invalidateQueries({ queryKey: ['my-expense-requests-today'] })
    setFormOpen(false)
    setPage(1)
  }

  return (
    <SalesPageShell title="طلب مصروف" subtitle="المصروف يُسجَّل فورًا — المراجعة تتأكد منه آخر اليوم">
      <div className="mb-md max-w-sm">
        <KpiCard label="مصروفات اليوم" value={formatMoney(expensesTotal)} icon="receipt_long" />
      </div>

      <section className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
          <h2 className="text-base font-bold text-on-surface">طلباتك اليوم</h2>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary"
            onClick={() => setFormOpen(true)}
          >
            تسجيل مصروف
          </button>
        </div>
        <AsyncState isLoading={expensesQuery.isLoading} isError={expensesQuery.isError} error={expensesQuery.error}>
          <DataTable data={rows} keyExtractor={(row) => row.id} columns={columns} emptyMessage="لا توجد طلبات مصروف اليوم" />
          {expensesQuery.data ? (
            <Pagination
              currentPage={expensesQuery.data.current_page}
              lastPage={expensesQuery.data.last_page}
              total={expensesQuery.data.total}
              onPageChange={setPage}
            />
          ) : null}
        </AsyncState>
      </section>

      <ExpenseRequestForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={refreshToday} />
    </SalesPageShell>
  )
}
