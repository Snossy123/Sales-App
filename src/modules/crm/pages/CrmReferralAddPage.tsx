import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { ReferralLead, ReferralReferrerOption } from '../../../api/types'
import { Icon } from '../../../components/Icon'
import { SearchableSelect } from '../../../components/SearchableSelect'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import {
  ReferralPersonCard,
  type ReferralEntry,
} from '../components/ReferralPersonCard'

type ReferrerOption = ReferralReferrerOption & { optionKey: string }

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
  const [entries, setEntries] = useState<ReferralEntry[]>(() => [createEmptyEntry()])
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const activeExpandedKey = expandedKey ?? entries[0]?.key ?? ''

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
    const next = createEmptyEntry()
    setEntries((prev) => [...prev, next])
    setExpandedKey(next.key)
  }

  const removeEntry = (key: string) => {
    setEntries((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((entry) => entry.key !== key)
      if (activeExpandedKey === key) {
        setExpandedKey(next[0]?.key ?? null)
      }
      return next
    })
  }

  const saveReferrals = async () => {
    if (!selectedReferrer) {
      throw new Error('يجب اختيار مصدر الترشيح')
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
  }

  const saveMutation = useMutation({
    mutationFn: saveReferrals,
    onSuccess: () => navigate('/crm/referrals'),
    onError: (err) => setError(getErrorMessage(err)),
  })

  const saveAndContinueMutation = useMutation({
    mutationFn: saveReferrals,
    onSuccess: () => {
      const fresh = createEmptyEntry()
      setEntries([fresh])
      setExpandedKey(fresh.key)
      setError('')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const pending = saveMutation.isPending || saveAndContinueMutation.isPending

  return (
    <div className="mx-auto max-w-3xl space-y-md pb-24">
      <header className="flex items-start gap-sm">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon name="group" size={24} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-on-surface sm:text-2xl">إضافة ترشيح</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            تسجيل أرقام ترشيح جديدة مع ربطها بمصدر الإحالة
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <SearchableSelect
          label="مصدر الترشيح *"
          options={referrersQuery.data ?? []}
          value={selectedReferrer}
          onChange={setSelectedReferrer}
          onSearchChange={setReferrerSearch}
          getOptionValue={(option) => option.optionKey}
          getOptionLabel={(option) => option.label}
          placeholder="اختر مصدر الترشيح أو ابحث..."
          loading={referrersQuery.isLoading}
          emptyMessage="لا يوجد عميل أو ترشيح مطابق"
        />
      </section>

      <section className="space-y-sm">
        <h3 className="text-sm font-bold text-on-surface">بيانات الترشيح</h3>

        {entries.map((entry, index) => (
          <ReferralPersonCard
            key={entry.key}
            entry={entry}
            index={index}
            expanded={activeExpandedKey === entry.key}
            canRemove={entries.length > 1}
            onToggle={() => setExpandedKey(entry.key)}
            onRemove={() => removeEntry(entry.key)}
            onChange={(patch) => updateEntry(entry.key, patch)}
          />
        ))}

        <button
          type="button"
          onClick={addEntry}
          className="flex w-full items-center justify-center gap-xs rounded-xl border border-dashed border-primary/40 bg-primary/5 px-md py-3 text-sm font-bold text-primary hover:bg-primary/10"
        >
          <Icon name="add" size={20} />
          إضافة شخص آخر
        </button>
      </section>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-outline-variant bg-surface-container-lowest/95 px-md py-sm backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-end gap-sm">
          <button
            type="button"
            onClick={() => navigate('/crm/referrals')}
            disabled={pending}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError('')
              saveAndContinueMutation.mutate()
            }}
            className="inline-flex items-center gap-xs rounded-lg border border-primary px-md py-2 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-60"
          >
            <Icon name="add" size={18} />
            حفظ ومتابعة الإضافة
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError('')
              saveMutation.mutate()
            }}
            className="inline-flex items-center gap-xs rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary disabled:opacity-60"
          >
            <Icon name="check" size={18} />
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}
