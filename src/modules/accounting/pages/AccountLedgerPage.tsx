import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../../api/client'
import type { AccountingAccount, AccountingTransactionLine, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { KpiCard } from '../../../components/KpiCard'
import { PageHeader } from '../../../components/PageHeader'
import { formatDate, formatMoney } from '../../../lib/accounting'

interface LedgerResponse {
  account: AccountingAccount
  balance: number
  transactions: PaginatedResponse<AccountingTransactionLine>
}

export function AccountLedgerPage() {
  const { id } = useParams<{ id: string }>()
  const accountId = Number(id)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const query = useQuery({
    queryKey: ['accounting', 'ledger', accountId, startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const { data } = await api.get<LedgerResponse>(
        `/accounting/chart-of-accounts/${accountId}/ledger`,
        { params },
      )
      return data
    },
    enabled: Number.isFinite(accountId) && accountId > 0,
  })

  const rows = useMemo(() => {
    let running = 0
    const lines = query.data?.transactions.data ?? []
    const account = query.data?.account
    if (!account) return []

    return lines.map((line) => {
      const amount = Number(line.amount)
      const signed =
        (account.account_primary_type === 'asset' || account.account_primary_type === 'expense')
          ? line.type === 'debit' ? amount : -amount
          : line.type === 'credit' ? amount : -amount
      running += signed
      return { ...line, running_balance: running }
    })
  }, [query.data])

  return (
    <div>
      <PageHeader
        title={query.data?.account?.name ?? 'دفتر الحساب'}
        subtitle={
          query.data?.account?.gl_code
            ? `كود ${query.data.account.gl_code}`
            : 'حركات الحساب والرصيد الجاري'
        }
        actions={
          <Link
            to="/accounting/chart-of-accounts"
            className="rounded-lg border border-outline-variant px-md py-sm text-sm hover:bg-surface-container-low"
          >
            ← دليل الحسابات
          </Link>
        }
      />

      <div className="mb-md flex flex-wrap gap-sm">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded border border-outline-variant px-sm py-2 text-sm"
          dir="ltr"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded border border-outline-variant px-sm py-2 text-sm"
          dir="ltr"
        />
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && (
          <>
            <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2">
              <KpiCard
                label="الرصيد"
                value={formatMoney(query.data.balance)}
                icon="account_balance_wallet"
              />
              <KpiCard
                label="عدد الحركات"
                value={String(query.data.transactions.data.length)}
                icon="receipt_long"
              />
            </div>

            <DataTable<
              AccountingTransactionLine & { running_balance: number } & Record<string, unknown>
            >
              data={rows as (AccountingTransactionLine & { running_balance: number } & Record<string, unknown>)[]}
              keyExtractor={(row) => row.id}
              emptyMessage="لا توجد حركات في هذه الفترة"
              columns={[
                {
                  key: 'operation_date',
                  header: 'التاريخ',
                  render: (row) => formatDate(row.operation_date),
                },
                {
                  key: 'type',
                  header: 'النوع',
                  render: (row) => (row.type === 'debit' ? 'مدين' : 'دائن'),
                },
                {
                  key: 'amount',
                  header: 'المبلغ',
                  className: 'tabular-nums',
                  render: (row) => formatMoney(row.amount),
                },
                {
                  key: 'running_balance',
                  header: 'الرصيد الجاري',
                  className: 'tabular-nums',
                  render: (row) => formatMoney(row.running_balance),
                },
                { key: 'note', header: 'ملاحظة', render: (row) => row.note ?? '—' },
              ]}
            />
          </>
        )}
      </AsyncState>
    </div>
  )
}
