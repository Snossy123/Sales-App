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
import { AccountingSubNav } from '../components/AccountingSubNav'
import {
  JournalLineEditor,
  emptyJournalLine,
  isJournalBalanced,
  type JournalLineForm,
} from '../components/JournalLineEditor'

function sumLines(lines: AccountingAccTransMapping['lines'], type: 'debit' | 'credit'): number {
  return (lines ?? [])
    .filter((l) => l.type === type)
    .reduce((sum, l) => sum + Number(l.amount), 0)
}

function linesToForm(lines: AccountingAccTransMapping['lines']): JournalLineForm[] {
  return (lines ?? []).map((l) => ({
    accounting_account_id: l.accounting_account_id,
    amount: String(l.amount),
    type: l.type,
    note: l.note ?? '',
  }))
}

type Panel = 'create' | 'edit' | 'view' | null

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function JournalEntriesPage() {
  const queryClient = useQueryClient()
  const [panel, setPanel] = useState<Panel>(null)
  const [selected, setSelected] = useState<AccountingAccTransMapping | null>(null)
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<JournalLineForm[]>([emptyJournalLine(), emptyJournalLine()])
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

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

  const accountsQuery = useQuery({
    queryKey: ['accounting', 'chart-of-accounts', 'active'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AccountingAccount>>(
        '/accounting/chart-of-accounts',
        { params: { per_page: 200, 'filter[status]': 'active' } },
      )
      return data.data
    },
    enabled: panel === 'create' || panel === 'edit',
  })

  const closePanel = () => {
    setPanel(null)
    setSelected(null)
    setOperationDate(new Date().toISOString().split('T')[0])
    setNote('')
    setLines([emptyJournalLine(), emptyJournalLine()])
    setError('')
  }

  const openCreate = () => {
    closePanel()
    setPanel('create')
  }

  const openEdit = (entry: AccountingAccTransMapping) => {
    setSelected(entry)
    setOperationDate(entry.operation_date?.split('T')[0] ?? '')
    setNote(entry.note ?? '')
    setLines(linesToForm(entry.lines))
    setPanel('edit')
  }

  const openView = (entry: AccountingAccTransMapping) => {
    setSelected(entry)
    setPanel('view')
  }

  const buildPayload = () => ({
    operation_date: operationDate,
    note: note || undefined,
    lines: lines.map((l) => ({
      accounting_account_id: Number(l.accounting_account_id),
      amount: Number(l.amount),
      type: l.type,
      note: l.note || undefined,
    })),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<AccountingAccTransMapping>(
        '/accounting/journal-entries',
        buildPayload(),
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
      closePanel()
      setToast('تم إنشاء القيد')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<AccountingAccTransMapping>(
        `/accounting/journal-entries/${selected!.id}`,
        buildPayload(),
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
      closePanel()
      setToast('تم تحديث القيد')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/accounting/journal-entries/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
      closePanel()
      setToast('تم حذف القيد')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const accounts = accountsQuery.data ?? []
  const canSubmit = isJournalBalanced(lines) && lines.every((l) => l.accounting_account_id)

  return (
    <div>
      <PageHeader
        title="قيود اليومية"
        subtitle="سجل القيود المحاسبية اليدوية"
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            قيد جديد
          </button>
        }
      />
      <AccountingSubNav />

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

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
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="flex gap-xs">
                  <button
                    type="button"
                    onClick={() => openView(row as AccountingAccTransMapping)}
                    className="text-xs text-on-surface-variant hover:underline"
                  >
                    عرض
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(row as AccountingAccTransMapping)}
                    className="text-xs text-primary hover:underline"
                  >
                    تعديل
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
        title={panel === 'edit' ? 'تعديل قيد' : 'قيد جديد'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!canSubmit) return
            if (panel === 'edit') updateMutation.mutate()
            else createMutation.mutate()
          }}
          className="space-y-md"
        >
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
            className={inputClass}
          />
          <JournalLineEditor lines={lines} accounts={accounts} onChange={setLines} />
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex gap-sm">
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

      <Modal open={panel === 'view'} onClose={closePanel} title={`قيد ${selected?.ref_no ?? ''}`}>
        {selected && (
          <div className="space-y-sm">
            <p className="text-sm text-on-surface-variant">
              {formatDate(selected.operation_date)} · {selected.note ?? '—'}
            </p>
            <ul className="space-y-xs text-sm">
              {(selected.lines ?? []).map((line) => (
                <li key={line.id} className="flex justify-between gap-sm border-b border-outline-variant/40 py-xs">
                  <span>
                    {line.account?.name ?? line.accounting_account_id} ({line.type === 'debit' ? 'مدين' : 'دائن'})
                  </span>
                  <span className="tabular-nums">{formatMoney(line.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-sm pt-sm">
              <button
                type="button"
                onClick={() => openEdit(selected)}
                className="rounded-lg bg-primary px-md py-2 text-sm text-on-primary"
              >
                تعديل
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('حذف هذا القيد؟')) deleteMutation.mutate(selected.id)
                }}
                className="rounded-lg border border-error px-md py-2 text-sm text-error"
              >
                حذف
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
