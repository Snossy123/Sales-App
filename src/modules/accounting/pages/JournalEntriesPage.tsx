import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { AccountingAccTransMapping, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { PageHeader } from '../../../components/PageHeader'
import { formatDate, formatMoney } from '../../../lib/accounting'
import { AccountingSubNav } from '../components/AccountingSubNav'

function sumLines(lines: AccountingAccTransMapping['lines'], type: 'debit' | 'credit'): number {
  return (lines ?? [])
    .filter((l) => l.type === type)
    .reduce((sum, l) => sum + Number(l.amount), 0)
}

export function JournalEntriesPage() {
  const query = useQuery({
    queryKey: ['accounting', 'journal-entries'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AccountingAccTransMapping>>(
        '/accounting/journal-entries',
        { params: { per_page: 50, include: 'lines.account' } },
      )
      return data.data
    },
  })

  return (
    <div>
      <PageHeader title="قيود اليومية" subtitle="سجل القيود المحاسبية اليدوية" />
      <AccountingSubNav />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<AccountingAccTransMapping & Record<string, unknown>>
          data={(query.data ?? []) as (AccountingAccTransMapping & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'ref_no', header: 'المرجع', render: (row) => row.ref_no ?? `#${row.id}` },
            {
              key: 'operation_date',
              header: 'التاريخ',
              render: (row) => formatDate(row.operation_date),
            },
            {
              key: 'debit',
              header: 'مدين',
              className: 'tabular-nums',
              render: (row) => formatMoney(sumLines(row.lines, 'debit')),
            },
            {
              key: 'credit',
              header: 'دائن',
              className: 'tabular-nums',
              render: (row) => formatMoney(sumLines(row.lines, 'credit')),
            },
            { key: 'note', header: 'ملاحظة', render: (row) => row.note ?? '—' },
            {
              key: 'lines',
              header: 'البنود',
              render: (row) => (
                <span className="text-xs text-on-surface-variant">
                  {(row.lines ?? [])
                    .map((l) => `${l.account?.name ?? l.accounting_account_id} (${l.type === 'debit' ? 'م' : 'د'})`)
                    .join(' · ') || '—'}
                </span>
              ),
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
