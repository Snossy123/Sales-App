import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { AccountingAccount, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import {
  buildAccountTree,
  primaryTypeLabels,
  type AccountTreeNode,
} from '../../../lib/accounting'
import { AccountingSubNav } from '../components/AccountingSubNav'

function AccountTreeRow({ node, depth = 0 }: { node: AccountTreeNode; depth?: number }) {
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
          </div>
        </td>
        <td className="px-sm py-sm tabular-nums text-on-surface-variant" dir="ltr">
          {node.gl_code ?? '—'}
        </td>
        <td className="px-sm py-sm text-on-surface-variant">
          {primaryTypeLabels[node.account_primary_type] ?? node.account_primary_type}
        </td>
        <td className="px-sm py-sm">
          <StatusBadge
            status={node.status}
            label={node.status === 'active' ? 'نشط' : 'غير نشط'}
          />
        </td>
      </tr>
      {open &&
        node.children.map((child) => (
          <AccountTreeRow key={child.id} node={child} depth={depth + 1} />
        ))}
    </>
  )
}

export function ChartOfAccountsPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  const query = useQuery({
    queryKey: ['accounting', 'chart-of-accounts', typeFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 200 }
      if (typeFilter) params['filter[account_primary_type]'] = typeFilter
      if (statusFilter) params['filter[status]'] = statusFilter
      const { data } = await api.get<PaginatedResponse<AccountingAccount>>(
        '/accounting/chart-of-accounts',
        { params },
      )
      return data.data
    },
  })

  const tree = useMemo(() => buildAccountTree(query.data ?? []), [query.data])

  return (
    <div>
      <PageHeader
        title="دليل الحسابات"
        subtitle="شجرة الحسابات حسب التصنيف والكود المحاسبي"
      />
      <AccountingSubNav />

      <div className="mb-md flex flex-wrap gap-sm">
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
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="px-sm py-sm text-right text-xs font-bold text-on-surface-variant">
                  الحساب
                </th>
                <th className="px-sm py-sm text-right text-xs font-bold text-on-surface-variant">
                  الكود
                </th>
                <th className="px-sm py-sm text-right text-xs font-bold text-on-surface-variant">
                  النوع
                </th>
                <th className="px-sm py-sm text-right text-xs font-bold text-on-surface-variant">
                  الحالة
                </th>
              </tr>
            </thead>
            <tbody>
              {tree.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-lg text-center text-on-surface-variant">
                    لا توجد حسابات — أنشئ الحسابات الافتراضية من الإعدادات
                  </td>
                </tr>
              ) : (
                tree.map((node) => <AccountTreeRow key={node.id} node={node} />)
              )}
            </tbody>
          </table>
        </div>
      </AsyncState>
    </div>
  )
}
