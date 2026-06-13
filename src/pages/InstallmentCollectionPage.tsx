import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Branch, InstallmentItem, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import {
  formatInvoiceDate,
  installmentStatusOptions,
  normalizeInstallmentItem,
} from '../lib/sales'
import { useAuthStore } from '../stores/authStore'

type InstallmentRow = InstallmentItem & Record<string, unknown>

interface BranchStats {
  branch: Branch
  count: number
  overdueCount: number
  totalRemaining: number
}

function BranchInstallmentCard({
  stats,
  selected,
  onSelect,
}: {
  stats: BranchStats
  selected: boolean
  onSelect: () => void
}) {
  const { branch, count, overdueCount, totalRemaining } = stats

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border p-md text-right transition-all ${
        selected
          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
          : 'border-outline-variant bg-surface-container-lowest hover:border-primary/40 hover:bg-surface-container-low'
      }`}
    >
      <div className="mb-sm flex items-start justify-between gap-sm">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-on-surface">
            {branch.name_ar || branch.name}
          </p>
          <p className="text-xs text-on-surface-variant">{branch.code}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            selected ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon name="store" size={20} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-xs text-center">
        <div className="rounded-lg bg-surface-container-low px-xs py-sm">
          <p className="tabular-nums text-lg font-bold text-on-surface">{count}</p>
          <p className="text-[11px] text-on-surface-variant">قسط مستحق</p>
        </div>
        <div className="rounded-lg bg-surface-container-low px-xs py-sm">
          <p className={`tabular-nums text-lg font-bold ${overdueCount > 0 ? 'text-error' : 'text-on-surface'}`}>
            {overdueCount}
          </p>
          <p className="text-[11px] text-on-surface-variant">متأخر</p>
        </div>
        <div className="rounded-lg bg-surface-container-low px-xs py-sm">
          <p className="tabular-nums text-sm font-bold text-on-surface">
            {totalRemaining.toLocaleString('ar-EG')}
          </p>
          <p className="text-[11px] text-on-surface-variant">متبقي ج.م</p>
        </div>
      </div>
    </button>
  )
}

export function InstallmentCollectionPage() {
  const queryClient = useQueryClient()
  const authBranchId = useAuthStore((s) => s.branchId)
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null)
  const [selected, setSelected] = useState<InstallmentRow | null>(null)
  const [amount, setAmount] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')

  const branchesQuery = useQuery({
    queryKey: ['branches', 'installments'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data
    },
  })

  const installmentsQuery = useQuery({
    queryKey: ['installments', 'by-branch', statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 500,
        include: 'salesInvoice.customer',
      }
      if (statusFilter) params['filter[status]'] = statusFilter

      const { data } = await api.get<{ data: InstallmentItem[] }>('/installments', { params })
      return data.data
        .map((item) => normalizeInstallmentItem(item))
        .filter((item) => item.status !== 'paid')
    },
  })

  const installmentsByBranch = useMemo(() => {
    const map = new Map<number, InstallmentRow[]>()
    for (const row of (installmentsQuery.data ?? []) as InstallmentRow[]) {
      const branchId = row.branch_id
      if (!branchId) continue
      const list = map.get(branchId) ?? []
      list.push(row)
      map.set(branchId, list)
    }
    return map
  }, [installmentsQuery.data])

  const branchStats = useMemo((): BranchStats[] => {
    const branches = branchesQuery.data ?? []
    return branches
      .map((branch) => {
        const rows = installmentsByBranch.get(branch.id) ?? []
        const overdueCount = rows.filter((r) => r.status === 'overdue').length
        const totalRemaining = rows.reduce(
          (sum, r) => sum + Number(r.remaining ?? Number(r.amount) - Number(r.paid_amount)),
          0,
        )
        return {
          branch,
          count: rows.length,
          overdueCount,
          totalRemaining,
        }
      })
      .filter((s) => s.count > 0 || branches.length <= 6)
      .sort((a, b) => b.count - a.count || b.overdueCount - a.overdueCount)
  }, [branchesQuery.data, installmentsByBranch])

  useEffect(() => {
    if (selectedBranchId != null) return
    if (authBranchId && branchStats.some((s) => s.branch.id === authBranchId)) {
      setSelectedBranchId(authBranchId)
      return
    }
    if (branchStats.length === 1) {
      setSelectedBranchId(branchStats[0].branch.id)
    }
  }, [authBranchId, branchStats, selectedBranchId])

  const branchRows = useMemo(() => {
    if (!selectedBranchId) return []
    return installmentsByBranch.get(selectedBranchId) ?? []
  }, [installmentsByBranch, selectedBranchId])

  const filteredRows = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return branchRows
    return branchRows.filter((row) => {
      const name = String(row.customer_name ?? '').toLowerCase()
      const invoice = String(row.invoice_number ?? '').toLowerCase()
      return name.includes(q) || invoice.includes(q)
    })
  }, [branchRows, customerSearch])

  const selectedBranch = branchStats.find((s) => s.branch.id === selectedBranchId)?.branch

  const collectMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.sales_invoice_id) throw new Error('فاتورة غير محددة')
      const { data } = await api.post(`/sales-invoices/${selected.sales_invoice_id}/installments/collect`, {
        installment_item_id: selected.id,
        amount,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setSelected(null)
      setAmount(0)
    },
  })

  const selectRow = (row: InstallmentRow) => {
    setSelected(row)
    setAmount(Number(row.remaining ?? Number(row.amount) - Number(row.paid_amount)))
  }

  const toggleBranch = (branchId: number) => {
    setSelectedBranchId((current) => (current === branchId ? null : branchId))
    setSelected(null)
    setAmount(0)
    setCustomerSearch('')
  }

  const hasFilters = Boolean(customerSearch)
  const clearFilters = () => {
    setCustomerSearch('')
  }

  return (
    <SalesPageShell
      title="تحصيل الأقساط"
      subtitle="اختر فرعاً لعرض الأقساط المستحقة والمتأخرة"
      filters={
        <FilterBar
          selects={[
            {
              id: 'status',
              label: 'الحالة',
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(value)
                setSelected(null)
              },
              options: installmentStatusOptions.map((o) => ({ value: o.value, label: o.label })),
            },
          ]}
          showClear={Boolean(statusFilter)}
          onClear={() => setStatusFilter('')}
        />
      }
    >
      <AsyncState
        isLoading={branchesQuery.isLoading || installmentsQuery.isLoading}
        isError={branchesQuery.isError || installmentsQuery.isError}
        error={branchesQuery.error ?? installmentsQuery.error}
      >
        {branchStats.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md text-center text-on-surface-variant">
            لا توجد أقساط مستحقة على أي فرع
          </p>
        ) : (
          <div className="mb-md grid grid-cols-1 gap-sm sm:grid-cols-2 xl:grid-cols-3">
            {branchStats.map((stats) => (
              <BranchInstallmentCard
                key={stats.branch.id}
                stats={stats}
                selected={selectedBranchId === stats.branch.id}
                onSelect={() => toggleBranch(stats.branch.id)}
              />
            ))}
          </div>
        )}

        {selectedBranchId && selectedBranch ? (
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
            <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
              <h2 className="text-lg font-semibold text-on-surface">
                أقساط فرع {selectedBranch.name_ar || selectedBranch.name}
              </h2>
              <span className="rounded-full bg-surface-container-high px-sm py-xs text-xs text-on-surface-variant">
                {filteredRows.length} قسط
              </span>
            </div>

            <FilterBar
              search={customerSearch}
              onSearchChange={setCustomerSearch}
              searchPlaceholder="بحث بالعميل أو رقم الفاتورة..."
              showClear={hasFilters}
              onClear={clearFilters}
            />

            <div className="grid gap-md lg:grid-cols-2">
              <DataTable<InstallmentRow>
                data={filteredRows}
                keyExtractor={(row) => row.id}
                emptyMessage="لا توجد أقساط مستحقة لهذا الفرع"
                columns={[
                  { key: 'invoice_number', header: 'فاتورة' },
                  { key: 'customer_name', header: 'العميل', render: (row) => row.customer_name ?? '—' },
                  {
                    key: 'installment_number',
                    header: 'قسط #',
                    render: (row) => row.installment_number ?? '—',
                  },
                  {
                    key: 'due_date',
                    header: 'الاستحقاق',
                    render: (row) => formatInvoiceDate(String(row.due_date)),
                  },
                  {
                    key: 'amount',
                    header: 'المبلغ',
                    render: (row) => Number(row.amount).toLocaleString('ar-EG'),
                  },
                  {
                    key: 'remaining',
                    header: 'متبقي',
                    render: (row) =>
                      Number(row.remaining ?? Number(row.amount) - Number(row.paid_amount)).toLocaleString('ar-EG'),
                  },
                  {
                    key: 'status',
                    header: 'الحالة',
                    render: (row) => <StatusBadge status={String(row.status)} />,
                  },
                  {
                    key: 'actions',
                    header: '',
                    render: (row) => (
                      <button
                        type="button"
                        onClick={() => selectRow(row)}
                        className="text-sm text-primary hover:underline"
                      >
                        تحصيل
                      </button>
                    ),
                  },
                ]}
              />

              {selected ? (
                <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
                  <h3 className="mb-md text-lg font-semibold">تحصيل قسط</h3>
                  <dl className="mb-md space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-on-surface-variant">العميل</dt>
                      <dd>{selected.customer_name as string}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-on-surface-variant">فاتورة</dt>
                      <dd>{selected.invoice_number as string}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-on-surface-variant">قسط رقم</dt>
                      <dd>{selected.installment_number as number}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-on-surface-variant">المتبقي</dt>
                      <dd className="font-bold tabular-nums">
                        {Number(
                          selected.remaining ?? Number(selected.amount) - Number(selected.paid_amount),
                        ).toLocaleString('ar-EG')}{' '}
                        ج.م
                      </dd>
                    </div>
                  </dl>

                  <div className="mb-md">
                    <label className="mb-xs block text-sm text-on-surface-variant">مبلغ التحصيل</label>
                    <input
                      type="number"
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
                    />
                  </div>

                  {collectMutation.isError && (
                    <p className="mb-sm text-sm text-error">{getErrorMessage(collectMutation.error)}</p>
                  )}
                  {collectMutation.isSuccess && (
                    <p className="mb-sm text-sm text-secondary">تم التحصيل بنجاح</p>
                  )}

                  <button
                    type="button"
                    onClick={() => collectMutation.mutate()}
                    disabled={collectMutation.isPending || amount <= 0}
                    className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-3 font-bold text-on-primary disabled:opacity-60"
                  >
                    <Icon name="payments" />
                    {collectMutation.isPending ? 'جاري التحصيل...' : 'تأكيد التحصيل'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-md text-sm text-on-surface-variant">
                  اختر قسطاً من الجدول لبدء التحصيل
                </div>
              )}
            </div>
          </section>
        ) : (
          branchStats.length > 0 && (
            <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-md text-center text-sm text-on-surface-variant">
              اضغط على كارت الفرع لعرض جدول الأقساط
            </p>
          )
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
