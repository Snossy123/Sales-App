import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { AccessoryPackage, PaginatedResponse, ProductModel } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { ToastBanner } from '../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

type ItemDraft = { product_model_id: number | ''; quantity: string }

export function AccessoryPackagesPage() {
  const queryClient = useQueryClient()
  const [nameAr, setNameAr] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([{ product_model_id: '', quantity: '1' }])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const accessoriesQuery = useQuery({
    queryKey: ['accessories', 'active'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductModel>>('/accessories', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data
    },
  })

  const packagesQuery = useQuery({
    queryKey: ['accessory-packages'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AccessoryPackage>>('/accessory-packages', {
        params: { per_page: 100, include: 'items.productModel' },
      })
      return data.data
    },
  })

  const accessoryOptions = useMemo(() => accessoriesQuery.data ?? [], [accessoriesQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name_ar: nameAr.trim(),
        sell_price: Number(sellPrice),
        is_active: true,
        items: items
          .filter((item) => item.product_model_id !== '')
          .map((item) => ({
            product_model_id: Number(item.product_model_id),
            quantity: Math.max(1, Number(item.quantity) || 1),
          })),
      }
      if (payload.items.length < 1) {
        throw new Error('أضف مكوناً واحداً على الأقل')
      }
      if (editingId) {
        const { data } = await api.put<AccessoryPackage>(`/accessory-packages/${editingId}`, payload)
        return data
      }
      const { data } = await api.post<AccessoryPackage>('/accessory-packages', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessory-packages'] })
      setNameAr('')
      setSellPrice('')
      setItems([{ product_model_id: '', quantity: '1' }])
      setEditingId(null)
      setError('')
      setSuccess(editingId ? 'تم تحديث الباكدج' : 'تم إنشاء الباكدج')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/accessory-packages/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessory-packages'] })
      setSuccess('تم حذف الباكدج')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const startEdit = (pkg: AccessoryPackage) => {
    setEditingId(pkg.id)
    setNameAr(pkg.name_ar)
    setSellPrice(String(pkg.sell_price))
    setItems(
      (pkg.items ?? []).map((item) => ({
        product_model_id: item.product_model_id,
        quantity: String(item.quantity),
      })),
    )
    if (!(pkg.items ?? []).length) {
      setItems([{ product_model_id: '', quantity: '1' }])
    }
    setError('')
    setSuccess('')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <div>
      <PageHeader
        title="باكدجات الإكسسوارات"
        subtitle="باكدج من إكسسوارات فقط — يُباع كمجموعة أو تُباع القطع منفردة من نفس المخزون"
      />

      {error && (
        <div className="mb-md rounded-lg border border-error/30 bg-error-container/30 p-md text-sm text-error">
          {error}
        </div>
      )}
      {success && <ToastBanner message={success} onDismiss={() => setSuccess('')} />}

      <form
        onSubmit={onSubmit}
        className="mb-lg space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md"
      >
        <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
          <label className="text-sm">
            اسم الباكدج
            <input
              className={inputClass}
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            سعر الباكدج
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="space-y-sm">
          <p className="text-sm font-medium">المكونات</p>
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 gap-sm md:grid-cols-[1fr_120px_auto]">
              <select
                className={inputClass}
                value={item.product_model_id}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((row, i) =>
                      i === index
                        ? {
                            ...row,
                            product_model_id: e.target.value ? Number(e.target.value) : '',
                          }
                        : row,
                    ),
                  )
                }
                required
              >
                <option value="">اختر إكسسوار</option>
                {accessoryOptions.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name_ar || acc.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={item.quantity}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, quantity: e.target.value } : row)),
                  )
                }
                required
              />
              <button
                type="button"
                className="rounded-lg border border-outline-variant px-sm text-sm"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                disabled={items.length === 1}
              >
                حذف
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() => setItems((prev) => [...prev, { product_model_id: '', quantity: '1' }])}
          >
            + إضافة مكون
          </button>
        </div>

        <div className="flex gap-sm">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-2 text-sm text-on-primary"
          >
            <Icon name={editingId ? 'save' : 'add'} size={18} />
            {editingId ? 'حفظ الباكدج' : 'إنشاء باكدج'}
          </button>
          {editingId && (
            <button
              type="button"
              className="rounded-lg border border-outline-variant px-md py-2 text-sm"
              onClick={() => {
                setEditingId(null)
                setNameAr('')
                setSellPrice('')
                setItems([{ product_model_id: '', quantity: '1' }])
              }}
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      <AsyncState
        isLoading={packagesQuery.isLoading}
        isError={packagesQuery.isError}
        error={packagesQuery.error}
      >
        <DataTable
          columns={[
            { key: 'name', header: 'الباكدج', render: (row: AccessoryPackage) => row.name_ar },
            {
              key: 'price',
              header: 'السعر',
              render: (row: AccessoryPackage) => Number(row.sell_price).toLocaleString('ar-EG'),
            },
            {
              key: 'items',
              header: 'المكونات',
              render: (row: AccessoryPackage) =>
                (row.items ?? [])
                  .map(
                    (item) =>
                      `${item.product_model?.name_ar || item.product_model?.name || item.product_model_id} × ${item.quantity}`,
                  )
                  .join(' · ') || '—',
            },
            {
              key: 'actions',
              header: '',
              render: (row: AccessoryPackage) => (
                <div className="flex gap-sm">
                  <button type="button" className="text-sm text-primary" onClick={() => startEdit(row)}>
                    تعديل
                  </button>
                  <button
                    type="button"
                    className="text-sm text-error"
                    onClick={() => {
                      if (confirm('حذف الباكدج؟')) deleteMutation.mutate(row.id)
                    }}
                  >
                    حذف
                  </button>
                </div>
              ),
            },
          ]}
          data={packagesQuery.data ?? []}
          keyExtractor={(row) => row.id}
          emptyMessage="لا توجد باكدجات"
        />
      </AsyncState>
    </div>
  )
}
