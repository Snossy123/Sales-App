import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { AdminUser, Branch, InstallmentItem, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { RefundPaymentModal, type RefundPaymentTarget } from '../components/payments/RefundPaymentModal'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'
import {
  formatInvoiceDate,
  installmentStatusOptions,
  normalizeInstallmentItem,
} from '../lib/sales'
import { useAuthStore } from '../stores/authStore'

type InstallmentRow = InstallmentItem & Record<string, unknown>

function tierRowClass(tier?: string): string {
  if (tier === 'overdue') return 'bg-red-50 hover:bg-red-100/80'
  if (tier === 'grace') return 'bg-orange-50 hover:bg-orange-100/80'
  return 'bg-white hover:bg-surface-container-low'
}

const paymentMethodOptions = [
  { value: 'cash', label: 'كاش' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'card', label: 'بطاقة' },
]

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
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [statusFilter, setStatusFilter] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showReconcile, setShowReconcile] = useState(false)
  const [responsibleUserId, setResponsibleUserId] = useState<number | ''>('')
  const [reconcileNotes, setReconcileNotes] = useState('')
  const [adjustNextDueDate, setAdjustNextDueDate] = useState(false)
  const [dueDateShiftDays, setDueDateShiftDays] = useState(0)
  const [refundTarget, setRefundTarget] = useState<RefundPaymentTarget | null>(null)

  interface PaymentRow {
    id: number
    transaction_number?: string
    amount: string | number
    refunded_amount?: string | number
    status: string
    paid_at?: string
  }

  const branchesQuery = useQuery({
    queryKey: ['branches', 'installments'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data
    },
  })

  const usersQuery = useQuery({
    queryKey: ['admin-users', 'reconcile'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminUser[] }>('/staff-options')
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

  const installmentPaymentsQuery = useQuery({
    queryKey: ['payment-transactions', 'installment', selected?.id],
    queryFn: async () => {
      const { data } = await api.get<{ data: PaymentRow[] }>('/payment-transactions', {
        params: { installment_item_id: selected!.id, per_page: 20, status: 'active' },
      })
      return (data as { data?: PaymentRow[] }).data ?? []
    },
    enabled: Boolean(selected?.id),
  })

  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await api.delete(`/installments/${itemId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      setSelected(null)
    },
  })

  const collectMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.sales_invoice_id) throw new Error('فاتورة غير محددة')
      const payload: Record<string, unknown> = {
        installment_item_id: selected.id,
        amount,
        payment_method: paymentMethod,
      }
      if (adjustNextDueDate && Number(selected.late_fee_accrued ?? 0) > 0) {
        payload.adjust_next_due_date = true
        if (dueDateShiftDays > 0) payload.due_date_shift_days = dueDateShiftDays
      }
      const { data } = await api.post(`/sales-invoices/${selected.sales_invoice_id}/installments/collect`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setSelected(null)
      setAmount(0)
      setAdjustNextDueDate(false)
      setDueDateShiftDays(0)
    },
  })

  const closeReconcileMutation = useMutation({
    mutationFn: async (reconciliationId: number) => {
      const { data } = await api.post(`/installments/reconciliations/${reconciliationId}/close`, {})
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      setSelected(null)
    },
  })

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('قسط غير محدد')
      const { data } = await api.post(`/installments/${selected.id}/reconcile`, {
        responsible_user_id: Number(responsibleUserId),
        notes: reconcileNotes.trim() || undefined,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      setShowReconcile(false)
      setResponsibleUserId('')
      setReconcileNotes('')
    },
  })

  const selectRow = (row: InstallmentRow) => {
    setSelected(row)
    setAmount(Number(row.total_due ?? row.remaining ?? Number(row.amount) - Number(row.paid_amount)))
    setShowReconcile(false)
    setAdjustNextDueDate(false)
    const dueDate = row.due_date ? new Date(String(row.due_date)) : null
    const daysLate = dueDate
      ? Math.max(1, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 1
    setDueDateShiftDays(daysLate)
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

            <div className="grid gap-md lg:grid-cols-[minmax(0,1fr)_min(22rem,38%)]">
              <div className="min-w-0">
              <DataTable<InstallmentRow>
                data={filteredRows}
                keyExtractor={(row) => row.id}
                pageSize={10}
                pageKey={`${selectedBranchId}-${customerSearch}-${statusFilter}`}
                emptyMessage="لا توجد أقساط مستحقة لهذا الفرع"
                rowClassName={(row) => tierRowClass(String(row.display_tier ?? row.status))}
                columns={[
                  { key: 'invoice_number', header: 'فاتورة' },
                  { key: 'customer_name', header: 'العميل', render: (row) => row.customer_name ?? '—' },
                  {
                    key: 'phones',
                    header: 'للتواصل',
                    render: (row) => (
                      <div className="flex flex-col gap-0.5 text-xs" dir="ltr">
                        {(row.customer_phones ?? [row.customer_phone]).filter(Boolean).map((phone) => (
                          <a key={String(phone)} href={`tel:${phone}`} className="text-primary hover:underline">
                            {phone}
                          </a>
                        ))}
                      </div>
                    ),
                  },
                  {
                    key: 'installment_number',
                    header: 'قسط #',
                    render: (row) => row.installment_number ?? '—',
                  },
                  {
                    key: 'remaining_installments',
                    header: 'الأقساط المتبقية',
                    render: (row) => row.remaining_installments ?? '—',
                  },
                  {
                    key: 'amount',
                    header: 'مبلغ القسط',
                    render: (row) => Number(row.amount).toLocaleString('ar-EG'),
                  },
                  {
                    key: 'due_date',
                    header: 'الاستحقاق',
                    render: (row) => formatInvoiceDate(String(row.due_date)),
                  },
                  {
                    key: 'reconciliation',
                    header: 'تصالح',
                    render: (row) =>
                      row.has_open_reconciliation ? (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
                          مفتوح
                        </span>
                      ) : (
                        '—'
                      ),
                  },
                  {
                    key: 'status',
                    header: 'الحالة',
                    render: (row) => (
                      <StatusBadge status={String(row.display_tier ?? row.status)} />
                    ),
                  },
                  {
                    key: 'actions',
                    header: '',
                    render: (row) => (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => selectRow(row)}
                          className="text-sm text-primary hover:underline"
                        >
                          تحصيل
                        </button>
                        {row.display_tier === 'overdue' && (
                          <button
                            type="button"
                            onClick={() => {
                              selectRow(row)
                              setShowReconcile(true)
                            }}
                            className="text-xs text-on-surface-variant hover:underline"
                          >
                            تصالح
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('نقل القسط إلى سلة المهملات؟')) {
                              deleteMutation.mutate(row.id as number)
                            }
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
              </div>

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
                      <dt className="text-on-surface-variant">غرامة التأخير</dt>
                      <dd className="tabular-nums text-error">
                        {Number(selected.late_fee_accrued ?? 0).toLocaleString('ar-EG')} ج.م
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-on-surface-variant">الإجمالي المستحق</dt>
                      <dd className="font-bold tabular-nums">
                        {Number(
                          selected.total_due ??
                            selected.remaining ??
                            Number(selected.amount) - Number(selected.paid_amount),
                        ).toLocaleString('ar-EG')}{' '}
                        ج.م
                      </dd>
                    </div>
                  </dl>

                  <div className="mb-md">
                    <label className="mb-xs block text-sm text-on-surface-variant">طريقة التحصيل</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mb-sm w-full rounded border border-outline-variant px-sm py-2"
                    >
                      {paymentMethodOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <label className="mb-xs block text-sm text-on-surface-variant">مبلغ التحصيل</label>
                    <input
                      type="number"
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
                    />
                    {Number(selected.late_fee_accrued ?? 0) > 0 && (
                      <div className="mt-sm space-y-sm rounded-lg border border-outline-variant bg-surface-container-high p-sm">
                        <label className="flex items-center gap-xs text-sm">
                          <input
                            type="checkbox"
                            checked={adjustNextDueDate}
                            onChange={(e) => setAdjustNextDueDate(e.target.checked)}
                          />
                          تأجيل تاريخ استحقاق القسط التالي
                        </label>
                        {adjustNextDueDate && (
                          <div>
                            <label className="mb-xs block text-xs text-on-surface-variant">
                              عدد أيام التأجيل
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={dueDateShiftDays}
                              onChange={(e) => setDueDateShiftDays(Number(e.target.value))}
                              className="w-full rounded border border-outline-variant px-sm py-2 text-sm tabular-nums"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selected.has_open_reconciliation && (
                    <p className="mb-sm rounded-lg bg-orange-50 px-sm py-2 text-sm text-orange-800">
                      يوجد تصالح مفتوح — يجب إغلاقه قبل التحصيل
                    </p>
                  )}

                  {collectMutation.isError && (
                    <p className="mb-sm text-sm text-error">{getErrorMessage(collectMutation.error)}</p>
                  )}
                  {collectMutation.isSuccess && (
                    <p className="mb-sm text-sm text-secondary">تم التحصيل بنجاح</p>
                  )}

                  {(installmentPaymentsQuery.data ?? []).length > 0 && (
                    <div className="mb-md rounded-lg border border-outline-variant bg-surface-container-high p-sm">
                      <h4 className="mb-sm text-sm font-semibold">آخر مدفوعات هذا القسط</h4>
                      <ul className="space-y-1 text-sm">
                        {(installmentPaymentsQuery.data ?? []).map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-2">
                            <span className="tabular-nums">
                              {Number(p.amount).toLocaleString('ar-EG')} ج.م
                              {p.paid_at ? ` — ${new Date(p.paid_at).toLocaleDateString('ar-EG')}` : ''}
                            </span>
                            {p.status === 'active' && Number(p.amount) > 0 && (
                              <button
                                type="button"
                                onClick={() => setRefundTarget(p)}
                                className="text-xs text-primary hover:underline"
                              >
                                استرداد
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => collectMutation.mutate()}
                    disabled={
                      collectMutation.isPending ||
                      amount <= 0 ||
                      Boolean(selected.has_open_reconciliation)
                    }
                    className="mb-sm flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-3 font-bold text-on-primary disabled:opacity-60"
                  >
                    <Icon name="payments" />
                    {collectMutation.isPending ? 'جاري التحصيل...' : 'تأكيد التحصيل'}
                  </button>

                  {selected.has_open_reconciliation && selected.open_reconciliation_id && (
                    <button
                      type="button"
                      onClick={() => closeReconcileMutation.mutate(selected.open_reconciliation_id!)}
                      disabled={closeReconcileMutation.isPending}
                      className="mb-sm w-full rounded-lg border border-secondary py-2 text-sm font-bold text-secondary"
                    >
                      {closeReconcileMutation.isPending ? 'جاري الإغلاق...' : 'إغلاق التصالح وإعفاء الغرامة'}
                    </button>
                  )}

                  {showReconcile && selected.display_tier === 'overdue' && !selected.has_open_reconciliation && (
                    <div className="mt-md rounded-lg border border-outline-variant bg-surface-container-high p-sm">
                      <h4 className="mb-sm font-semibold">تصالح — تسجيل حالة مفتوحة</h4>
                      <label className="mb-xs block text-xs text-on-surface-variant">
                        المسؤول الذي تحدث معه العميل *
                      </label>
                      <select
                        value={responsibleUserId}
                        onChange={(e) =>
                          setResponsibleUserId(e.target.value ? Number(e.target.value) : '')
                        }
                        className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
                      >
                        <option value="">اختر الموظف</option>
                        {(usersQuery.data ?? []).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={reconcileNotes}
                        onChange={(e) => setReconcileNotes(e.target.value)}
                        placeholder="ملاحظات التصالح..."
                        rows={2}
                        className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
                      />
                      {reconcileMutation.isError && (
                        <p className="mb-sm text-xs text-error">
                          {getErrorMessage(reconcileMutation.error)}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => reconcileMutation.mutate()}
                        disabled={reconcileMutation.isPending || !responsibleUserId}
                        className="w-full rounded-lg border border-primary py-2 text-sm font-bold text-primary"
                      >
                        {reconcileMutation.isPending ? 'جاري التسجيل...' : 'تسجيل التصالح'}
                      </button>
                    </div>
                  )}
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

      <RefundPaymentModal
        payment={refundTarget}
        open={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        invalidateKeys={[['payment-transactions'], ['installments']]}
        onSuccess={() => installmentPaymentsQuery.refetch()}
      />
    </SalesPageShell>
  )
}
