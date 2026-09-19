import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type {
  CollectorOption,
  CollectionWorkloadRow,
  InstallmentItem,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { FilterBar } from '../../../components/FilterBar'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { StatusBadge } from '../../../components/StatusBadge'
import { formatDate } from '../../../lib/accounting'
import {
  collectionStatusLabels,
  firstDueStatus,
  firstDueStatusLabels,
  firstDueStatusOptions,
  getCurrentInstallment,
  type FirstDueStatus,
  type InstallmentCollectionRow,
} from '../../../lib/collectionHelpers'
import { normalizeInstallmentItem } from '../../../lib/sales'

interface AssignmentContract {
  invoiceId: number
  invoiceNumber: string
  customerName: string
  customerId?: number
  branchId?: number
  collectionStatus?: string | null
  collectorUserId?: number | null
  collectorName?: string | null
  remaining: number
  firstDueDate?: string
  firstDueStatus?: FirstDueStatus
}

const dueStatusBadgeStatus: Record<FirstDueStatus, string> = {
  upcoming: 'upcoming',
  due: 'due_soon',
  overdue: 'overdue',
}

export function CollectionAssignmentsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [collectorFilter, setCollectorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dueStatusFilter, setDueStatusFilter] = useState('')
  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [bulkCollectorId, setBulkCollectorId] = useState<number | ''>('')
  const [error, setError] = useState('')

  const collectorsQuery = useQuery({
    queryKey: ['collectors'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectorOption[] }>('/collectors')
      return data.data
    },
  })

  const workloadQuery = useQuery({
    queryKey: ['collection-assignments', 'workload'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectionWorkloadRow[]; unassigned_count: number }>(
        '/collection-assignments/workload',
      )
      return data
    },
  })

  const installmentsQuery = useQuery({
    queryKey: ['installments', 'assignments', collectorFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 500,
        include: 'salesInvoice.customer',
      }
      if (collectorFilter) params['filter[collector_user_id]'] = collectorFilter
      const { data } = await api.get<{ data: InstallmentItem[] }>('/installments', { params })
      return data.data.map((item) => normalizeInstallmentItem(item))
    },
  })

  const contracts = useMemo((): AssignmentContract[] => {
    const rowsByInvoice = new Map<number, InstallmentItem[]>()
    for (const row of installmentsQuery.data ?? []) {
      if (row.status === 'paid') continue
      const invoiceId = Number(row.sales_invoice_id ?? 0)
      if (!invoiceId) continue
      const list = rowsByInvoice.get(invoiceId) ?? []
      list.push(row)
      rowsByInvoice.set(invoiceId, list)
    }

    const built: AssignmentContract[] = []
    for (const [invoiceId, rows] of rowsByInvoice) {
      const remaining = rows.reduce((sum, row) => sum + Number(row.remaining ?? 0), 0)
      const current = getCurrentInstallment(rows as InstallmentCollectionRow[])
      const sample = current ?? rows[0]
      built.push({
        invoiceId,
        invoiceNumber: String(sample?.invoice_number ?? `#${invoiceId}`),
        customerName: String(sample?.customer_name ?? '—'),
        customerId: sample?.customer_id,
        branchId: sample?.branch_id,
        collectionStatus: sample?.collection_status,
        collectorUserId: sample?.collector_user_id ?? null,
        collectorName: sample?.collector_name ?? null,
        remaining,
        firstDueDate: current?.due_date,
        firstDueStatus: current ? firstDueStatus(current) : undefined,
      })
    }

    const q = search.trim().toLowerCase()
    return built.filter((contract) => {
      if (q) {
        const matchesSearch =
          contract.customerName.toLowerCase().includes(q) ||
          contract.invoiceNumber.toLowerCase().includes(q)
        if (!matchesSearch) return false
      }

      const due = contract.firstDueDate?.slice(0, 10) ?? ''
      if (dateFrom && (!due || due < dateFrom)) return false
      if (dateTo && (!due || due > dateTo)) return false
      if (dueStatusFilter && contract.firstDueStatus !== dueStatusFilter) return false
      return true
    })
  }, [installmentsQuery.data, search, dateFrom, dateTo, dueStatusFilter])

  const selectedIds = Object.entries(selected)
    .filter(([, checked]) => checked)
    .map(([id]) => Number(id))

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['installments'] })
    queryClient.invalidateQueries({ queryKey: ['collection-assignments'] })
  }

  const assignMutation = useMutation({
    mutationFn: async ({
      invoiceIds,
      collectorUserId,
    }: {
      invoiceIds: number[]
      collectorUserId: number | null
    }) => {
      const { data } = await api.post('/collection-assignments', {
        sales_invoice_ids: invoiceIds,
        collector_user_id: collectorUserId,
      })
      return data
    },
    onSuccess: () => {
      setError('')
      setSelected({})
      setBulkCollectorId('')
      invalidate()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const collectors = collectorsQuery.data ?? []
  const collectorOptions = [
    { value: '', label: 'كل المحصلين' },
    { value: 'unassigned', label: 'غير معيَّن' },
    ...collectors.map((collector) => ({ value: String(collector.id), label: collector.name })),
  ]

  const allChecked = contracts.length > 0 && contracts.every((contract) => selected[contract.invoiceId])

  return (
    <SalesPageShell
      title="توزيع عقود التحصيل"
      subtitle="وزّع العقود على المحصلين أو انقل عقداً من موظف لآخر"
      actions={
        <Link
          to="/installments"
          className="rounded-lg border border-outline-variant px-md py-2 text-sm font-medium text-on-surface hover:border-primary/40"
        >
          شاشة التحصيل
        </Link>
      }
      filters={
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث بالعميل أو رقم العقد..."
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(value) => {
            setDateFrom(value)
            setSelected({})
          }}
          onDateToChange={(value) => {
            setDateTo(value)
            setSelected({})
          }}
          dateFromLabel="من تاريخ أول قسط"
          dateToLabel="إلى تاريخ أول قسط"
          selects={[
            {
              id: 'collector',
              label: 'المحصل',
              value: collectorFilter,
              onChange: (value) => {
                setCollectorFilter(value)
                setSelected({})
              },
              options: collectorOptions,
            },
            {
              id: 'due-status',
              label: 'حالة القسط',
              value: dueStatusFilter,
              onChange: (value) => {
                setDueStatusFilter(value)
                setSelected({})
              },
              options: [...firstDueStatusOptions],
            },
          ]}
          showClear={Boolean(search || collectorFilter || dateFrom || dateTo || dueStatusFilter)}
          onClear={() => {
            setSearch('')
            setCollectorFilter('')
            setDateFrom('')
            setDateTo('')
            setDueStatusFilter('')
          }}
        />
      }
    >
      <AsyncState
        isLoading={collectorsQuery.isLoading || workloadQuery.isLoading || installmentsQuery.isLoading}
        isError={collectorsQuery.isError || workloadQuery.isError || installmentsQuery.isError}
        error={collectorsQuery.error ?? workloadQuery.error ?? installmentsQuery.error}
      >
        <div className="mb-md grid grid-cols-2 gap-sm md:grid-cols-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
            <p className="text-xs text-on-surface-variant">غير معيَّن</p>
            <p className="mt-1 tabular-nums text-2xl font-bold text-on-surface">
              {workloadQuery.data?.unassigned_count ?? 0}
            </p>
          </div>
          {(workloadQuery.data?.data ?? []).map((row) => (
            <div
              key={row.collector_user_id}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md"
            >
              <p className="truncate text-xs text-on-surface-variant">{row.collector_name ?? 'محصل'}</p>
              <p className="mt-1 tabular-nums text-2xl font-bold text-on-surface">{row.contract_count}</p>
              <p className="text-[11px] text-on-surface-variant">عقد مفتوح</p>
            </div>
          ))}
        </div>

        {selectedIds.length > 0 && (
          <div className="mb-md flex flex-wrap items-center gap-sm rounded-xl border border-primary/30 bg-primary/5 p-sm">
            <span className="text-sm text-on-surface">{selectedIds.length} عقد محدد</span>
            <select
              value={bulkCollectorId}
              onChange={(e) => setBulkCollectorId(e.target.value ? Number(e.target.value) : '')}
              className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-sm text-sm"
            >
              <option value="">اختر محصلاً</option>
              {collectors.map((collector) => (
                <option key={collector.id} value={collector.id}>
                  {collector.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={bulkCollectorId === '' || assignMutation.isPending}
              onClick={() =>
                assignMutation.mutate({
                  invoiceIds: selectedIds,
                  collectorUserId: Number(bulkCollectorId),
                })
              }
              className="rounded-lg bg-primary px-md py-2 text-sm font-medium text-on-primary disabled:opacity-50"
            >
              تعيين
            </button>
            <button
              type="button"
              disabled={assignMutation.isPending}
              onClick={() => assignMutation.mutate({ invoiceIds: selectedIds, collectorUserId: null })}
              className="rounded-lg border border-outline-variant px-md py-2 text-sm"
            >
              فك التعيين
            </button>
          </div>
        )}

        {error && <p className="mb-sm text-sm text-error">{error}</p>}

        {contracts.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md text-center text-on-surface-variant">
            لا توجد عقود أقساط مطابقة
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-xs text-on-surface-variant">
                  <th className="px-sm py-2">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => {
                        const next: Record<number, boolean> = {}
                        if (e.target.checked) {
                          for (const contract of contracts) next[contract.invoiceId] = true
                        }
                        setSelected(next)
                      }}
                    />
                  </th>
                  <th className="px-sm py-2 text-start">العميل</th>
                  <th className="px-sm py-2 text-start">العقد</th>
                  <th className="px-sm py-2 text-start">تاريخ أول قسط مستحق</th>
                  <th className="px-sm py-2 text-start">حالة القسط</th>
                  <th className="px-sm py-2 text-start">حالة التحصيل</th>
                  <th className="px-sm py-2 text-start">المتبقي</th>
                  <th className="px-sm py-2 text-start">المحصل</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.invoiceId} className="border-b border-outline-variant/50">
                    <td className="px-sm py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[contract.invoiceId])}
                        onChange={(e) =>
                          setSelected((prev) => ({ ...prev, [contract.invoiceId]: e.target.checked }))
                        }
                      />
                    </td>
                    <td className="px-sm py-2">
                      {contract.customerId ? (
                        <Link to={`/customers/${contract.customerId}`} className="text-primary hover:underline">
                          {contract.customerName}
                        </Link>
                      ) : (
                        contract.customerName
                      )}
                    </td>
                    <td className="px-sm py-2 font-medium">{contract.invoiceNumber}</td>
                    <td className="px-sm py-2 tabular-nums">
                      {contract.firstDueDate ? formatDate(contract.firstDueDate) : '—'}
                    </td>
                    <td className="px-sm py-2">
                      {contract.firstDueStatus ? (
                        <StatusBadge
                          status={dueStatusBadgeStatus[contract.firstDueStatus]}
                          label={firstDueStatusLabels[contract.firstDueStatus]}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-sm py-2">
                      {contract.collectionStatus
                        ? (collectionStatusLabels[contract.collectionStatus] ?? contract.collectionStatus)
                        : '—'}
                    </td>
                    <td className="px-sm py-2 tabular-nums">
                      {contract.remaining.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                    </td>
                    <td className="px-sm py-2">
                      <select
                        value={contract.collectorUserId ?? ''}
                        disabled={assignMutation.isPending}
                        onChange={(e) =>
                          assignMutation.mutate({
                            invoiceIds: [contract.invoiceId],
                            collectorUserId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="h-9 w-full min-w-[10rem] rounded-lg border border-outline-variant bg-surface-container-lowest px-sm text-sm"
                      >
                        <option value="">غير معيَّن</option>
                        {collectors.map((collector) => (
                          <option key={collector.id} value={collector.id}>
                            {collector.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
