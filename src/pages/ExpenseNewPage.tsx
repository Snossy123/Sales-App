import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { ExpenseRequestForm } from '../components/expenses/ExpenseRequestForm'
import { KpiCard } from '../components/KpiCard'
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
}

interface ExpensesListResponse extends PaginatedResponse<ExpenseRow> {
  total_amount?: string | number
}

interface PaymentsListResponse extends PaginatedResponse<unknown> {
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  const expensesQuery = useQuery({
    queryKey: ['my-expense-requests-today', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await api.get<ExpensesListResponse>('/expense-requests', {
        params: {
          per_page: 50,
          period: 'day',
          'filter[created_by]': userId,
        },
      })
      return data
    },
  })

  const paymentsQuery = useQuery({
    queryKey: ['my-payments-today', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await api.get<PaymentsListResponse>('/payment-transactions', {
        params: { per_page: 1, period: 'day', status: 'active', user_id: userId },
      })
      return data
    },
  })

  const paymentsTotal = Number(paymentsQuery.data?.total_amount ?? 0)
  const expensesTotal = Number(expensesQuery.data?.total_amount ?? 0)
  const handoverTotal = paymentsTotal - expensesTotal
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
    queryClient.invalidateQueries({ queryKey: ['my-expense-requests-today', userId] })
    queryClient.invalidateQueries({ queryKey: ['my-payments-today', userId] })
  }

  return (
    <SalesPageShell title="طلب مصروف" subtitle="المصروف يُسجَّل فورًا — المراجعة تتأكد منه آخر اليوم">
      <div className="mb-md grid gap-sm sm:grid-cols-3">
        <KpiCard label="مدفوعات اليوم" value={`${formatMoney(paymentsTotal)} ج.م`} icon="payments" />
        <KpiCard label="مصروفات اليوم" value={`${formatMoney(expensesTotal)} ج.م`} icon="receipt_long" />
        <KpiCard label="هيسلّم آخر اليوم" value={`${formatMoney(handoverTotal)} ج.م`} icon="account_balance_wallet" />
      </div>

      <div className="grid gap-md lg:grid-cols-[minmax(0,22rem)_1fr]">
        <ExpenseRequestForm onClose={() => navigate(-1)} onSuccess={refreshToday} />
        <section className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <h2 className="mb-md text-base font-bold text-on-surface">طلباتك اليوم</h2>
          <AsyncState isLoading={expensesQuery.isLoading} isError={expensesQuery.isError} error={expensesQuery.error}>
            <DataTable data={rows} keyExtractor={(row) => row.id} columns={columns} emptyMessage="لا توجد طلبات مصروف اليوم" />
          </AsyncState>
        </section>
      </div>
    </SalesPageShell>
  )
}
