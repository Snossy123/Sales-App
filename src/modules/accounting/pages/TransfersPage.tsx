import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { AccountingAccTransMapping, AccountingAccount, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'
import { formatDate, formatMoney } from '../../../lib/accounting'

function getTransferAccounts(lines: AccountingAccTransMapping['lines']) {
  const debit = lines?.find((l) => l.type === 'debit')
  const credit = lines?.find((l) => l.type === 'credit')
  return {
    from: credit?.account?.name ?? credit?.accounting_account_id,
    to: debit?.account?.name ?? debit?.accounting_account_id,
    amount: debit ? Number(debit.amount) : 0,
  }
}

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function TransfersPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [fromAccountId, setFromAccountId] = useState<number | ''>('')
  const [toAccountId, setToAccountId] = useState<number | ''>('')
  const [amount, setAmount] = useState('')
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

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

  const accountsQuery = useQuery({
    queryKey: ['accounting', 'chart-of-accounts', 'active'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AccountingAccount>>(
        '/accounting/chart-of-accounts',
        { params: { per_page: 200, 'filter[status]': 'active' } },
      )
      return data.data
    },
    enabled: panelOpen,
  })

  const closePanel = () => {
    setPanelOpen(false)
    setFromAccountId('')
    setToAccountId('')
    setAmount('')
    setNote('')
    setError('')
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<AccountingAccTransMapping>('/accounting/transfers', {
        from_account_id: Number(fromAccountId),
        to_account_id: Number(toAccountId),
        amount: Number(amount),
        operation_date: operationDate,
        note: note || undefined,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
      closePanel()
      setToast('تم إنشاء التحويل')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const accounts = accountsQuery.data ?? []
  const canSubmit =
    fromAccountId &&
    toAccountId &&
    fromAccountId !== toAccountId &&
    Number(amount) > 0

  return (
    <div>
      <PageHeader
        title="التحويلات"
        subtitle="تحويلات بين الحسابات"
        actions={
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            تحويل جديد
          </button>
        }
      />

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<AccountingAccTransMapping & Record<string, unknown>>
          data={(query.data ?? []) as (AccountingAccTransMapping & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
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

      <Modal open={panelOpen} onClose={closePanel} title="تحويل بين الحسابات">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSubmit) return
            createMutation.mutate()
          }}
          className="grid gap-sm sm:grid-cols-2"
        >
          <select
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value ? Number(e.target.value) : '')}
            required
            className={`${inputClass} sm:col-span-2`}
          >
            <option value="">من حساب (مصدر)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.gl_code ? `${a.gl_code} — ` : ''}
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value ? Number(e.target.value) : '')}
            required
            className={`${inputClass} sm:col-span-2`}
          >
            <option value="">إلى حساب (وجهة)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.gl_code ? `${a.gl_code} — ` : ''}
                {a.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="المبلغ"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className={inputClass}
            dir="ltr"
          />
          <input
            type="date"
            value={operationDate}
            onChange={(e) => setOperationDate(e.target.value)}
            className={inputClass}
            dir="ltr"
            required
          />
          <input
            type="text"
            placeholder="ملاحظة"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${inputClass} sm:col-span-2`}
          />
          {error && <p className="text-sm text-error sm:col-span-2">{error}</p>}
          <div className="flex gap-sm sm:col-span-2">
            <button
              type="submit"
              disabled={!canSubmit || createMutation.isPending}
              className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary disabled:opacity-60"
            >
              إنشاء
            </button>
            <button type="button" onClick={closePanel} className="rounded-lg border px-md py-2 text-sm">
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
