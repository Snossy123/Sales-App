import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { BalanceSheetReport, TrialBalanceReport, TrialBalanceRow } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { KpiCard } from '../../../components/KpiCard'
import { PageHeader } from '../../../components/PageHeader'
import { formatMoney, primaryTypeLabels } from '../../../lib/accounting'
import { AccountingSubNav } from '../components/AccountingSubNav'

type ReportTab = 'trial-balance' | 'balance-sheet'

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('trial-balance')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [asOfDate, setAsOfDate] = useState('')

  const trialQuery = useQuery({
    queryKey: ['accounting', 'reports', 'trial-balance', startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const { data } = await api.get<TrialBalanceReport>('/accounting/reports/trial-balance', {
        params,
      })
      return data
    },
    enabled: tab === 'trial-balance',
  })

  const balanceSheetQuery = useQuery({
    queryKey: ['accounting', 'reports', 'balance-sheet', asOfDate],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (asOfDate) params.as_of_date = asOfDate
      const { data } = await api.get<BalanceSheetReport>('/accounting/reports/balance-sheet', {
        params,
      })
      return data
    },
    enabled: tab === 'balance-sheet',
  })

  return (
    <div>
      <PageHeader title="التقارير المحاسبية" subtitle="ميزان المراجعة والميزانية العمومية" />
      <AccountingSubNav />

      <div className="mb-md flex gap-xs">
        <button
          type="button"
          onClick={() => setTab('trial-balance')}
          className={`rounded-lg px-md py-xs text-sm font-medium ${
            tab === 'trial-balance'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          ميزان المراجعة
        </button>
        <button
          type="button"
          onClick={() => setTab('balance-sheet')}
          className={`rounded-lg px-md py-xs text-sm font-medium ${
            tab === 'balance-sheet'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          الميزانية العمومية
        </button>
      </div>

      {tab === 'trial-balance' && (
        <>
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

          <AsyncState
            isLoading={trialQuery.isLoading}
            isError={trialQuery.isError}
            error={trialQuery.error}
          >
            {trialQuery.data && (
              <>
                <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2">
                  <KpiCard
                    label="إجمالي المدين"
                    value={formatMoney(trialQuery.data.total_debits)}
                    icon="south_west"
                  />
                  <KpiCard
                    label="إجمالي الدائن"
                    value={formatMoney(trialQuery.data.total_credits)}
                    icon="north_east"
                  />
                </div>
                <DataTable<TrialBalanceRow & Record<string, unknown>>
                  data={trialQuery.data.accounts as (TrialBalanceRow & Record<string, unknown>)[]}
                  keyExtractor={(row) => row.id}
                  columns={[
                    { key: 'gl_code', header: 'الكود', render: (row) => row.gl_code ?? '—' },
                    { key: 'name', header: 'الحساب' },
                    {
                      key: 'account_primary_type',
                      header: 'النوع',
                      render: (row) =>
                        primaryTypeLabels[row.account_primary_type] ?? row.account_primary_type,
                    },
                    {
                      key: 'total_debits',
                      header: 'مدين',
                      className: 'tabular-nums',
                      render: (row) => formatMoney(row.total_debits),
                    },
                    {
                      key: 'total_credits',
                      header: 'دائن',
                      className: 'tabular-nums',
                      render: (row) => formatMoney(row.total_credits),
                    },
                    {
                      key: 'balance',
                      header: 'الرصيد',
                      className: 'tabular-nums',
                      render: (row) => formatMoney(row.balance),
                    },
                  ]}
                />
              </>
            )}
          </AsyncState>
        </>
      )}

      {tab === 'balance-sheet' && (
        <>
          <div className="mb-md">
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="rounded border border-outline-variant px-sm py-2 text-sm"
              dir="ltr"
              placeholder="حتى تاريخ"
            />
          </div>

          <AsyncState
            isLoading={balanceSheetQuery.isLoading}
            isError={balanceSheetQuery.isError}
            error={balanceSheetQuery.error}
          >
            {balanceSheetQuery.data && (
              <>
                <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard
                    label="الأصول"
                    value={formatMoney(balanceSheetQuery.data.assets)}
                    icon="account_balance_wallet"
                  />
                  <KpiCard
                    label="الخصوم"
                    value={formatMoney(balanceSheetQuery.data.liabilities)}
                    icon="credit_card"
                  />
                  <KpiCard
                    label="حقوق الملكية"
                    value={formatMoney(balanceSheetQuery.data.equity)}
                    icon="savings"
                  />
                  <KpiCard
                    label="الخصوم + حقوق الملكية"
                    value={formatMoney(balanceSheetQuery.data.liabilities_and_equity)}
                    icon="balance"
                  />
                </div>
                <div
                  className={`rounded-lg border p-md text-sm ${
                    balanceSheetQuery.data.balanced
                      ? 'border-secondary/40 bg-secondary/5 text-on-surface'
                      : 'border-error/40 bg-error-container/20 text-error'
                  }`}
                >
                  {balanceSheetQuery.data.balanced
                    ? `الميزانية متوازنة حتى ${balanceSheetQuery.data.as_of_date}`
                    : 'الميزانية غير متوازنة — راجع القيود'}
                </div>
              </>
            )}
          </AsyncState>
        </>
      )}
    </div>
  )
}
