import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { ReferralLead, ReferralReferrerOption } from '../../../api/types'
import { Icon } from '../../../components/Icon'
import { SearchableSelect } from '../../../components/SearchableSelect'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import {
  CRM_PRIMARY_BTN,
  CRM_SECONDARY_BTN,
  CrmPageShell,
} from '../components/CrmPageShell'
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
    <CrmPageShell
      narrow
      kicker="الترشيحات"
      title="إضافة ترشيح"
      subtitle="تسجيل أرقام ترشيح جديدة مع ربطها بمصدر الإحالة"
      headerExtra={
        <span
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px]"
          style={{ background: 'var(--crm-primary-soft)', color: 'var(--crm-primary)' }}
        >
          <Icon name="group" size={24} />
        </span>
      }
    >
      <section
        className="p-[18px]"
        style={{
          background: 'var(--crm-surface)',
          border: '1px solid var(--crm-border)',
          borderRadius: 'var(--crm-radius-md)',
          boxShadow: 'var(--crm-shadow)',
        }}
      >
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

      <section className="flex flex-col gap-2.5">
        <h3
          className="m-0 text-[13px] font-bold"
          style={{ color: 'var(--crm-text-secondary)' }}
        >
          بيانات الترشيح
        </h3>

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
          className="flex w-full items-center justify-center gap-2 px-3.5 py-3 text-[13px] font-semibold"
          style={{
            borderRadius: 'var(--crm-radius-md)',
            border: '1px dashed var(--crm-primary-soft-border)',
            background: 'var(--crm-primary-soft)',
            color: 'var(--crm-primary)',
          }}
        >
          <Icon name="add" size={20} />
          إضافة شخص آخر
        </button>
      </section>

      {error && (
        <p className="m-0 text-[13px]" style={{ color: 'var(--crm-danger)' }}>
          {error}
        </p>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-10 px-[18px] py-3 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        style={{
          borderTop: '1px solid var(--crm-border)',
          background: 'color-mix(in srgb, var(--crm-surface) 95%, transparent)',
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/crm/referrals')}
            disabled={pending}
            className={`${CRM_SECONDARY_BTN} disabled:opacity-60`}
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
            className={`${CRM_SECONDARY_BTN} disabled:opacity-60`}
            style={{ borderColor: 'var(--crm-primary)', color: 'var(--crm-primary)' }}
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
            className={`${CRM_PRIMARY_BTN} disabled:opacity-60`}
          >
            <Icon name="check" size={18} />
            حفظ
          </button>
        </div>
      </div>
    </CrmPageShell>
  )
}
