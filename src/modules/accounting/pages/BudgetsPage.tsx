import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { AccountingBudget, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { PageHeader } from '../../../components/PageHeader'
import { formatMoney } from '../../../lib/accounting'
import { AccountingSubNav } from '../components/AccountingSubNav'

const monthLabels = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
] as const

const monthKeys = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const

export function BudgetsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))

  const query = useQuery({
    queryKey: ['accounting', 'budgets', year],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AccountingBudget>>('/accounting/budgets', {
        params: { per_page: 100, 'filter[financial_year]': year, include: 'account' },
      })
      return data.data
    },
  })

  return (
    <div>
      <PageHeader title="الميزانيات" subtitle="ميزانيات الحسابات حسب السنة المالية" />
      <AccountingSubNav />

      <div className="mb-md">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="rounded border border-outline-variant px-sm py-2 text-sm"
        >
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<AccountingBudget & Record<string, unknown>>
          data={(query.data ?? []) as (AccountingBudget & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            {
              key: 'account',
              header: 'الحساب',
              render: (row) => row.account?.name ?? row.accounting_account_id,
            },
            {
              key: 'yearly',
              header: 'السنوي',
              className: 'tabular-nums',
              render: (row) => formatMoney(row.yearly),
            },
            ...monthKeys.map((key, idx) => ({
              key,
              header: monthLabels[idx],
              className: 'tabular-nums',
              render: (row: AccountingBudget) => formatMoney(row[key]),
            })),
          ]}
        />
      </AsyncState>
    </div>
  )
}
