import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Customer, PaginatedResponse, ReferralLead } from '../../../api/types'
import { DateTimeInput12h } from '../../../components/DateTimeInput12h'
import { Icon } from '../../../components/Icon'
import { SearchableSelect } from '../../../components/SearchableSelect'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { referrerLabel } from '../lib/referralLeads'

type ReferrerMode = 'customer' | 'referral_lead'

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2'

export function CrmReferralAddPage() {
  const navigate = useNavigate()
  const [referrerMode, setReferrerMode] = useState<ReferrerMode>('customer')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedReferralLead, setSelectedReferralLead] = useState<ReferralLead | null>(null)
  const [form, setForm] = useState({
    phone: '',
    name: '',
    follow_up_at: '',
    notes: '',
  })
  const [error, setError] = useState('')

  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300)

  const customersQuery = useQuery({
    queryKey: ['customers', 'referral-add', debouncedCustomerSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 20 }
      if (debouncedCustomerSearch.trim()) {
        params['filter[name]'] = debouncedCustomerSearch.trim()
      }
      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params })
      return data.data
    },
    enabled: referrerMode === 'customer',
  })

  const notInterestedQuery = useQuery({
    queryKey: ['referral-leads', 'not-interested'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ReferralLead>>('/crm/referral-leads', {
        params: {
          per_page: 100,
          'filter[status]': 'not_interested',
          include: 'referredByCustomer',
        },
      })
      return data.data
    },
    enabled: referrerMode === 'referral_lead',
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        phone: form.phone.trim(),
        name: form.name.trim() || null,
        notes: form.notes.trim() || null,
        follow_up_at: form.follow_up_at || null,
      }

      if (referrerMode === 'customer') {
        if (!selectedCustomer) throw new Error('يجب اختيار العميل المُحيل')
        payload.referred_by_customer_id = selectedCustomer.id
      } else {
        if (!selectedReferralLead) throw new Error('يجب اختيار ترشيح سابق')
        payload.referred_by_referral_lead_id = selectedReferralLead.id
      }

      const { data } = await api.post<ReferralLead>('/crm/referral-leads', payload)
      return data
    },
    onSuccess: () => navigate('/crm/referrals'),
    onError: (err) => setError(getErrorMessage(err)),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate()
  }

  return (
    <SalesPageShell
      title="إضافة ترشيح"
      subtitle="تسجيل رقم ترشيح جديد مع ربطه بمصدر الإحالة"
      actions={
        <Link
          to="/crm/referrals"
          className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface hover:bg-surface-container"
        >
          <Icon name="arrow_forward" size={18} />
          العودة للترشيحات
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-md">
        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
          <h3 className="mb-sm text-sm font-bold text-on-surface">مصدر الترشيح</h3>
          <div className="mb-md flex w-fit gap-1 rounded-lg border border-outline-variant p-0.5 text-sm">
            <button
              type="button"
              onClick={() => {
                setReferrerMode('customer')
                setSelectedReferralLead(null)
              }}
              className={`rounded px-md py-1.5 font-medium ${
                referrerMode === 'customer'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant'
              }`}
            >
              عميل مسجّل
            </button>
            <button
              type="button"
              onClick={() => {
                setReferrerMode('referral_lead')
                setSelectedCustomer(null)
                setCustomerSearch('')
              }}
              className={`rounded px-md py-1.5 font-medium ${
                referrerMode === 'referral_lead'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant'
              }`}
            >
              ترشيح سابق (غير مهتم)
            </button>
          </div>

          {referrerMode === 'customer' && (
            <SearchableSelect
              label="العميل المُحيل *"
              options={customersQuery.data ?? []}
              value={selectedCustomer}
              onChange={setSelectedCustomer}
              onSearchChange={setCustomerSearch}
              getOptionValue={(c) => c.id}
              getOptionLabel={(c) => `${c.name} — ${c.phone}`}
              placeholder="ابحث عن عميل..."
              loading={customersQuery.isLoading}
              emptyMessage="لا يوجد عميل مطابق"
            />
          )}

          {referrerMode === 'referral_lead' && (
            <SearchableSelect
              label="الترشيح السابق *"
              options={notInterestedQuery.data ?? []}
              value={selectedReferralLead}
              onChange={setSelectedReferralLead}
              onSearchChange={() => {}}
              getOptionValue={(l) => l.id}
              getOptionLabel={(l) => `${l.name || l.phone} — ${referrerLabel(l)}`}
              placeholder="اختر ترشيحاً غير مهتم..."
              loading={notInterestedQuery.isLoading}
              emptyMessage="لا توجد ترشيحات غير مهتمة"
            />
          )}
        </section>

        <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md space-y-sm">
          <h3 className="text-sm font-bold text-on-surface">بيانات الترشيح</h3>
          <input
            placeholder="رقم الهاتف *"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
            className={inputClass}
            dir="ltr"
          />
          <input
            placeholder="الاسم (اختياري)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
          <div>
            <label className="mb-xs block text-sm text-on-surface-variant">
              موعد المتابعة الأولى (اختياري)
            </label>
            <DateTimeInput12h
              value={form.follow_up_at}
              onChange={(value) => setForm({ ...form, follow_up_at: value })}
            />
          </div>
          <textarea
            placeholder="ملاحظات"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className={inputClass}
          />
        </section>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="flex items-center gap-xs rounded-lg bg-secondary px-md py-sm text-sm font-bold text-on-secondary"
        >
          <Icon name="save" size={18} />
          حفظ الترشيح
        </button>
      </form>
    </SalesPageShell>
  )
}
