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
import { collectionStatusLabels } from '../../../lib/collectionHelpers'
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
}

export function CollectionAssignmentsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [collectorFilter, setCollectorFilter] = useState('')
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
    const map = new Map<number, AssignmentContract>()
    for (const row of installmentsQuery.data ?? []) {
      if (row.status === 'paid') continue
      const invoiceId = Number(row.sales_invoice_id ?? 0)
      if (!invoiceId) continue
      const remaining = Number(row.remaining ?? 0)
      const existing = map.get(invoiceId)
      if (existing) {
        existing.remaining += remaining
        continue
      }
      map.set(invoiceId, {
        invoiceId,
        invoiceNumber: String(row.invoice_number ?? `#${invoiceId}`),
        customerName: String(row.customer_name ?? '—'),
        customerId: row.customer_id,
        branchId: row.branch_id,
        collectionStatus: row.collection_status,
        collectorUserId: row.collector_user_id ?? null,
        collectorName: row.collector_name ?? null,
        remaining,
      })
    }

    const q = search.trim().toLowerCase()
    return Array.from(map.values()).filter((contract) => {
      if (!q) return true
      return (
        contract.customerName.toLowerCase().includes(q) ||
        contract.invoiceNumber.toLowerCase().includes(q)
      )
    })
  }, [installmentsQuery.data, search])

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
          ]}
          showClear={Boolean(search || collectorFilter)}
          onClear={() => {
            setSearch('')
            setCollectorFilter('')
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
            <table className="w-full min-w-[44rem] text-sm">
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
