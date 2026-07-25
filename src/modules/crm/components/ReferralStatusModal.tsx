import { useEffect, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { ReferralLead, ReferralLeadStatus } from '../../../api/types'
import { DateTimeInput12h } from '../../../components/DateTimeInput12h'
import { Modal } from '../../../components/Modal'
import { REFERRAL_STATUSES } from '../lib/referralLeads'

const inputClass =
  'w-full rounded-[9px] border px-2.5 py-2 text-[13px] [border-color:var(--crm-border)] [background:var(--crm-surface-muted)]'

interface ChildReferralRow {
  phone: string
  name: string
}

interface ReferralStatusModalProps {
  lead: ReferralLead | null
  /** Prefill target status (e.g. from drag-and-drop) */
  initialStatus?: ReferralLeadStatus | null
  onClose: () => void
  onSuccess: () => void
}

export function ReferralStatusModal({
  lead,
  initialStatus,
  onClose,
  onSuccess,
}: ReferralStatusModalProps) {
  const [status, setStatus] = useState<ReferralLeadStatus>('no_answer')
  const [followUpAt, setFollowUpAt] = useState('')
  const [installationScheduledAt, setInstallationScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [childReferrals, setChildReferrals] = useState<ChildReferralRow[]>([{ phone: '', name: '' }])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!lead) return
    setStatus(initialStatus ?? lead.status)
    setFollowUpAt(lead.follow_up_at ?? '')
    setInstallationScheduledAt(lead.installation_scheduled_at ?? '')
    setNotes('')
    setChildReferrals([{ phone: '', name: '' }])
    setError('')
  }, [lead, initialStatus])

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
      <form onSubmit={handleSubmit} className="crm-scope space-y-3">
        <p className="text-sm" style={{ color: 'var(--crm-text-muted)' }}>
          {lead.name || lead.phone}
          <span className="mx-1">·</span>
          <span dir="ltr" className="tabular-nums">
            {lead.phone}
          </span>
        </p>

        <label className="block text-sm font-medium">الحالة</label>
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
            <label className="mb-1 block text-sm font-medium">موعد إعادة الاتصال</label>
            <DateTimeInput12h value={followUpAt} onChange={setFollowUpAt} />
          </div>
        )}

        {status === 'installation_scheduled' && (
          <div>
            <label className="mb-1 block text-sm font-medium">تاريخ ووقت موعد التركيب</label>
            <DateTimeInput12h value={installationScheduledAt} onChange={setInstallationScheduledAt} />
          </div>
        )}

        {status === 'not_interested' && (
          <div
            className="space-y-2 rounded-[13px] p-2.5"
            style={{ border: '1px solid var(--crm-border)' }}
          >
            <p className="text-sm font-medium">أرقام ترشيح جديدة (اختياري)</p>
            {childReferrals.map((row, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-2">
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
              className="text-sm font-semibold"
              style={{ color: 'var(--crm-primary)' }}
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

        {error && (
          <p className="text-sm" style={{ color: 'var(--crm-danger)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="h-[38px] rounded-[9px] px-3.5 text-[13px] font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--crm-primary)' }}
          >
            حفظ
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-[38px] rounded-[9px] border px-3.5 text-[13px]"
            style={{ borderColor: 'var(--crm-border)', color: 'var(--crm-text-secondary)' }}
          >
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  )
}
