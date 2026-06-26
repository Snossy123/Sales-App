import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { AccountingAccount, AccountingBudget, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'
import { EntityRowActions } from '../../../components/crud/EntityRowActions'
import { getEntityCrudConfig } from '../../../lib/crud/entityCrudRegistry'
import { formatMoney } from '../../../lib/accounting'

const monthLabels = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
] as const

const monthKeys = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const

type MonthKey = (typeof monthKeys)[number]

const emptyMonths = (): Record<MonthKey, string> =>
  Object.fromEntries(monthKeys.map((k) => [k, ''])) as Record<MonthKey, string>

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function BudgetsPage() {
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [panelOpen, setPanelOpen] = useState(false)
  const [editBudget, setEditBudget] = useState<AccountingBudget | null>(null)
  const [accountId, setAccountId] = useState<number | ''>('')
  const [months, setMonths] = useState(emptyMonths())
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const crudConfig = getEntityCrudConfig('budgets')

  const query = useQuery({
    queryKey: ['accounting', 'budgets', year],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AccountingBudget>>('/accounting/budgets', {
        params: { per_page: 100, 'filter[financial_year]': year, include: 'account' },
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
    enabled: panelOpen,
  })

  const closePanel = () => {
    setPanelOpen(false)
    setEditBudget(null)
    setAccountId('')
    setMonths(emptyMonths())
    setError('')
  }

  const openCreate = () => {
    closePanel()
    setPanelOpen(true)
  }

  const openEdit = (budget: AccountingBudget) => {
    setEditBudget(budget)
    setAccountId(budget.accounting_account_id)
    setMonths(
      Object.fromEntries(monthKeys.map((k) => [k, String(budget[k] ?? '')])) as Record<MonthKey, string>,
    )
    setPanelOpen(true)
  }

  const buildPayload = () => {
    const payload: Record<string, number | string> = {
      accounting_account_id: Number(accountId),
      financial_year: Number(year),
    }
    for (const key of monthKeys) {
      payload[key] = months[key] ? Number(months[key]) : 0
    }
    return payload
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload()
      if (editBudget) {
        const { data } = await api.put<AccountingBudget>(`/accounting/budgets/${editBudget.id}`, payload)
        return data
      }
      const { data } = await api.post<AccountingBudget>('/accounting/budgets', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'budgets'] })
      closePanel()
      setToast(editBudget ? 'تم تحديث الميزانية' : 'تم إنشاء الميزانية')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  return (
    <div>
      <PageHeader
        title="الميزانيات"
        subtitle="ميزانيات الحسابات حسب السنة المالية"
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            ميزانية جديدة
          </button>
        }
      />

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

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
          pageSize={10}
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
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <EntityRowActions
                  row={row as AccountingBudget}
                  config={crudConfig}
                  queryKeys={[['accounting', 'budgets']]}
                  onEdit={openEdit}
                  showView={false}
                />
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal
        open={panelOpen}
        onClose={closePanel}
        title={editBudget ? 'تعديل الميزانية' : 'ميزانية جديدة'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!accountId) return
            saveMutation.mutate()
          }}
          className="space-y-sm"
        >
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}
            required
            disabled={Boolean(editBudget)}
            className={inputClass}
          >
            <option value="">اختر الحساب</option>
            {(accountsQuery.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.gl_code ? `${a.gl_code} — ` : ''}
                {a.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-sm sm:grid-cols-3">
            {monthKeys.map((key, idx) => (
              <label key={key} className="text-xs">
                <span className="mb-0.5 block text-on-surface-variant">{monthLabels[idx]}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={months[key]}
                  onChange={(e) => setMonths({ ...months, [key]: e.target.value })}
                  className={inputClass}
                  dir="ltr"
                />
              </label>
            ))}
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex gap-sm">
            <button
              type="submit"
              disabled={!accountId || saveMutation.isPending}
              className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary disabled:opacity-60"
            >
              حفظ
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
