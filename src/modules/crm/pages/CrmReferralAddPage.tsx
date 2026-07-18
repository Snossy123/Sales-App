import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { ReferralLead, ReferralReferrerOption } from '../../../api/types'
import { DateTimeInput12h } from '../../../components/DateTimeInput12h'
import { Icon } from '../../../components/Icon'
import { SearchableSelect } from '../../../components/SearchableSelect'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'

type ReferrerOption = ReferralReferrerOption & { optionKey: string }

type ReferralEntry = {
  key: string
  phone: string
  name: string
  follow_up_at: string
  notes: string
}

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2'

function createEmptyEntry(): ReferralEntry {
  return {
    key: crypto.randomUUID(),
    phone: '',
    name: '',
    follow_up_at: '',
    notes: '',
  }
}

export function CrmReferralAddPage() {
  const navigate = useNavigate()
  const [referrerSearch, setReferrerSearch] = useState('')
  const [selectedReferrer, setSelectedReferrer] = useState<ReferrerOption | null>(null)
  const [entries, setEntries] = useState<ReferralEntry[]>([createEmptyEntry()])
  const [error, setError] = useState('')

  const debouncedReferrerSearch = useDebouncedValue(referrerSearch, 300)
  const searchTerm = debouncedReferrerSearch.trim()

  const referrersQuery = useQuery({
    queryKey: ['referral-leads', 'referrer-search', searchTerm],
    queryFn: async () => {
      const { data } = await api.get<{ data: ReferralReferrerOption[] }>(
        '/crm/referral-leads/referrer-search',
        {
          params: {
            q: searchTerm || undefined,
            limit: 20,
          },
        },
      )
      return data.data.map((option) => ({
        ...option,
        optionKey: `${option.kind}-${option.id}`,
      }))
    },
  })

  const updateEntry = (key: string, patch: Partial<ReferralEntry>) => {
    setEntries((prev) => prev.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)))
  }

  const addEntry = () => {
    setEntries((prev) => [...prev, createEmptyEntry()])
  }

  const removeEntry = (key: string) => {
    setEntries((prev) => (prev.length <= 1 ? prev : prev.filter((entry) => entry.key !== key)))
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReferrer) {
        throw new Error('يجب اختيار مصدر الإحالة')
      }

      const validEntries = entries.filter((entry) => entry.phone.trim())
      if (validEntries.length === 0) {
        throw new Error('يجب إدخال رقم هاتف واحد على الأقل')
      }

      const referrerPayload =
        selectedReferrer.kind === 'customer'
          ? { referred_by_customer_id: selectedReferrer.customer.id }
          : { referred_by_referral_lead_id: selectedReferrer.referral_lead.id }

      for (const entry of validEntries) {
        await api.post<ReferralLead>('/crm/referral-leads', {
          phone: entry.phone.trim(),
          name: entry.name.trim() || null,
          notes: entry.notes.trim() || null,
          follow_up_at: entry.follow_up_at || null,
          ...referrerPayload,
        })
      }
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
      subtitle="تسجيل أرقام ترشيح جديدة مع ربطها بمصدر الإحالة"
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
          <SearchableSelect
            label="مصدر الإحالة *"
            options={referrersQuery.data ?? []}
            value={selectedReferrer}
            onChange={setSelectedReferrer}
            onSearchChange={setReferrerSearch}
            getOptionValue={(option) => option.optionKey}
            getOptionLabel={(option) => option.label}
            placeholder="ابحث عن عميل أو ترشيح..."
            loading={referrersQuery.isLoading}
            emptyMessage="لا يوجد عميل أو ترشيح مطابق"
          />
        </section>

        <section className="space-y-sm">
          <div className="flex items-center justify-between gap-sm">
            <h3 className="text-sm font-bold text-on-surface">بيانات الترشيح</h3>
            <button
              type="button"
              onClick={addEntry}
              className="inline-flex items-center gap-xs rounded-lg border border-outline-variant px-sm py-1.5 text-sm font-medium text-primary hover:bg-surface-container"
            >
              <Icon name="add" size={18} />
              إضافة شخص
            </button>
          </div>

          {entries.map((entry, index) => (
            <div
              key={entry.key}
              className="space-y-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
            >
              <div className="flex items-center justify-between gap-sm">
                <p className="text-sm font-medium text-on-surface-variant">شخص {index + 1}</p>
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.key)}
                    className="inline-flex items-center gap-xs text-sm text-error hover:underline"
                  >
                    <Icon name="delete" size={16} />
                    حذف
                  </button>
                )}
              </div>
              <input
                placeholder="رقم الهاتف *"
                value={entry.phone}
                onChange={(e) => updateEntry(entry.key, { phone: e.target.value })}
                required={index === 0}
                className={inputClass}
                dir="ltr"
              />
              <input
                placeholder="الاسم (اختياري)"
                value={entry.name}
                onChange={(e) => updateEntry(entry.key, { name: e.target.value })}
                className={inputClass}
              />
              <div>
                <label className="mb-xs block text-sm text-on-surface-variant">
                  موعد المتابعة الأولى (اختياري)
                </label>
                <DateTimeInput12h
                  value={entry.follow_up_at}
                  onChange={(value) => updateEntry(entry.key, { follow_up_at: value })}
                />
              </div>
              <textarea
                placeholder="ملاحظات"
                value={entry.notes}
                onChange={(e) => updateEntry(entry.key, { notes: e.target.value })}
                rows={3}
                className={inputClass}
              />
            </div>
          ))}
        </section>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="flex items-center gap-xs rounded-lg bg-secondary px-md py-sm text-sm font-bold text-on-secondary"
        >
          <Icon name="save" size={18} />
          {entries.filter((e) => e.phone.trim()).length > 1 ? 'حفظ الترشيحات' : 'حفظ الترشيح'}
        </button>
      </form>
    </SalesPageShell>
  )
}
