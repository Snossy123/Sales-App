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
    fromId: credit?.accounting_account_id,
    toId: debit?.accounting_account_id,
    from: credit?.account?.name ?? credit?.accounting_account_id,
    to: debit?.account?.name ?? debit?.accounting_account_id,
    amount: debit ? Number(debit.amount) : 0,
  }
}

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

type Panel = 'create' | 'edit' | null

export function TransfersPage() {
  const queryClient = useQueryClient()
  const [panel, setPanel] = useState<Panel>(null)
  const [selected, setSelected] = useState<AccountingAccTransMapping | null>(null)
  const [fromAccountId, setFromAccountId] = useState<number | ''>('')
  const [toAccountId, setToAccountId] = useState<number | ''>('')
  const [amount, setAmount] = useState('')
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['accounting', 'transfers', startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 50, include: 'lines.account' }
      if (startDate) params['filter[start_date]'] = startDate
      if (endDate) params['filter[end_date]'] = endDate
      const { data } = await api.get<PaginatedResponse<AccountingAccTransMapping>>('/accounting/transfers', {
        params,
      })
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
    enabled: panel !== null,
  })

  const closePanel = () => {
    setPanel(null)
    setSelected(null)
    setFromAccountId('')
    setToAccountId('')
    setAmount('')
    setNote('')
    setError('')
  }

  const openCreate = () => {
    closePanel()
    setOperationDate(new Date().toISOString().split('T')[0])
    setPanel('create')
  }

  const openEdit = (transfer: AccountingAccTransMapping) => {
    const { fromId, toId, amount: amt } = getTransferAccounts(transfer.lines)
    setSelected(transfer)
    setFromAccountId(fromId ?? '')
    setToAccountId(toId ?? '')
    setAmount(String(amt || ''))
    setOperationDate(transfer.operation_date?.split('T')[0] ?? new Date().toISOString().split('T')[0])
    setNote(transfer.note ?? '')
    setPanel('edit')
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

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('No transfer selected')
      const { data } = await api.put<AccountingAccTransMapping>(`/accounting/transfers/${selected.id}`, {
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
      setToast('تم تحديث التحويل')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/accounting/transfers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
      setToast('تم حذف التحويل')
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
            onClick={openCreate}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            تحويل جديد
          </button>
        }
      />

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

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
            {
              key: 'actions',
              header: 'إجراءات',
              render: (row) => (
                <div className="flex gap-xs">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="text-xs text-primary hover:underline"
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('حذف هذا التحويل؟')) deleteMutation.mutate(row.id)
                    }}
                    className="text-xs text-error hover:underline"
                  >
                    حذف
                  </button>
                </div>
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal
        open={panel === 'create' || panel === 'edit'}
        onClose={closePanel}
        title={panel === 'edit' ? 'تعديل تحويل' : 'تحويل بين الحسابات'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSubmit) return
            if (panel === 'edit') updateMutation.mutate()
            else createMutation.mutate()
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
              disabled={!canSubmit || createMutation.isPending || updateMutation.isPending}
              className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary disabled:opacity-60"
            >
              {panel === 'edit' ? 'حفظ' : 'إنشاء'}
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
