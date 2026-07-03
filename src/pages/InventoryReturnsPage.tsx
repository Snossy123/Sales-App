import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Branch, Department, PaginatedResponse, StockTransfer } from '../api/types'
import { invalidateStockQueries } from '../components/AddStockForm'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { ToastBanner } from '../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

function formatDate(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function InventoryReturnsPage() {
  const queryClient = useQueryClient()
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [branchId, setBranchId] = useState<number | ''>('')
  const [quantity, setQuantity] = useState(5)
  const [successToast, setSuccessToast] = useState('')

  const departmentsQuery = useQuery({
    queryKey: ['administrations', 'returns'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/administrations', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'returns', departmentId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[administration_id]': departmentId },
      })
      return data.data
    },
    enabled: Boolean(departmentId),
  })

  const returnsQuery = useQuery({
    queryKey: ['stock-transfers', 'return'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<StockTransfer>>('/stock-transfers', {
        params: {
          per_page: 30,
          'filter[transfer_kind]': 'return',
          include: 'fromWarehouse.branch,toWarehouse.administration,requester,lines',
        },
      })
      return data.data
    },
  })

  const returnMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/department-stock/return', {
        department_id: departmentId,
        branch_id: branchId,
        quantity,
      })
      return data
    },
    onSuccess: () => {
      invalidateStockQueries(queryClient)
      setSuccessToast('تم استرجاع المخزون إلى الإدارة بنجاح')
      setBranchId('')
      setQuantity(5)
    },
  })

  return (
    <div>
      <PageHeader
        title="استرجاع مخزون"
        subtitle="نقل الأجهزة من مخزن الفرع إلى المخزن المركزي للإدارة"
        actions={
          <Link
            to="/inventory/transfers"
            className="flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-sm"
          >
            <Icon name="local_shipping" size={18} />
            توزيع المخزون
          </Link>
        }
      />

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      <div className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
        <h2 className="mb-md text-base font-bold">استرجاع جديد</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            returnMutation.mutate()
          }}
          className="grid gap-sm sm:grid-cols-3"
        >
          <select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(Number(e.target.value))
              setBranchId('')
            }}
            required
            className={inputClass}
          >
            <option value="">الإدارة</option>
            {(departmentsQuery.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name_ar || d.name}
              </option>
            ))}
          </select>
          <select
            value={branchId}
            onChange={(e) => setBranchId(Number(e.target.value))}
            required
            disabled={!departmentId}
            className={inputClass}
          >
            <option value="">الفرع</option>
            {branchesQuery.data?.map((b) => (
              <option key={b.id} value={b.id}>{b.name_ar || b.name}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={500}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            placeholder="الكمية"
            required
            className={`${inputClass} tabular-nums`}
          />
          {returnMutation.isError && (
            <p className="text-sm text-error sm:col-span-3">{getErrorMessage(returnMutation.error)}</p>
          )}
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={returnMutation.isPending}
              className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary"
            >
              {returnMutation.isPending ? 'جاري الاسترجاع...' : 'استرجاع'}
            </button>
          </div>
        </form>
      </div>

      <h2 className="mb-sm text-base font-bold">سجل الاسترجاع</h2>
      <AsyncState
        isLoading={returnsQuery.isLoading}
        isError={returnsQuery.isError}
        error={returnsQuery.error}
      >
        <DataTable
          data={returnsQuery.data ?? []}
          keyExtractor={(row) => row.id}
          emptyMessage="لا توجد عمليات استرجاع مسجّلة بعد"
          columns={[
            {
              key: 'completed_at',
              header: 'التاريخ',
              render: (row) => formatDate(row.completed_at ?? row.created_at),
            },
            {
              key: 'from',
              header: 'من (فرع)',
              render: (row) =>
                row.from_warehouse?.branch?.name_ar
                || row.from_warehouse?.branch?.name
                || row.from_warehouse?.name_ar
                || '—',
            },
            {
              key: 'to',
              header: 'إلى (إدارة)',
              render: (row) =>
                row.to_warehouse?.administration?.name_ar
                || row.to_warehouse?.administration?.name
                || row.to_warehouse?.name_ar
                || '—',
            },
            {
              key: 'quantity',
              header: 'الكمية',
              className: 'tabular-nums font-medium',
              render: (row) => row.lines?.length ?? '—',
            },
            {
              key: 'requester',
              header: 'بواسطة',
              render: (row) => row.requester?.name || '—',
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
