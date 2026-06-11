import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { AccountingAccTransMapping, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { PageHeader } from '../../../components/PageHeader'
import { formatDate, formatMoney } from '../../../lib/accounting'
import { AccountingSubNav } from '../components/AccountingSubNav'

function getTransferAccounts(lines: AccountingAccTransMapping['lines']) {
  const debit = lines?.find((l) => l.type === 'debit')
  const credit = lines?.find((l) => l.type === 'credit')
  return {
    from: credit?.account?.name ?? credit?.accounting_account_id,
    to: debit?.account?.name ?? debit?.accounting_account_id,
    amount: debit ? Number(debit.amount) : 0,
  }
}

export function TransfersPage() {
  const query = useQuery({
    queryKey: ['accounting', 'transfers'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AccountingAccTransMapping>>(
        '/accounting/transfers',
        { params: { per_page: 50, include: 'lines.account' } },
      )
      return data.data
    },
  })

  return (
    <div>
      <PageHeader title="التحويلات" subtitle="تحويلات بين الحسابات" />
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
              key: 'from',
              header: 'من',
              render: (row) => String(getTransferAccounts(row.lines).from ?? '—'),
            },
            {
              key: 'to',
              header: 'إلى',
              render: (row) => String(getTransferAccounts(row.lines).to ?? '—'),
            },
            {
              key: 'amount',
              header: 'المبلغ',
              className: 'tabular-nums',
              render: (row) => formatMoney(getTransferAccounts(row.lines).amount),
            },
            { key: 'note', header: 'ملاحظة', render: (row) => row.note ?? '—' },
          ]}
        />
      </AsyncState>
    </div>
  )
}
