import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { PaginatedResponse, ProductModel } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { ToastBanner } from '../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const emptyForm = {
  name_ar: '',
  model_code: '',
  brand: '',
  sell_price: '',
  is_active: true,
}

export function AccessoriesCatalogPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const listQuery = useQuery({
    queryKey: ['accessories'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductModel>>('/accessories', {
        params: { per_page: 100, include: 'warehouseStocks.warehouse' },
      })
      return data.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name_ar: form.name_ar.trim(),
        model_code: form.model_code.trim() || null,
        brand: form.brand.trim() || null,
        sell_price: Number(form.sell_price),
        is_active: form.is_active,
      }
      if (editingId) {
        const { data } = await api.put<ProductModel>(`/accessories/${editingId}`, payload)
        return data
      }
      const { data } = await api.post<ProductModel>('/accessories', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessories'] })
      setForm(emptyForm)
      setEditingId(null)
      setError('')
      setSuccess(editingId ? 'تم تحديث الإكسسوار' : 'تم إضافة الإكسسوار')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name_ar.trim() || Number(form.sell_price) < 0) {
      setError('الاسم وسعر البيع مطلوبان')
      return
    }
    saveMutation.mutate()
  }

  const startEdit = (item: ProductModel) => {
    setEditingId(item.id)
    setForm({
      name_ar: item.name_ar || item.name,
      model_code: item.model_code ?? '',
      brand: item.brand ?? '',
      sell_price: String(item.sell_price ?? ''),
      is_active: item.is_active !== false,
    })
    setSuccess('')
    setError('')
  }

  return (
    <div>
      <PageHeader
        title="كتالوج الإكسسوارات"
        subtitle="إدارة منتجات الإكسسوارات وأسعارها (المخزون بالكمية)"
      />

      {error && (
        <div className="mb-md rounded-lg border border-error/30 bg-error-container/30 p-md text-sm text-error">
          {error}
        </div>
      )}
      {success && <ToastBanner message={success} onDismiss={() => setSuccess('')} />}

      <form
        onSubmit={onSubmit}
        className="mb-lg grid grid-cols-1 gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md md:grid-cols-3"
      >
        <label className="text-sm">
          الاسم
          <input
            className={inputClass}
            value={form.name_ar}
            onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
            required
          />
        </label>
        <label className="text-sm">
          الكود
          <input
            className={inputClass}
            value={form.model_code}
            onChange={(e) => setForm((f) => ({ ...f, model_code: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          الماركة
          <input
            className={inputClass}
            value={form.brand}
            onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          سعر البيع
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={form.sell_price}
            onChange={(e) => setForm((f) => ({ ...f, sell_price: e.target.value }))}
            required
          />
        </label>
        <label className="flex items-end gap-sm pb-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          نشط
        </label>
        <div className="flex items-end gap-sm md:col-span-3">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-2 text-sm text-on-primary"
          >
            <Icon name={editingId ? 'save' : 'add'} size={18} />
            {editingId ? 'حفظ التعديل' : 'إضافة إكسسوار'}
          </button>
          {editingId && (
            <button
              type="button"
              className="rounded-lg border border-outline-variant px-md py-2 text-sm"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
              }}
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      <AsyncState
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        error={listQuery.error}
      >
        <DataTable
          columns={[
            { key: 'name', header: 'الاسم', render: (row: ProductModel) => row.name_ar || row.name },
            { key: 'code', header: 'الكود', render: (row: ProductModel) => row.model_code || '—' },
            {
              key: 'price',
              header: 'سعر البيع',
              render: (row: ProductModel) => Number(row.sell_price ?? 0).toLocaleString('ar-EG'),
            },
            {
              key: 'stock',
              header: 'إجمالي الكمية',
              render: (row: ProductModel) =>
                (row.warehouse_stocks ?? []).reduce((sum, s) => sum + Number(s.quantity ?? 0), 0),
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row: ProductModel) => (row.is_active === false ? 'متوقف' : 'نشط'),
            },
            {
              key: 'actions',
              header: '',
              render: (row: ProductModel) => (
                <button
                  type="button"
                  className="text-sm text-primary"
                  onClick={() => startEdit(row)}
                >
                  تعديل
                </button>
              ),
            },
          ]}
          data={listQuery.data ?? []}
          keyExtractor={(row) => row.id}
          emptyMessage="لا توجد إكسسوارات"
        />
      </AsyncState>
    </div>
  )
}
