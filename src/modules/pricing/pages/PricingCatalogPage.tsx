import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { PaginatedResponse, PriceCatalogItem } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Modal } from '../../../components/Modal'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const emptyForm = {
  item_type: 'product',
  name_ar: '',
  base_price: '',
  cost_price: '',
  is_active: true,
}

export function PricingCatalogPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<PriceCatalogItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState('')

  const catalogQuery = useQuery({
    queryKey: ['pricing', 'catalog'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PriceCatalogItem>>('/pricing/catalog', {
        params: { per_page: 100 },
      })
      return data.data ?? []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        item_type: form.item_type,
        name_ar: form.name_ar,
        base_price: Number(form.base_price),
        cost_price: form.cost_price ? Number(form.cost_price) : 0,
        is_active: form.is_active,
      }
      if (editItem) {
        const { data } = await api.put<PriceCatalogItem>(`/pricing/catalog/${editItem.id}`, payload)
        return data
      }
      const { data } = await api.post<PriceCatalogItem>('/pricing/catalog', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing', 'catalog'] })
      setModalOpen(false)
      setToast('تم الحفظ')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const openCreate = () => {
    setEditItem(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: PriceCatalogItem) => {
    setEditItem(item)
    setForm({
      item_type: item.item_type,
      name_ar: item.name_ar,
      base_price: String(item.base_price),
      cost_price: item.cost_price != null ? String(item.cost_price) : '',
      is_active: item.is_active,
    })
    setModalOpen(true)
  }

  return (
    <SalesPageShell
      title="كتalog الأسعار"
      subtitle="إدارة أسعار المنتجات والخدمات"
      actions={
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary"
        >
          إضافة سعر
        </button>
      }
    >
      {toast && (
        <div className="mb-md">
          <ToastBanner message={toast} onDismiss={() => setToast('')} />
        </div>
      )}

      <AsyncState
        isLoading={catalogQuery.isLoading}
        isError={catalogQuery.isError}
        error={catalogQuery.error}
      >
        <DataTable<PriceCatalogItem & Record<string, unknown>>
          data={(catalogQuery.data ?? []) as (PriceCatalogItem & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={15}
          emptyMessage="لا عناصر في الكتalog"
          columns={[
            { key: 'name_ar', header: 'الاسم' },
            { key: 'item_type', header: 'النوع' },
            {
              key: 'base_price',
              header: 'سعر البيع',
              render: (row) => Number(row.base_price).toLocaleString('ar-EG'),
            },
            {
              key: 'cost_price',
              header: 'التكلفة',
              render: (row) => Number(row.cost_price ?? 0).toLocaleString('ar-EG'),
            },
            {
              key: 'is_active',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge
                  status={row.is_active ? 'active' : 'inactive'}
                  label={row.is_active ? 'نشط' : 'متوقف'}
                />
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => openEdit(row as PriceCatalogItem)}
                  className="text-sm text-primary hover:underline"
                >
                  تعديل
                </button>
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'تعديل سعر' : 'سعر جديد'}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="grid gap-sm sm:grid-cols-2"
        >
          <select
            value={form.item_type}
            onChange={(e) => setForm({ ...form, item_type: e.target.value })}
            className={inputClass}
          >
            <option value="product">منتج</option>
            <option value="service">خدمة</option>
            <option value="accessory">إكسسوار</option>
          </select>
          <input
            placeholder="الاسم"
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            required
            className={inputClass}
          />
          <input
            type="number"
            placeholder="سعر البيع"
            value={form.base_price}
            onChange={(e) => setForm({ ...form, base_price: e.target.value })}
            required
            className={inputClass}
          />
          <input
            type="number"
            placeholder="التكلفة"
            value={form.cost_price}
            onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
            className={inputClass}
          />
          <label className="flex items-center gap-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            نشط
          </label>
          <div className="flex gap-sm sm:col-span-2">
            <button type="submit" className="rounded-lg bg-primary px-md py-sm text-sm text-on-primary">
              حفظ
            </button>
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-md py-sm text-sm">
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </SalesPageShell>
  )
}
