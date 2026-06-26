import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { PaginatedResponse, Promotion } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { EntityRowActions } from '../../../components/crud/EntityRowActions'
import { Modal } from '../../../components/Modal'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'
import { getEntityCrudConfig } from '../../../lib/crud/entityCrudRegistry'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const emptyForm = {
  name_ar: '',
  promotion_type: 'percent',
  discount_value: '',
  applies_to: 'all',
  start_date: '',
  end_date: '',
  min_quantity: '1',
  max_uses: '',
  is_active: true,
}

function promotionToForm(promotion: Promotion) {
  return {
    name_ar: promotion.name_ar ?? '',
    promotion_type: promotion.promotion_type ?? 'percent',
    discount_value: String(promotion.discount_value ?? ''),
    applies_to: promotion.applies_to ?? 'all',
    start_date: promotion.start_date?.slice(0, 10) ?? '',
    end_date: promotion.end_date?.slice(0, 10) ?? '',
    min_quantity: String(promotion.min_quantity ?? 1),
    max_uses: promotion.max_uses != null ? String(promotion.max_uses) : '',
    is_active: promotion.is_active ?? true,
  }
}

export function PromotionsPage() {
  const queryClient = useQueryClient()
  const crudConfig = getEntityCrudConfig('promotions')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState('')

  const promotionsQuery = useQuery({
    queryKey: ['pricing', 'promotions'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Promotion>>('/pricing/promotions', {
        params: { per_page: 100 },
      })
      return data.data ?? []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name_ar: form.name_ar,
        promotion_type: form.promotion_type,
        discount_value: Number(form.discount_value),
        applies_to: form.applies_to,
        start_date: form.start_date,
        end_date: form.end_date,
        min_quantity: Number(form.min_quantity || 1),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        is_active: form.is_active,
      }
      if (editId) {
        const { data } = await api.put<Promotion>(`/pricing/promotions/${editId}`, payload)
        return data
      }
      const { data } = await api.post<Promotion>('/pricing/promotions', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing', 'promotions'] })
      queryClient.invalidateQueries({ queryKey: ['pricing', 'promotions', 'active'] })
      setModalOpen(false)
      setEditId(null)
      setForm(emptyForm)
      setToast(editId ? 'تم تحديث العرض' : 'تم إنشاء العرض')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (promotion: Promotion) => {
    setEditId(promotion.id)
    setForm(promotionToForm(promotion))
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditId(null)
    setForm(emptyForm)
  }

  return (
    <SalesPageShell
      title="العروض الترويجية"
      subtitle="خصومات وباقات تُطبَّق في نقطة البيع"
      actions={
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary"
        >
          عرض جديد
        </button>
      }
    >
      {toast && (
        <div className="mb-md">
          <ToastBanner message={toast} onDismiss={() => setToast('')} />
        </div>
      )}

      <AsyncState
        isLoading={promotionsQuery.isLoading}
        isError={promotionsQuery.isError}
        error={promotionsQuery.error}
      >
        <DataTable<Promotion & Record<string, unknown>>
          data={(promotionsQuery.data ?? []) as (Promotion & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={15}
          emptyMessage="لا عروض"
          columns={[
            { key: 'name_ar', header: 'العرض' },
            {
              key: 'promotion_type',
              header: 'النوع',
              render: (row) =>
                row.promotion_type === 'percent'
                  ? 'نسبة'
                  : row.promotion_type === 'fixed'
                    ? 'مبلغ ثابت'
                    : 'باقة',
            },
            {
              key: 'discount_value',
              header: 'القيمة',
              render: (row) =>
                row.promotion_type === 'percent'
                  ? `${row.discount_value}%`
                  : `${Number(row.discount_value).toLocaleString('ar-EG')} ج.م`,
            },
            { key: 'start_date', header: 'من' },
            { key: 'end_date', header: 'إلى' },
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
                <EntityRowActions
                  row={row}
                  config={crudConfig}
                  queryKeys={[['pricing', 'promotions']]}
                  onEdit={openEdit}
                  showView={false}
                />
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal open={modalOpen} onClose={closeModal} title={editId ? 'تعديل عرض' : 'عرض ترويجي جديد'}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="grid gap-sm sm:grid-cols-2"
        >
          <input
            placeholder="اسم العرض"
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            required
            className={`${inputClass} sm:col-span-2`}
          />
          <select
            value={form.promotion_type}
            onChange={(e) => setForm({ ...form, promotion_type: e.target.value })}
            className={inputClass}
          >
            <option value="percent">نسبة خصم</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
          <input
            type="number"
            placeholder="قيمة الخصم"
            value={form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
            required
            className={inputClass}
          />
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required className={inputClass} />
          <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required className={inputClass} />
          <label className="flex items-center gap-sm text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            نشط
          </label>
          <div className="flex gap-sm sm:col-span-2">
            <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-primary px-md py-sm text-sm text-on-primary">
              حفظ
            </button>
            <button type="button" onClick={closeModal} className="rounded-lg border px-md py-sm text-sm">
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </SalesPageShell>
  )
}
