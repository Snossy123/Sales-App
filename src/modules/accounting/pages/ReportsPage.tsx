import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type {
  ArAgeingContactRow,
  ArReconciliationReport,
  BalanceSheetAccountRow,
  BalanceSheetReport,
  Branch,
  BudgetVarianceRow,
  CashStatementEntry,
  GeneralLedgerEntry,
  IncomeStatementReport,
  PaginatedResponse,
  TrialBalanceReport,
  TrialBalanceRow,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { KpiCard } from '../../../components/KpiCard'
import { PageHeader } from '../../../components/PageHeader'
import { StartTourButton } from '../../../components/tour/StartTourButton'
import { usePageTour } from '../../../hooks/usePageTour'
import { formatDate, formatMoney, primaryTypeLabels } from '../../../lib/accounting'

type ReportTab =
  | 'trial-balance'
  | 'balance-sheet'
  | 'ar-ageing'
  | 'income-statement'
  | 'general-ledger'
  | 'budget-variance'
  | 'ar-reconciliation'
  | 'cash-statement'

function reportParams(branchId: string, extra: Record<string, string> = {}): Record<string, string> {
  const params: Record<string, string> = { ...extra }
  if (branchId) params.branch_id = branchId
  return params
}

export function ReportsPage() {
  usePageTour('reports')
  const printRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<ReportTab>('trial-balance')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [asOfDate, setAsOfDate] = useState('')
  const [branchId, setBranchId] = useState('')
  const [arGroupBy, setArGroupBy] = useState<'contact' | 'due_date'>('contact')
  const [financialYear, setFinancialYear] = useState(String(new Date().getFullYear()))

  const branchesQuery = useQuery({
    queryKey: ['branches', 'list'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params: { per_page: 100 } })
      return data.data
    },
  })

  const trialQuery = useQuery({
    queryKey: ['accounting', 'reports', 'trial-balance', startDate, endDate, branchId],
    queryFn: async () => {
      const params = reportParams(branchId, {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      })
      const { data } = await api.get<TrialBalanceReport>('/accounting/reports/trial-balance', { params })
      return data
    },
    enabled: tab === 'trial-balance',
  })

  const balanceSheetQuery = useQuery({
    queryKey: ['accounting', 'reports', 'balance-sheet', asOfDate, branchId],
    queryFn: async () => {
      const params = reportParams(branchId, asOfDate ? { as_of_date: asOfDate } : {})
      const { data } = await api.get<BalanceSheetReport>('/accounting/reports/balance-sheet', { params })
      return data
    },
    enabled: tab === 'balance-sheet',
  })

  const arQuery = useQuery({
    queryKey: ['accounting', 'reports', 'ar-ageing', arGroupBy, branchId],
    queryFn: async () => {
      const { data } = await api.get<{ group_by: string; report: ArAgeingContactRow[] | Record<string, unknown[]> }>(
        '/accounting/reports/ar-ageing',
        { params: reportParams(branchId, { group_by: arGroupBy }) },
      )
      return data
    },
    enabled: tab === 'ar-ageing',
  })

  const incomeQuery = useQuery({
    queryKey: ['accounting', 'reports', 'income-statement', startDate, endDate, branchId],
    queryFn: async () => {
      const params = reportParams(branchId, {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      })
      const { data } = await api.get<IncomeStatementReport>('/accounting/reports/income-statement', { params })
      return data
    },
    enabled: tab === 'income-statement',
  })

  const glQuery = useQuery({
    queryKey: ['accounting', 'reports', 'general-ledger', startDate, endDate, branchId],
    queryFn: async () => {
      const params = reportParams(branchId, {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      })
      const { data } = await api.get<{ entries: GeneralLedgerEntry[] }>('/accounting/reports/general-ledger', {
        params,
      })
      return data
    },
    enabled: tab === 'general-ledger',
  })

  const budgetQuery = useQuery({
    queryKey: ['accounting', 'reports', 'budget-variance', financialYear, branchId],
    queryFn: async () => {
      const { data } = await api.get<{ rows: BudgetVarianceRow[] }>('/accounting/reports/budget-variance', {
        params: reportParams(branchId, { financial_year: financialYear }),
      })
      return data
    },
    enabled: tab === 'budget-variance',
  })

  const arReconQuery = useQuery({
    queryKey: ['accounting', 'reports', 'ar-reconciliation', asOfDate, branchId],
    queryFn: async () => {
      const params = reportParams(branchId, asOfDate ? { as_of_date: asOfDate } : {})
      const { data } = await api.get<ArReconciliationReport>('/accounting/reports/ar-reconciliation', { params })
      return data
    },
    enabled: tab === 'ar-reconciliation',
  })

  const cashQuery = useQuery({
    queryKey: ['accounting', 'reports', 'cash-statement', startDate, endDate, branchId],
    queryFn: async () => {
      const params = reportParams(branchId, {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      })
      const { data } = await api.get<{ entries: CashStatementEntry[] }>('/accounting/reports/cash-statement', {
        params,
      })
      return data
    },
    enabled: tab === 'cash-statement',
  })

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'trial-balance', label: 'ميزان المراجعة' },
    { id: 'balance-sheet', label: 'الميزانية العمومية' },
    { id: 'ar-ageing', label: 'أعمار الذمم (AR)' },
    { id: 'income-statement', label: 'قائمة الدخل' },
    { id: 'general-ledger', label: 'دفتر الأستاذ العام' },
    { id: 'budget-variance', label: 'الميزانية vs الفعلي' },
    { id: 'ar-reconciliation', label: 'تسوية AR' },
    { id: 'cash-statement', label: 'كشف نقدية' },
  ]

  const handlePrint = () => window.print()

  return (
    <div>
      <PageHeader
        title="التقارير المحاسبية"
        subtitle="ميزان المراجعة، الميزانية، أعمار الذمم، وقائمة الدخل"
        actions={
          <div className="flex gap-xs">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg border border-outline-variant px-md py-sm text-sm font-medium print:hidden"
            >
              طباعة
            </button>
            <StartTourButton tourId="reports" />
          </div>
        }
      />

      <div data-tour="reports-tabs" className="mb-md flex flex-wrap gap-xs print:hidden">
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

      <div data-tour="reports-filters" className="mb-md flex flex-wrap gap-sm print:hidden">
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="rounded border border-outline-variant px-sm py-2 text-sm"
        >
          <option value="">كل الفروع</option>
          {(branchesQuery.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {(tab === 'trial-balance' ||
          tab === 'income-statement' ||
          tab === 'general-ledger' ||
          tab === 'cash-statement') && (
          <>
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
          </>
        )}

        {(tab === 'balance-sheet' || tab === 'ar-reconciliation') && (
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="rounded border border-outline-variant px-sm py-2 text-sm"
            dir="ltr"
          />
        )}

        {tab === 'ar-ageing' && (
          <select
            value={arGroupBy}
            onChange={(e) => setArGroupBy(e.target.value as 'contact' | 'due_date')}
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          >
            <option value="contact">حسب العميل</option>
            <option value="due_date">حسب تاريخ الاستحقاق</option>
          </select>
        )}

        {tab === 'budget-variance' && (
          <input
            type="number"
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="w-28 rounded border border-outline-variant px-sm py-2 text-sm"
            dir="ltr"
          />
        )}
      </div>

      <div ref={printRef} className="print:p-md">
        {tab === 'trial-balance' && (
          <AsyncState isLoading={trialQuery.isLoading} isError={trialQuery.isError} error={trialQuery.error}>
            {trialQuery.data && (
              <>
                <div data-tour="reports-summary" className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2">
                  <KpiCard label="إجمالي المدين" value={formatMoney(trialQuery.data.total_debits)} icon="south_west" />
                  <KpiCard label="إجمالي الدائن" value={formatMoney(trialQuery.data.total_credits)} icon="north_east" />
                </div>
                <DataTable<TrialBalanceRow & Record<string, unknown>>
                  dataTour="reports-table"
                  data={trialQuery.data.accounts as (TrialBalanceRow & Record<string, unknown>)[]}
                  keyExtractor={(row) => row.id}
                  pageSize={10}
                  columns={[
                    { key: 'gl_code', header: 'الكود', render: (row) => row.gl_code ?? '—' },
                    { key: 'name', header: 'الحساب' },
                    {
                      key: 'account_primary_type',
                      header: 'النوع',
                      render: (row) => primaryTypeLabels[row.account_primary_type] ?? row.account_primary_type,
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
        )}

        {tab === 'balance-sheet' && (
          <AsyncState
            isLoading={balanceSheetQuery.isLoading}
            isError={balanceSheetQuery.isError}
            error={balanceSheetQuery.error}
          >
            {balanceSheetQuery.data && (
              <>
                <div data-tour="reports-summary" className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard label="الأصول" value={formatMoney(balanceSheetQuery.data.assets)} icon="account_balance_wallet" />
                  <KpiCard label="الخصوم" value={formatMoney(balanceSheetQuery.data.liabilities)} icon="credit_card" />
                  <KpiCard label="حقوق الملكية" value={formatMoney(balanceSheetQuery.data.equity)} icon="savings" />
                  <KpiCard
                    label="الخصوم + حقوق الملكية"
                    value={formatMoney(balanceSheetQuery.data.liabilities_and_equity)}
                    icon="balance"
                  />
                </div>
                <div
                  className={`mb-md rounded-lg border p-md text-sm ${
                    balanceSheetQuery.data.balanced
                      ? 'border-secondary/40 bg-secondary/5 text-on-surface'
                      : 'border-error/40 bg-error-container/20 text-error'
                  }`}
                >
                  {balanceSheetQuery.data.balanced
                    ? `الميزانية متوازنة حتى ${balanceSheetQuery.data.as_of_date}`
                    : 'الميزانية غير متوازنة — راجع القيود'}
                </div>
                {(balanceSheetQuery.data.accounts?.length ?? 0) > 0 && (
                  <DataTable<BalanceSheetAccountRow & Record<string, unknown>>
                    data={(balanceSheetQuery.data.accounts ?? []) as (BalanceSheetAccountRow & Record<string, unknown>)[]}
                    keyExtractor={(row) => row.id}
                    pageSize={15}
                    columns={[
                      { key: 'gl_code', header: 'الكود', render: (row) => row.gl_code ?? '—' },
                      { key: 'name', header: 'الحساب' },
                      {
                        key: 'account_primary_type',
                        header: 'النوع',
                        render: (row) => primaryTypeLabels[row.account_primary_type] ?? row.account_primary_type,
                      },
                      {
                        key: 'balance',
                        header: 'الرصيد',
                        className: 'tabular-nums',
                        render: (row) => formatMoney(row.balance),
                      },
                    ]}
                  />
                )}
              </>
            )}
          </AsyncState>
        )}

        {tab === 'ar-ageing' && (
          <AsyncState isLoading={arQuery.isLoading} isError={arQuery.isError} error={arQuery.error}>
            {arQuery.data && arGroupBy === 'contact' && (
              <DataTable<ArAgeingContactRow & Record<string, unknown>>
                dataTour="reports-table"
                data={(arQuery.data.report as ArAgeingContactRow[]).map((row) => ({ ...row })) as (ArAgeingContactRow &
                  Record<string, unknown>)[]}
                keyExtractor={(row) => row.contact_id ?? row.name}
                pageSize={10}
                emptyMessage="لا توجد ذمم مدينة"
                columns={[
                  { key: 'name', header: 'العميل' },
                  { key: '<1', header: 'جاري', className: 'tabular-nums', render: (row) => formatMoney(row['<1']) },
                  { key: '1_30', header: '1-30', className: 'tabular-nums', render: (row) => formatMoney(row['1_30']) },
                  { key: '31_60', header: '31-60', className: 'tabular-nums', render: (row) => formatMoney(row['31_60']) },
                  { key: '61_90', header: '61-90', className: 'tabular-nums', render: (row) => formatMoney(row['61_90']) },
                  { key: '>90', header: '>90', className: 'tabular-nums', render: (row) => formatMoney(row['>90']) },
                  {
                    key: 'total_due',
                    header: 'الإجمالي',
                    className: 'tabular-nums',
                    render: (row) => formatMoney(row.total_due),
                  },
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
        )}

        {tab === 'income-statement' && (
          <AsyncState isLoading={incomeQuery.isLoading} isError={incomeQuery.isError} error={incomeQuery.error}>
            {incomeQuery.data && (
              <>
                <div data-tour="reports-summary" className="mb-md grid grid-cols-1 gap-md sm:grid-cols-3">
                  <KpiCard label="إجمالي الإيرادات" value={formatMoney(incomeQuery.data.total_income)} icon="trending_up" />
                  <KpiCard label="إجمالي المصروفات" value={formatMoney(incomeQuery.data.total_expenses)} icon="trending_down" />
                  <KpiCard label="صافي الربح" value={formatMoney(incomeQuery.data.net_profit)} icon="payments" />
                </div>
                <DataTable<IncomeStatementReport['lines'][number] & Record<string, unknown>>
                  dataTour="reports-table"
                  data={incomeQuery.data.lines as (IncomeStatementReport['lines'][number] & Record<string, unknown>)[]}
                  keyExtractor={(row) => row.id}
                  pageSize={10}
                  columns={[
                    { key: 'gl_code', header: 'الكود', render: (row) => row.gl_code ?? '—' },
                    { key: 'name', header: 'الحساب' },
                    {
                      key: 'account_primary_type',
                      header: 'النوع',
                      render: (row) => primaryTypeLabels[row.account_primary_type] ?? row.account_primary_type,
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
        )}

        {tab === 'general-ledger' && (
          <AsyncState isLoading={glQuery.isLoading} isError={glQuery.isError} error={glQuery.error}>
            {glQuery.data && (
              <DataTable<GeneralLedgerEntry & Record<string, unknown>>
                data={glQuery.data.entries as (GeneralLedgerEntry & Record<string, unknown>)[]}
                keyExtractor={(row) => `${row.transaction_id}-${row.account_id}`}
                pageSize={15}
                emptyMessage="لا توجد حركات"
                columns={[
                  { key: 'operation_date', header: 'التاريخ', render: (row) => formatDate(row.operation_date) },
                  { key: 'ref_no', header: 'المرجع', render: (row) => row.ref_no ?? '—' },
                  { key: 'account_name', header: 'الحساب' },
                  { key: 'type', header: 'نوع', render: (row) => (row.type === 'debit' ? 'مدين' : 'دائن') },
                  { key: 'amount', header: 'المبلغ', className: 'tabular-nums', render: (row) => formatMoney(row.amount) },
                  {
                    key: 'running_balance',
                    header: 'الرصيد الجاري',
                    className: 'tabular-nums',
                    render: (row) => formatMoney(row.running_balance),
                  },
                ]}
              />
            )}
          </AsyncState>
        )}

        {tab === 'budget-variance' && (
          <AsyncState isLoading={budgetQuery.isLoading} isError={budgetQuery.isError} error={budgetQuery.error}>
            {budgetQuery.data && (
              <div className="flex flex-col gap-md">
                {(budgetQuery.data.rows ?? []).map((row) => (
                  <div key={row.account_id} className="rounded-lg border border-outline-variant p-md">
                    <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
                      <h3 className="font-medium text-on-surface">
                        {row.gl_code ? `${row.gl_code} — ` : ''}
                        {row.account_name}
                      </h3>
                      <span className="text-sm text-on-surface-variant">
                        سنوي: {formatMoney(row.yearly_budget)} / {formatMoney(row.yearly_actual)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-xs sm:grid-cols-4 lg:grid-cols-6">
                      {row.months.map((m) => (
                        <div key={m.month} className="rounded bg-surface-container-low px-xs py-1 text-xs">
                          <div className="font-bold">{m.month}</div>
                          <div>ميزانية: {formatMoney(m.budget)}</div>
                          <div>فعلي: {formatMoney(m.actual)}</div>
                          <div className={m.variance >= 0 ? 'text-secondary' : 'text-error'}>
                            فرق: {formatMoney(m.variance)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {(budgetQuery.data.rows ?? []).length === 0 && (
                  <p className="text-sm text-on-surface-variant">لا توجد ميزانيات مسجلة لهذه السنة</p>
                )}
              </div>
            )}
          </AsyncState>
        )}

        {tab === 'ar-reconciliation' && (
          <AsyncState isLoading={arReconQuery.isLoading} isError={arReconQuery.isError} error={arReconQuery.error}>
            {arReconQuery.data && (
              <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="رصيد AR (GL)" value={formatMoney(arReconQuery.data.gl_ar_balance)} icon="account_balance" />
                <KpiCard
                  label="ذمم من الفواتير"
                  value={formatMoney(arReconQuery.data.operational_balance_due)}
                  icon="receipt_long"
                />
                <KpiCard label="الفرق" value={formatMoney(arReconQuery.data.difference)} icon="compare_arrows" />
                <KpiCard
                  label="الحالة"
                  value={arReconQuery.data.reconciled ? 'متطابق' : 'يحتاج مراجعة'}
                  icon={arReconQuery.data.reconciled ? 'check_circle' : 'warning'}
                />
              </div>
            )}
          </AsyncState>
        )}

        {tab === 'cash-statement' && (
          <AsyncState isLoading={cashQuery.isLoading} isError={cashQuery.isError} error={cashQuery.error}>
            {cashQuery.data && (
              <DataTable<CashStatementEntry & Record<string, unknown>>
                data={cashQuery.data.entries as (CashStatementEntry & Record<string, unknown>)[]}
                keyExtractor={(row) =>
                  `${row.account_id}-${row.operation_date}-${row.ref_no ?? ''}-${row.amount}-${row.type}`
                }
                pageSize={15}
                emptyMessage="لا توجد حركات نقدية"
                columns={[
                  { key: 'operation_date', header: 'التاريخ', render: (row) => formatDate(row.operation_date) },
                  { key: 'account_name', header: 'الحساب' },
                  { key: 'ref_no', header: 'المرجع', render: (row) => row.ref_no ?? '—' },
                  { key: 'sub_type', header: 'النوع', render: (row) => row.sub_type ?? '—' },
                  {
                    key: 'signed_amount',
                    header: 'المبلغ',
                    className: 'tabular-nums',
                    render: (row) => formatMoney(row.signed_amount),
                  },
                  { key: 'note', header: 'ملاحظة', render: (row) => row.note ?? '—' },
                ]}
              />
            )}
          </AsyncState>
        )}
      </div>
    </div>
  )
}
