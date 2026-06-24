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

export function InventoryTransfersPage() {
  const queryClient = useQueryClient()
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [branchId, setBranchId] = useState<number | ''>('')
  const [quantity, setQuantity] = useState(5)
  const [successToast, setSuccessToast] = useState('')

  const departmentsQuery = useQuery({
    queryKey: ['administrations', 'transfers'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/administrations', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'transfers', departmentId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[administration_id]': departmentId },
      })
      return data.data
    },
    enabled: Boolean(departmentId),
  })

  const transfersQuery = useQuery({
    queryKey: ['stock-transfers', 'distribution'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<StockTransfer>>('/stock-transfers', {
        params: {
          per_page: 30,
          'filter[transfer_kind]': 'distribution',
          include: 'fromWarehouse.administration,toWarehouse.branch,requester,lines',
        },
      })
      return data.data
    },
  })

  const distributeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/department-stock/distribute', {
        department_id: departmentId,
        branch_id: branchId,
        quantity,
      })
      return data
    },
    onSuccess: () => {
      invalidateStockQueries(queryClient)
      setSuccessToast('تم التوزيع على الفرع بنجاح')
      setBranchId('')
      setQuantity(5)
    },
  })

  return (
    <div>
      <PageHeader
        title="توزيع المخزون"
        subtitle="نقل الأجهزة من المخزن المركزي للإدارة إلى مخازن الفروع"
        actions={
          <Link
            to="/inventory/add"
            className="flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-sm"
          >
            <Icon name="add_box" size={18} />
            تسجيل مخزون
          </Link>
        }
      />

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      <div className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
        <h2 className="mb-md text-base font-bold">توزيع جديد</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            distributeMutation.mutate()
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
                {d.name_ar || d.name} (معلق: {d.department_stock?.pending ?? 0})
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
          {distributeMutation.isError && (
            <p className="text-sm text-error sm:col-span-3">{getErrorMessage(distributeMutation.error)}</p>
          )}
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={distributeMutation.isPending}
              className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary"
            >
              {distributeMutation.isPending ? 'جاري التوزيع...' : 'توزيع'}
            </button>
          </div>
        </form>
      </div>

      <h2 className="mb-sm text-base font-bold">سجل التوزيع</h2>
      <AsyncState
        isLoading={transfersQuery.isLoading}
        isError={transfersQuery.isError}
        error={transfersQuery.error}
      >
        <DataTable
          data={transfersQuery.data ?? []}
          keyExtractor={(row) => row.id}
          emptyMessage="لا توجد عمليات توزيع مسجّلة بعد"
          columns={[
            {
              key: 'completed_at',
              header: 'التاريخ',
              render: (row) => formatDate(row.completed_at ?? row.created_at),
            },
            {
              key: 'from',
              header: 'من (إدارة)',
              render: (row) =>
                row.from_warehouse?.administration?.name_ar
                || row.from_warehouse?.administration?.name
                || row.from_warehouse?.name_ar
                || '—',
            },
            {
              key: 'to',
              header: 'إلى (فرع)',
              render: (row) =>
                row.to_warehouse?.branch?.name_ar
                || row.to_warehouse?.branch?.name
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
