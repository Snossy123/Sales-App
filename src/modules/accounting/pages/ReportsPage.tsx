import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type {
  ArAgeingContactRow,
  BalanceSheetReport,
  IncomeStatementReport,
  TrialBalanceReport,
  TrialBalanceRow,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { KpiCard } from '../../../components/KpiCard'
import { PageHeader } from '../../../components/PageHeader'
import { formatMoney, primaryTypeLabels } from '../../../lib/accounting'

type ReportTab = 'trial-balance' | 'balance-sheet' | 'ar-ageing' | 'income-statement'

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('trial-balance')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [asOfDate, setAsOfDate] = useState('')
  const [arGroupBy, setArGroupBy] = useState<'contact' | 'due_date'>('contact')

  const trialQuery = useQuery({
    queryKey: ['accounting', 'reports', 'trial-balance', startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const { data } = await api.get<TrialBalanceReport>('/accounting/reports/trial-balance', { params })
      return data
    },
    enabled: tab === 'trial-balance',
  })

  const balanceSheetQuery = useQuery({
    queryKey: ['accounting', 'reports', 'balance-sheet', asOfDate],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (asOfDate) params.as_of_date = asOfDate
      const { data } = await api.get<BalanceSheetReport>('/accounting/reports/balance-sheet', { params })
      return data
    },
    enabled: tab === 'balance-sheet',
  })

  const arQuery = useQuery({
    queryKey: ['accounting', 'reports', 'ar-ageing', arGroupBy],
    queryFn: async () => {
      const { data } = await api.get<{ group_by: string; report: ArAgeingContactRow[] | Record<string, unknown[]> }>(
        '/accounting/reports/ar-ageing',
        { params: { group_by: arGroupBy } },
      )
      return data
    },
    enabled: tab === 'ar-ageing',
  })

  const incomeQuery = useQuery({
    queryKey: ['accounting', 'reports', 'income-statement', startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const { data } = await api.get<IncomeStatementReport>('/accounting/reports/income-statement', { params })
      return data
    },
    enabled: tab === 'income-statement',
  })

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'trial-balance', label: 'ميزان المراجعة' },
    { id: 'balance-sheet', label: 'الميزانية العمومية' },
    { id: 'ar-ageing', label: 'أعمار الذمم (AR)' },
    { id: 'income-statement', label: 'قائمة الدخل' },
  ]

  return (
    <div>
      <PageHeader title="التقارير المحاسبية" subtitle="ميزان المراجعة، الميزانية، أعمار الذمم، وقائمة الدخل" />

      <div className="mb-md flex flex-wrap gap-xs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-md py-xs text-sm font-medium ${
              tab === t.id ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'trial-balance' || tab === 'income-statement') && (
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
      )}

      {tab === 'trial-balance' && (
        <AsyncState isLoading={trialQuery.isLoading} isError={trialQuery.isError} error={trialQuery.error}>
          {trialQuery.data && (
            <>
              <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2">
                <KpiCard label="إجمالي المدين" value={formatMoney(trialQuery.data.total_debits)} icon="south_west" />
                <KpiCard label="إجمالي الدائن" value={formatMoney(trialQuery.data.total_credits)} icon="north_east" />
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
                    render: (row) => primaryTypeLabels[row.account_primary_type] ?? row.account_primary_type,
                  },
                  { key: 'total_debits', header: 'مدين', className: 'tabular-nums', render: (row) => formatMoney(row.total_debits) },
                  { key: 'total_credits', header: 'دائن', className: 'tabular-nums', render: (row) => formatMoney(row.total_credits) },
                  { key: 'balance', header: 'الرصيد', className: 'tabular-nums', render: (row) => formatMoney(row.balance) },
                ]}
              />
            </>
          )}
        </AsyncState>
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
            />
          </div>
          <AsyncState isLoading={balanceSheetQuery.isLoading} isError={balanceSheetQuery.isError} error={balanceSheetQuery.error}>
            {balanceSheetQuery.data && (
              <>
                <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard label="الأصول" value={formatMoney(balanceSheetQuery.data.assets)} icon="account_balance_wallet" />
                  <KpiCard label="الخصوم" value={formatMoney(balanceSheetQuery.data.liabilities)} icon="credit_card" />
                  <KpiCard label="حقوق الملكية" value={formatMoney(balanceSheetQuery.data.equity)} icon="savings" />
                  <KpiCard label="الخصوم + حقوق الملكية" value={formatMoney(balanceSheetQuery.data.liabilities_and_equity)} icon="balance" />
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

      {tab === 'ar-ageing' && (
        <>
          <div className="mb-md">
            <select
              value={arGroupBy}
              onChange={(e) => setArGroupBy(e.target.value as 'contact' | 'due_date')}
              className="rounded border border-outline-variant px-sm py-2 text-sm"
            >
              <option value="contact">حسب العميل</option>
              <option value="due_date">حسب تاريخ الاستحقاق</option>
            </select>
          </div>
          <AsyncState isLoading={arQuery.isLoading} isError={arQuery.isError} error={arQuery.error}>
            {arQuery.data && arGroupBy === 'contact' && (
              <DataTable<ArAgeingContactRow & Record<string, unknown>>
                data={(arQuery.data.report as ArAgeingContactRow[]).map((row) => ({ ...row })) as (ArAgeingContactRow & Record<string, unknown>)[]}
                keyExtractor={(row) => row.contact_id ?? row.name}
                emptyMessage="لا توجد ذمم مدينة"
                columns={[
                  { key: 'name', header: 'العميل' },
                  { key: '<1', header: 'جاري', className: 'tabular-nums', render: (row) => formatMoney(row['<1']) },
                  { key: '1_30', header: '1-30', className: 'tabular-nums', render: (row) => formatMoney(row['1_30']) },
                  { key: '31_60', header: '31-60', className: 'tabular-nums', render: (row) => formatMoney(row['31_60']) },
                  { key: '61_90', header: '61-90', className: 'tabular-nums', render: (row) => formatMoney(row['61_90']) },
                  { key: '>90', header: '>90', className: 'tabular-nums', render: (row) => formatMoney(row['>90']) },
                  { key: 'total_due', header: 'الإجمالي', className: 'tabular-nums', render: (row) => formatMoney(row.total_due) },
                ]}
              />
            )}
            {arQuery.data && arGroupBy === 'due_date' && (
              <p className="rounded-lg border border-outline-variant p-md text-sm text-on-surface-variant">
                {(Object.values(arQuery.data.report as Record<string, unknown[]>).flat().length || 0) > 0
                  ? 'عرض تفصيلي حسب الفترة متاح في وضع العميل'
                  : 'لا توجد فواتير مستحقة'}
              </p>
            )}
          </AsyncState>
        </>
      )}

      {tab === 'income-statement' && (
        <AsyncState isLoading={incomeQuery.isLoading} isError={incomeQuery.isError} error={incomeQuery.error}>
          {incomeQuery.data && (
            <>
              <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-3">
                <KpiCard label="إجمالي الإيرادات" value={formatMoney(incomeQuery.data.total_income)} icon="trending_up" />
                <KpiCard label="إجمالي المصروفات" value={formatMoney(incomeQuery.data.total_expenses)} icon="trending_down" />
                <KpiCard label="صافي الربح" value={formatMoney(incomeQuery.data.net_profit)} icon="payments" />
              </div>
              <DataTable<
                IncomeStatementReport['lines'][number] & Record<string, unknown>
              >
                data={incomeQuery.data.lines as (IncomeStatementReport['lines'][number] & Record<string, unknown>)[]}
                keyExtractor={(row) => row.id}
                columns={[
                  { key: 'gl_code', header: 'الكود', render: (row) => row.gl_code ?? '—' },
                  { key: 'name', header: 'الحساب' },
                  {
                    key: 'account_primary_type',
                    header: 'النوع',
                    render: (row) => primaryTypeLabels[row.account_primary_type] ?? row.account_primary_type,
                  },
                  { key: 'balance', header: 'الرصيد', className: 'tabular-nums', render: (row) => formatMoney(row.balance) },
                ]}
              />
            </>
          )}
        </AsyncState>
      )}
    </div>
  )
}
