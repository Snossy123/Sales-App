import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Customer, Distributor } from '../api/types'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { SearchableSelect } from '../components/SearchableSelect'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import {
  distributorFormStatusOptions,
  distributorTypeOptions,
  type ApiPaginated,
} from '../lib/sales'
import { getResolvedAdministrationId } from '../lib/dataScope'
import { useAuthStore } from '../stores/authStore'

const emptyForm = {
  code: '',
  name_ar: '',
  phone: '',
  address: '',
  type: 'free' as const,
  customer_id: null as number | null,
  status: 'active' as const,
  agreed_amount: '',
}

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2 text-sm'
const labelClass = 'col-span-12 block text-sm sm:col-span-6'
const labelTextClass = 'mb-xs block text-on-surface-variant'

export function DistributorAddPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const branchId = useAuthStore((s) => s.branchId)
  const administrationId = getResolvedAdministrationId(user)
  const [form, setForm] = useState(emptyForm)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300)

  const customersQuery = useQuery({
    queryKey: ['customers', 'distributor-add', administrationId, debouncedCustomerSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 25,
        'filter[status]': 'active',
      }
      if (administrationId) params['filter[administration_id]'] = administrationId
      const q = debouncedCustomerSearch.trim()
      if (q) {
        if (/^01\d{8,9}$/.test(q.replace(/\s/g, ''))) {
          params['filter[phone]'] = q.replace(/\s/g, '')
        } else {
          params['filter[name]'] = q
        }
      }
      const { data } = await api.get<ApiPaginated<Customer>>('/customers', { params })
      return data.data
    },
    enabled: Boolean(administrationId),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        name: form.name_ar.trim(),
        branch_id: branchId,
        customer_id: form.customer_id,
        agreed_amount: form.agreed_amount ? Number(form.agreed_amount) : 0,
      }
      const { data } = await api.post<Distributor>('/distributors', payload)
      return data
    },
    onSuccess: (distributor) => {
      navigate(`/distributors/${distributor.id}`)
    },
  })

  const handleCustomerChange = (customer: Customer | null) => {
    setSelectedCustomer(customer)
    if (!customer) {
      setForm((prev) => ({ ...prev, customer_id: null }))
      return
    }

    setForm((prev) => ({
      ...prev,
      customer_id: customer.id,
      name_ar: prev.name_ar || customer.name,
      phone: customer.phone || prev.phone,
      address: customer.address || prev.address,
    }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!branchId) return
    createMutation.mutate()
  }

  return (
    <SalesPageShell
      title="إضافة موزع"
      subtitle="تسجيل بيانات الموزع وربطه بعميل موجود إن وُجد"
      actions={
        <Link
          to="/distributors"
          className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface hover:bg-surface-container"
        >
          <Icon name="arrow_forward" size={18} />
          العودة للقائمة
        </Link>
      }
    >
      {!branchId ? (
        <p className="text-sm text-on-surface-variant">يرجى اختيار فرع قبل إضافة موزع.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-md">
          <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <h3 className="mb-sm text-sm font-bold text-on-surface">بيانات الموزع</h3>
            <div className="grid grid-cols-12 gap-sm">
              <label className={labelClass}>
                <span className={labelTextClass}>كود الموزع *</span>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                  dir="ltr"
                  placeholder="DIST-001"
                  className={inputClass}
                />
              </label>

              <div className={labelClass}>
                <SearchableSelect
                  label="عميل موجود (اختياري)"
                  options={customersQuery.data ?? []}
                  value={selectedCustomer}
                  onChange={handleCustomerChange}
                  onSearchChange={setCustomerSearch}
                  getOptionValue={(c) => c.id}
                  getOptionLabel={(c) => `${c.name}${c.phone ? ` — ${c.phone}` : ''}`}
                  placeholder="ابحث بالاسم أو الهاتف..."
                  loading={customersQuery.isFetching}
                  emptyMessage="لا يوجد عملاء"
                />
              </div>

              <label className={labelClass}>
                <span className={labelTextClass}>الاسم *</span>
                <input
                  value={form.name_ar}
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                  required
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                <span className={labelTextClass}>الهاتف</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  dir="ltr"
                  placeholder="01xxxxxxxxx"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                <span className={labelTextClass}>النوع</span>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as typeof form.type })
                  }
                  className={inputClass}
                >
                  {distributorTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                <span className={labelTextClass}>الحالة</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as typeof form.status })
                  }
                  className={inputClass}
                >
                  {distributorFormStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                <span className={labelTextClass}>القيمة المتفق عليها</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.agreed_amount}
                  onChange={(e) =>
                    setForm({ ...form, agreed_amount: e.target.value })
                  }
                  className={inputClass}
                />
              </label>

              <label className="col-span-12 block text-sm">
                <span className={labelTextClass}>العنوان</span>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={3}
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          {createMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(createMutation.error)}</p>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded-lg bg-secondary py-3 text-sm font-bold text-on-secondary disabled:opacity-50 sm:w-auto sm:min-w-[200px] sm:px-xl"
          >
            حفظ الموزع
          </button>
        </form>
      )}
    </SalesPageShell>
  )
}
