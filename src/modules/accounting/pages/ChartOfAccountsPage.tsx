import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, getErrorMessage } from '../../../api/client'
import type { AccountingAccount, Branch, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'
import {
  buildAccountTree,
  formatMoney,
  primaryTypeLabels,
  type AccountTreeNode,
} from '../../../lib/accounting'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const emptyForm = {
  name: '',
  gl_code: '',
  account_primary_type: 'asset' as AccountingAccount['account_primary_type'],
  parent_account_id: '' as number | '',
  branch_id: '' as number | '',
  description: '',
  status: 'active' as 'active' | 'inactive',
}

function AccountTreeRow({
  node,
  depth = 0,
  onEdit,
  onToggle,
}: {
  node: AccountTreeNode
  depth?: number
  onEdit: (account: AccountTreeNode) => void
  onToggle: (account: AccountTreeNode) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <>
      <tr className="border-b border-outline-variant/60 last:border-0">
        <td className="px-sm py-sm text-on-surface" style={{ paddingRight: `${depth * 1.25 + 0.5}rem` }}>
          <div className="flex items-center gap-xs">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="rounded p-0.5 text-on-surface-variant hover:bg-surface-container-low"
                aria-label={open ? 'طي' : 'توسيع'}
              >
                {open ? '▾' : '▸'}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <span className="font-medium">{node.name}</span>
            {node.branch?.name && (
              <span className="text-xs text-on-surface-variant">({node.branch.name})</span>
            )}
          </div>
        </td>
        <td className="px-sm py-sm tabular-nums text-on-surface-variant" dir="ltr">
          {node.gl_code ?? '—'}
        </td>
        <td className="px-sm py-sm text-on-surface-variant">
          {primaryTypeLabels[node.account_primary_type] ?? node.account_primary_type}
        </td>
        <td className="px-sm py-sm tabular-nums text-on-surface" dir="ltr">
          {formatMoney(node.balance)}
        </td>
        <td className="px-sm py-sm">
          <StatusBadge
            status={node.status}
            label={node.status === 'active' ? 'نشط' : 'غير نشط'}
          />
        </td>
        <td className="px-sm py-sm">
          <div className="flex flex-wrap gap-xs">
            <Link
              to={`/accounting/chart-of-accounts/${node.id}/ledger`}
              className="text-xs text-primary hover:underline"
            >
              دفتر
            </Link>
            <button type="button" onClick={() => onEdit(node)} className="text-xs text-on-surface-variant hover:underline">
              تعديل
            </button>
            <button type="button" onClick={() => onToggle(node)} className="text-xs text-on-surface-variant hover:underline">
              {node.status === 'active' ? 'تعطيل' : 'تفعيل'}
            </button>
          </div>
        </td>
      </tr>
      {open &&
        node.children.map((child) => (
          <AccountTreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            onEdit={onEdit}
            onToggle={onToggle}
          />
        ))}
    </>
  )
}

type Panel = 'create' | 'edit' | null

export function ChartOfAccountsPage() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [branchFilter, setBranchFilter] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const branchesQuery = useQuery({
    queryKey: ['branches', 'list'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params: { per_page: 100 } })
      return data.data
    },
  })

  const query = useQuery({
    queryKey: ['accounting', 'chart-of-accounts', typeFilter, statusFilter, branchFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 200, with_balances: 1 }
      if (typeFilter) params['filter[account_primary_type]'] = typeFilter
      if (statusFilter) params['filter[status]'] = statusFilter
      if (branchFilter) params['filter[branch_id]'] = branchFilter
      const { data } = await api.get<PaginatedResponse<AccountingAccount>>(
        '/accounting/chart-of-accounts',
        { params },
      )
      return data.data
    },
  })

  const tree = useMemo(() => buildAccountTree(query.data ?? []), [query.data])

  const closePanel = () => {
    setPanel(null)
    setEditId(null)
    setForm(emptyForm)
    setError('')
  }

  const openCreate = () => {
    closePanel()
    setPanel('create')
  }

  const openEdit = (account: AccountTreeNode) => {
    setEditId(account.id)
    setForm({
      name: account.name,
      gl_code: account.gl_code ?? '',
      account_primary_type: account.account_primary_type,
      parent_account_id: account.parent_account_id ?? '',
      branch_id: account.branch_id ?? '',
      description: account.description ?? '',
      status: account.status,
    })
    setPanel('edit')
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        gl_code: form.gl_code || undefined,
        account_primary_type: form.account_primary_type,
        parent_account_id: form.parent_account_id ? Number(form.parent_account_id) : undefined,
        branch_id: form.branch_id ? Number(form.branch_id) : undefined,
        description: form.description || undefined,
        status: form.status,
      }
      if (panel === 'edit' && editId) {
        const { data } = await api.put<AccountingAccount>(`/accounting/chart-of-accounts/${editId}`, payload)
        return data
      }
      const { data } = await api.post<AccountingAccount>('/accounting/chart-of-accounts', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
      closePanel()
      setToast(panel === 'edit' ? 'تم تحديث الحساب' : 'تم إنشاء الحساب')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const { data } = await api.patch<AccountingAccount>(
        `/accounting/chart-of-accounts/${accountId}/toggle-status`,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
      setToast('تم تحديث حالة الحساب')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const seedBranchesMutation = useMutation({
    mutationFn: async () => {
      await api.post('/accounting/chart-of-accounts/seed-all-branches')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
      setToast('تم إنشاء حسابات الفروع')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  return (
    <div>
      <PageHeader
        title="دليل الحسابات"
        subtitle="شجرة الحسابات حسب التصنيف والكود المحاسبي"
        actions={
          <div className="flex flex-wrap gap-xs">
            <button
              type="button"
              onClick={() => seedBranchesMutation.mutate()}
              disabled={seedBranchesMutation.isPending}
              className="rounded-lg border border-outline-variant px-md py-sm text-sm font-medium hover:bg-surface-container-low disabled:opacity-60"
            >
              إنشاء حسابات الفروع
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
            >
              <Icon name="add" size={18} />
              حساب جديد
            </button>
          </div>
        }
      />

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <div className="mb-md flex flex-wrap gap-sm">
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="rounded border border-outline-variant px-sm py-2 text-sm"
        >
          <option value="">كل الفروع</option>
          {(branchesQuery.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-outline-variant px-sm py-2 text-sm"
        >
          <option value="">كل الأنواع</option>
          {Object.entries(primaryTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-outline-variant px-sm py-2 text-sm"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="px-sm py-sm text-right text-xs font-bold text-on-surface-variant">الحساب</th>
                <th className="px-sm py-sm text-right text-xs font-bold text-on-surface-variant">الكود</th>
                <th className="px-sm py-sm text-right text-xs font-bold text-on-surface-variant">النوع</th>
                <th className="px-sm py-sm text-right text-xs font-bold text-on-surface-variant">الرصيد</th>
                <th className="px-sm py-sm text-right text-xs font-bold text-on-surface-variant">الحالة</th>
                <th className="px-sm py-sm text-right text-xs font-bold text-on-surface-variant">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {tree.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-lg text-center text-on-surface-variant">
                    لا توجد حسابات — أنشئ الحسابات الافتراضية من الإعدادات
                  </td>
                </tr>
              ) : (
                tree.map((node) => (
                  <AccountTreeRow
                    key={node.id}
                    node={node}
                    onEdit={openEdit}
                    onToggle={(a) => toggleMutation.mutate(a.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </AsyncState>

      <Modal
        open={panel === 'create' || panel === 'edit'}
        onClose={closePanel}
        title={panel === 'edit' ? 'تعديل حساب' : 'حساب جديد'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="grid gap-sm sm:grid-cols-2"
        >
          <input
            type="text"
            placeholder="اسم الحساب"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className={`${inputClass} sm:col-span-2`}
          />
          <input
            type="text"
            placeholder="كود GL"
            value={form.gl_code}
            onChange={(e) => setForm({ ...form, gl_code: e.target.value })}
            className={inputClass}
            dir="ltr"
          />
          <select
            value={form.account_primary_type}
            onChange={(e) =>
              setForm({
                ...form,
                account_primary_type: e.target.value as AccountingAccount['account_primary_type'],
              })
            }
            className={inputClass}
          >
            {Object.entries(primaryTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={form.branch_id}
            onChange={(e) =>
              setForm({ ...form, branch_id: e.target.value ? Number(e.target.value) : '' })
            }
            className={inputClass}
          >
            <option value="">بدون فرع</option>
            {(branchesQuery.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={form.parent_account_id}
            onChange={(e) =>
              setForm({ ...form, parent_account_id: e.target.value ? Number(e.target.value) : '' })
            }
            className={`${inputClass} sm:col-span-2`}
          >
            <option value="">بدون حساب أب</option>
            {(query.data ?? [])
              .filter((a) => a.id !== editId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.gl_code ? `${a.gl_code} — ` : ''}
                  {a.name}
                </option>
              ))}
          </select>
          <textarea
            placeholder="الوصف"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`${inputClass} sm:col-span-2`}
            rows={2}
          />
          {error && <p className="text-sm text-error sm:col-span-2">{error}</p>}
          <div className="flex gap-sm sm:col-span-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary"
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
