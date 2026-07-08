import { useEffect, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { ReferralLead, ReferralLeadStatus } from '../../../api/types'
import { DateTimeInput12h } from '../../../components/DateTimeInput12h'
import { Modal } from '../../../components/Modal'
import { REFERRAL_STATUSES } from '../lib/referralLeads'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

interface ChildReferralRow {
  phone: string
  name: string
}

interface ReferralStatusModalProps {
  lead: ReferralLead | null
  onClose: () => void
  onSuccess: () => void
}

export function ReferralStatusModal({ lead, onClose, onSuccess }: ReferralStatusModalProps) {
  const [status, setStatus] = useState<ReferralLeadStatus>('no_answer')
  const [followUpAt, setFollowUpAt] = useState('')
  const [installationScheduledAt, setInstallationScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [childReferrals, setChildReferrals] = useState<ChildReferralRow[]>([{ phone: '', name: '' }])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!lead) return
    setStatus(lead.status)
    setFollowUpAt(lead.follow_up_at ?? '')
    setInstallationScheduledAt(lead.installation_scheduled_at ?? '')
    setNotes('')
    setChildReferrals([{ phone: '', name: '' }])
    setError('')
  }, [lead])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!lead) throw new Error('no lead')

      const payload: Record<string, string> = { status, notes }

      if (status === 'no_answer') {
        payload.follow_up_at = followUpAt
      }
      if (status === 'installation_scheduled') {
        payload.installation_scheduled_at = installationScheduledAt
      }

      const { data } = await api.patch<ReferralLead>(
        `/crm/referral-leads/${lead.id}/status`,
        payload,
      )

      if (status === 'not_interested') {
        const validChildren = childReferrals.filter((r) => r.phone.trim())
        if (validChildren.length > 0) {
          await api.post(`/crm/referral-leads/${lead.id}/child-referrals`, {
            referrals: validChildren.map((r) => ({
              phone: r.phone.trim(),
              name: r.name.trim() || null,
            })),
          })
        }
      }

      return data
    },
    onSuccess: () => {
      onSuccess()
      onClose()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  if (!lead) return null

  return (
    <Modal open={lead !== null} onClose={onClose} title="تغيير حالة الترشيح">
      <form onSubmit={handleSubmit} className="space-y-sm">
        <p className="text-sm text-on-surface-variant">
          {lead.name || lead.phone}
          <span className="mx-xs">·</span>
          <span dir="ltr" className="tabular-nums">
            {lead.phone}
          </span>
        </p>

        <label className="block text-sm font-medium text-on-surface">الحالة</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ReferralLeadStatus)}
          className={inputClass}
        >
          {REFERRAL_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        {status === 'no_answer' && (
          <div>
            <label className="mb-xs block text-sm font-medium text-on-surface">
              موعد إعادة الاتصال
            </label>
            <DateTimeInput12h value={followUpAt} onChange={setFollowUpAt} />
          </div>
        )}

        {status === 'installation_scheduled' && (
          <div>
            <label className="mb-xs block text-sm font-medium text-on-surface">
              تاريخ ووقت موعد التركيب
            </label>
            <DateTimeInput12h value={installationScheduledAt} onChange={setInstallationScheduledAt} />
          </div>
        )}

        {status === 'not_interested' && (
          <div className="space-y-sm rounded-lg border border-outline-variant p-sm">
            <p className="text-sm font-medium text-on-surface">أرقام ترشيح جديدة (اختياري)</p>
            {childReferrals.map((row, index) => (
              <div key={index} className="grid gap-xs sm:grid-cols-2">
                <input
                  placeholder="رقم الهاتف"
                  value={row.phone}
                  onChange={(e) => {
                    const next = [...childReferrals]
                    next[index] = { ...next[index], phone: e.target.value }
                    setChildReferrals(next)
                  }}
                  className={inputClass}
                  dir="ltr"
                />
                <input
                  placeholder="الاسم (اختياري)"
                  value={row.name}
                  onChange={(e) => {
                    const next = [...childReferrals]
                    next[index] = { ...next[index], name: e.target.value }
                    setChildReferrals(next)
                  }}
                  className={inputClass}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setChildReferrals([...childReferrals, { phone: '', name: '' }])}
              className="text-sm text-primary hover:underline"
            >
              + إضافة رقم
            </button>
          </div>
        )}

        <textarea
          placeholder="ملاحظات"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputClass}
        />

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex gap-sm">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary"
          >
            حفظ
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-outline-variant px-md py-2 text-sm"
          >
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  )
}
