import { AppDateTimePicker } from '../AppDateTimePicker'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { CollectionFollowUpLog, SalesInvoice } from '../../api/types'
import {
  buildCollectionFollowUpPayload,
  collectionStatusLabels,
  collectionStatusOptions,
} from '../../lib/collectionHelpers'
import { getInstallmentItems, getInstallmentNumber } from '../../lib/customerContracts'
import { formatDatetime12hDisplay } from '../../lib/datetime12h'

interface ContractFollowUpTabProps {
  invoice: SalesInvoice
  active: boolean
}

function installmentGroupKey(log: CollectionFollowUpLog): string {
  return log.installment_item_id != null
    ? `installment:${log.installment_item_id}`
    : 'contract'
}

function installmentGroupLabel(log: CollectionFollowUpLog): string {
  if (log.installment_item_id == null) {
    return 'متابعة قديمة على مستوى العقد'
  }

  const sequence = log.installment_sequence
  return sequence != null ? `القسط #${sequence}` : 'قسط'
}

function FollowUpLogCard({ log }: { log: CollectionFollowUpLog }) {
  return (
    <li className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm">
      <div className="mb-xs flex flex-wrap items-center justify-between gap-xs text-xs text-on-surface-variant">
        <span>{formatDatetime12hDisplay(log.created_at)}</span>
        <span>{log.user_name || '—'}</span>
      </div>
      <p className="text-sm font-medium text-on-surface">
        {log.collection_status_label
          || (log.collection_status
            ? collectionStatusLabels[log.collection_status] ?? log.collection_status
            : '—')}
      </p>
      <p className="mt-xs text-xs text-on-surface-variant">
        التذكير: {formatDatetime12hDisplay(log.collection_reminder_at)}
      </p>
      {log.collection_notes ? (
        <p className="mt-xs whitespace-pre-wrap text-sm text-on-surface">{log.collection_notes}</p>
      ) : null}
    </li>
  )
}

function FollowUpForm({ invoice }: { invoice: SalesInvoice }) {
  const queryClient = useQueryClient()
  const items = getInstallmentItems(invoice)
  const [installmentId, setInstallmentId] = useState(items[0] ? String(items[0].id) : '')
  const [collectionStatus, setCollectionStatus] = useState('responded')
  const [collectionReminderAt, setCollectionReminderAt] = useState('')
  const [collectionNotes, setCollectionNotes] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = buildCollectionFollowUpPayload({
        collectionStatus,
        collectionReminderAt,
        collectionNotes,
      })
      if (!installmentId) throw new Error('اختر القسط')
      if (Object.keys(payload).length === 0) throw new Error('أضف حالة أو ميعاد تذكير أو ملاحظة')
      await api.patch(`/installments/${installmentId}/collection-metadata`, payload)
    },
    onSuccess: () => {
      setCollectionNotes('')
      setError('')
      void queryClient.invalidateQueries({ queryKey: ['collection-follow-ups', invoice.id] })
    },
    onError: (err: Error) => setError(err.message || 'تعذر حفظ المتابعة'),
  })

  if (items.length === 0) return null

  return (
    <form
      className="space-y-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <h3 className="text-sm font-semibold text-on-surface">تسجيل متابعة</h3>
      <div className="grid gap-sm sm:grid-cols-2">
        <label className="block text-xs text-on-surface-variant">
          القسط
          <select
            className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-sm text-sm text-on-surface"
            value={installmentId}
            onChange={(event) => setInstallmentId(event.target.value)}
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                قسط {getInstallmentNumber(item) || item.id}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-on-surface-variant">
          الحالة
          <select
            className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-sm text-sm text-on-surface"
            value={collectionStatus}
            onChange={(event) => setCollectionStatus(event.target.value)}
          >
            {collectionStatusOptions
              .filter((option) => option.value)
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
        </label>
        <label className="block text-xs text-on-surface-variant">
          التذكير
          <AppDateTimePicker
            className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-sm text-sm text-on-surface"
            value={collectionReminderAt}
            onChange={(event) => setCollectionReminderAt(event)}
          />
        </label>
        <label className="block text-xs text-on-surface-variant sm:col-span-2">
          ملاحظة
          <textarea
            className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-sm text-sm text-on-surface"
            rows={2}
            value={collectionNotes}
            onChange={(event) => setCollectionNotes(event.target.value)}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary disabled:opacity-60"
      >
        حفظ المتابعة
      </button>
    </form>
  )
}

export function ContractFollowUpTab({ invoice, active }: ContractFollowUpTabProps) {
  const invoiceId = invoice.id
  const query = useQuery({
    queryKey: ['collection-follow-ups', invoiceId],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectionFollowUpLog[] }>(
        `/sales-invoices/${invoiceId}/collection-follow-ups`,
      )
      return data.data
    },
    enabled: active && invoiceId > 0,
  })

  const logs = query.data ?? []

  if (query.isLoading) {
    return <p className="py-md text-center text-sm text-on-surface-variant">جاري التحميل...</p>
  }

  if (query.isError) {
    return <p className="text-sm text-error">تعذر تحميل سجل المتابعة</p>
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
        <p>لا يوجد سجل متابعة بعد</p>
        <div className="mt-md text-start">
          <FollowUpForm invoice={invoice} />
        </div>
        <Link to="/installments" className="mt-sm inline-flex font-medium text-primary hover:underline">
          تحصيل الأقساط
        </Link>
      </div>
    )
  }

  const groups: { key: string, label: string, logs: CollectionFollowUpLog[] }[] = []
  const indexByKey = new Map<string, number>()

  for (const log of logs) {
    const key = installmentGroupKey(log)
    const existing = indexByKey.get(key)
    if (existing != null) {
      groups[existing].logs.push(log)
      continue
    }
    indexByKey.set(key, groups.length)
    groups.push({ key, label: installmentGroupLabel(log), logs: [log] })
  }

  groups.sort((a, b) => {
    if (a.key === 'contract') return 1
    if (b.key === 'contract') return -1
    const aSeq = a.logs[0]?.installment_sequence ?? Number.MAX_SAFE_INTEGER
    const bSeq = b.logs[0]?.installment_sequence ?? Number.MAX_SAFE_INTEGER
    return aSeq - bSeq
  })

  return (
    <div className="space-y-md">
      <FollowUpForm invoice={invoice} />
      <Link to="/installments" className="inline-flex text-sm font-medium text-primary hover:underline">
        تحصيل الأقساط
      </Link>
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="mb-sm text-sm font-semibold text-on-surface">{group.label}</h3>
          <ul className="space-y-sm">
            {group.logs.map((log) => (
              <FollowUpLogCard key={log.id} log={log} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
