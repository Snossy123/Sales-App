import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type {
  AccessoryWarehouseStock,
  Branch,
  Department,
  PaginatedResponse,
  ProductModel,
} from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { ToastBanner } from '../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

type Tab = 'add' | 'distribute' | 'return'

export function AccessoryStockPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('add')
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [branchId, setBranchId] = useState<number | ''>('')
  const [productModelId, setProductModelId] = useState<number | ''>('')
  const [quantity, setQuantity] = useState('1')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const departmentsQuery = useQuery({
    queryKey: ['administrations', 'accessory-stock'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/administrations', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'accessory-stock', departmentId],
    enabled: departmentId !== '',
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[administration_id]': departmentId },
      })
      return data.data
    },
  })

  const accessoriesQuery = useQuery({
    queryKey: ['accessories', 'stock-page'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductModel>>('/accessories', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data
    },
  })

  const stocksQuery = useQuery({
    queryKey: ['accessories', 'stocks'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AccessoryWarehouseStock[] }>('/accessories/stocks')
      return data.data
    },
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        department_id: Number(departmentId),
        product_model_id: Number(productModelId),
        quantity: Math.max(1, Number(quantity) || 1),
        ...(tab !== 'add' ? { branch_id: Number(branchId) } : {}),
      }
      const path =
        tab === 'add'
          ? '/accessory-stock/add'
          : tab === 'distribute'
            ? '/accessory-stock/distribute'
            : '/accessory-stock/return'
      const { data } = await api.post(path, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessories'] })
      setQuantity('1')
      setError('')
      setSuccess(
        tab === 'add' ? 'تم استلام الكمية' : tab === 'distribute' ? 'تم التوزيع' : 'تم الاسترجاع',
      )
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (departmentId === '' || productModelId === '') {
      setError('اختر الإدارة والإكسسوار')
      return
    }
    if (tab !== 'add' && branchId === '') {
      setError('اختر الفرع')
      return
    }
    mutation.mutate()
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'add', label: 'استلام' },
    { id: 'distribute', label: 'توزيع للفرع' },
    { id: 'return', label: 'مرتجع للإدارة' },
  ]

  return (
    <div>
      <PageHeader
        title="مخزون الإكسسوارات"
        subtitle="استلام وتوزيع ومرتجع بالكمية (بدون سيريال)"
      />

      {error && (
        <div className="mb-md rounded-lg border border-error/30 bg-error-container/30 p-md text-sm text-error">
          {error}
        </div>
      )}
      {success && <ToastBanner message={success} onDismiss={() => setSuccess('')} />}

      <div className="mb-md flex gap-sm">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-md py-2 text-sm ${
              tab === item.id
                ? 'bg-primary text-on-primary'
                : 'border border-outline-variant bg-surface-container-lowest'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="mb-lg grid grid-cols-1 gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md md:grid-cols-2"
      >
        <label className="text-sm">
          الإدارة
          <select
            className={inputClass}
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value ? Number(e.target.value) : '')
              setBranchId('')
            }}
            required
          >
            <option value="">اختر</option>
            {(departmentsQuery.data ?? []).map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name_ar || dept.name}
              </option>
            ))}
          </select>
        </label>

        {tab !== 'add' && (
          <label className="text-sm">
            الفرع
            <select
              className={inputClass}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">اختر</option>
              {(branchesQuery.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name_ar || branch.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="text-sm">
          الإكسسوار
          <select
            className={inputClass}
            value={productModelId}
            onChange={(e) => setProductModelId(e.target.value ? Number(e.target.value) : '')}
            required
          >
            <option value="">اختر</option>
            {(accessoriesQuery.data ?? []).map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name_ar || acc.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          الكمية
          <input
            type="number"
            min={1}
            className={inputClass}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-2 text-sm text-on-primary"
          >
            <Icon name="check" size={18} />
            تنفيذ
          </button>
        </div>
      </form>

      <h2 className="mb-sm text-base font-medium">أرصدة المخازن</h2>
      <AsyncState
        isLoading={stocksQuery.isLoading}
        isError={stocksQuery.isError}
        error={stocksQuery.error}
      >
        <DataTable
          columns={[
            {
              key: 'product',
              header: 'الإكسسوار',
              render: (row: AccessoryWarehouseStock) =>
                row.product_model?.name_ar || row.product_model?.name || row.product_model_id,
            },
            {
              key: 'warehouse',
              header: 'المخزن',
              render: (row: AccessoryWarehouseStock) =>
                row.warehouse?.name_ar || row.warehouse?.name || row.warehouse_id,
            },
            { key: 'qty', header: 'الكمية', render: (row: AccessoryWarehouseStock) => row.quantity },
            {
              key: 'available',
              header: 'المتاح',
              render: (row: AccessoryWarehouseStock) =>
                row.available ?? Math.max(0, row.quantity - row.reserved),
            },
          ]}
          data={stocksQuery.data ?? []}
          keyExtractor={(row) => row.id}
          emptyMessage="لا توجد أرصدة بعد"
        />
      </AsyncState>
    </div>
  )
}
