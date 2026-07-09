import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { AdminUser, Customer, PaginatedResponse } from '../../../api/types'
import { CustomerPhoneFields } from '../../../components/customers/CustomerPhoneFields'
import { Icon } from '../../../components/Icon'
import { SearchableSelect } from '../../../components/SearchableSelect'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import {
  defaultPhoneEntries,
  phoneEntriesToPayload,
  type CustomerPhoneEntry,
} from '../../../lib/customerForm'
import { distributorLabel } from '../../../lib/sales'

type AcquisitionSource = 'customer_referral' | 'social'

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2'

export function CrmCustomerAddPage() {
  const navigate = useNavigate()
  const [phones, setPhones] = useState<CustomerPhoneEntry[]>(defaultPhoneEntries())
  const [form, setForm] = useState({ name: '', national_id: '', address: '', notes: '' })
  const [acquisitionSource, setAcquisitionSource] = useState<AcquisitionSource>('customer_referral')
  const [selectedReferrer, setSelectedReferrer] = useState<Customer | null>(null)
  const [referrerSearch, setReferrerSearch] = useState('')
  const [salesUserId, setSalesUserId] = useState<number | ''>('')

  const debouncedReferrerSearch = useDebouncedValue(referrerSearch, 300)

  const staffQuery = useQuery({
    queryKey: ['staff-options', 'crm-customer-add'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminUser[] }>('/staff-options')
      return data.data
    },
  })

  const referrersQuery = useQuery({
    queryKey: ['customers', 'referrers', debouncedReferrerSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 20,
        include: 'distributorProfile',
        'filter[has_distributor_profile]': 1,
      }
      if (debouncedReferrerSearch.trim()) {
        params['filter[name]'] = debouncedReferrerSearch.trim()
      }
      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params })
      return data.data
    },
    enabled: acquisitionSource === 'customer_referral',
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        ...form,
        ...phoneEntriesToPayload(phones),
        acquisition_source: acquisitionSource,
        sales_user_id: Number(salesUserId),
      }

      if (acquisitionSource === 'customer_referral') {
        if (!selectedReferrer) {
          throw new Error('يجب اختيار العميل المُحيل (موزّع)')
        }
        payload.referred_by_customer_id = selectedReferrer.id
      }

      const { data } = await api.post<Customer>('/customers', payload)
      return data
    },
    onSuccess: (customer) => {
      navigate(`/customers/${customer.id}`)
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <SalesPageShell
      title="إضافة عميل جديد"
      subtitle="تسجيل عميل مع مصدر الإحالة والموظف المسؤول لاحتساب العمولة عند التعاقد"
      actions={
        <Link
          to="/crm"
          className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface hover:bg-surface-container"
        >
          <Icon name="arrow_forward" size={18} />
          العودة للـ CRM
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-md">
        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <h3 className="mb-sm text-sm font-bold text-on-surface">بيانات العميل</h3>
          <div className="grid grid-cols-12 gap-sm">
            <label className="col-span-12 block text-sm sm:col-span-4">
              <span className="mb-xs block text-on-surface-variant">الاسم *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className={inputClass}
              />
            </label>
            <label className="col-span-12 block text-sm sm:col-span-4">
              <span className="mb-xs block text-on-surface-variant">الرقم القومي</span>
              <input
                value={form.national_id}
                onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                dir="ltr"
                className={inputClass}
              />
            </label>
            <label className="col-span-12 block text-sm sm:col-span-4">
              <span className="mb-xs block text-on-surface-variant">العنوان</span>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputClass}
              />
            </label>
            <CustomerPhoneFields phones={phones} onChange={setPhones} />
            <label className="col-span-12 block text-sm">
              <span className="mb-xs block text-on-surface-variant">ملاحظات</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <h3 className="mb-sm text-sm font-bold text-on-surface">مصدر الوصول والعمولة</h3>

          <div className="mb-md">
            <span className="mb-xs block text-sm text-on-surface-variant">مصدر العميل *</span>
            <div className="flex w-fit gap-1 rounded-lg border border-outline-variant p-0.5 text-sm">
              <button
                type="button"
                onClick={() => {
                  setAcquisitionSource('customer_referral')
                  setSelectedReferrer(null)
                  setReferrerSearch('')
                }}
                className={`rounded px-md py-1.5 font-medium ${
                  acquisitionSource === 'customer_referral'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant'
                }`}
              >
                عن طريق عميل (موزّع)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAcquisitionSource('social')
                  setSelectedReferrer(null)
                  setReferrerSearch('')
                }}
                className={`rounded px-md py-1.5 font-medium ${
                  acquisitionSource === 'social'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant'
                }`}
              >
                سوشيال
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-sm">
            {acquisitionSource === 'customer_referral' && (
              <div className="col-span-12 sm:col-span-6">
                <SearchableSelect
                  label="العميل المُحيل (موزّع) *"
                  options={referrersQuery.data ?? []}
                  value={selectedReferrer}
                  onChange={setSelectedReferrer}
                  onSearchChange={setReferrerSearch}
                  getOptionValue={(c) => c.id}
                  getOptionLabel={(c) => {
                    const profile = c.distributor_profile
                    const distLabel = profile ? distributorLabel(profile) : '—'
                    return `${c.name} — ${c.phone} (${distLabel})`
                  }}
                  placeholder="ابحث باسم العميل المُحيل..."
                  loading={referrersQuery.isLoading}
                  emptyMessage="لا يوجد موزّع مطابق"
                />
                <p className="mt-xs text-xs text-on-surface-variant">
                  يُربط تلقائياً بملف الموزّع لاحتساب عمولته عند التعاقد
                </p>
              </div>
            )}

            <label className="col-span-12 block text-sm sm:col-span-6">
              <span className="mb-xs block text-on-surface-variant">الموظف المسؤول *</span>
              <select
                value={salesUserId}
                onChange={(e) => setSalesUserId(e.target.value ? Number(e.target.value) : '')}
                required
                className={inputClass}
              >
                <option value="">اختر الموظف</option>
                {(staffQuery.data ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <p className="mt-xs text-xs text-on-surface-variant">
                {acquisitionSource === 'customer_referral'
                  ? 'الموظف والموزّع المُحيل يحصلان على عمولة عند التعاقد'
                  : 'الموظف يحصل على عمولة عند التعاقد'}
              </p>
            </label>
          </div>
        </section>

        {createMutation.isError && (
          <p className="text-sm text-error">{getErrorMessage(createMutation.error)}</p>
        )}

        <button
          type="submit"
          disabled={
            createMutation.isPending ||
            !salesUserId ||
            (acquisitionSource === 'customer_referral' && !selectedReferrer)
          }
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-on-primary sm:w-auto sm:px-xl disabled:opacity-50"
        >
          {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ العميل'}
        </button>
      </form>
    </SalesPageShell>
  )
}
