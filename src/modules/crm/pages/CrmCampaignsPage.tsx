import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { CrmCampaign, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'

const CAMPAIGN_TYPES = [
  { value: 'sms', label: 'رسائل SMS' },
  { value: 'email', label: 'بريد إلكتروني' },
] as const

const emptyForm = {
  name: '',
  campaign_type: 'sms' as string,
  subject: '',
  email_body: '',
  sms_body: '',
}

export function CrmCampaignsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  const query = useQuery({
    queryKey: ['crm-campaigns'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CrmCampaign>>('/crm/campaigns', {
        params: { per_page: 50 },
      })
      return data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { data } = await api.put<CrmCampaign>(`/crm/campaigns/${editingId}`, form)
        return data
      }
      const { data } = await api.post<CrmCampaign>('/crm/campaigns', form)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-campaigns'] })
      setForm(emptyForm)
      setEditingId(null)
      setShowForm(false)
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/crm/campaigns/${id}/send`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-campaigns'] })
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  const startEdit = (campaign: CrmCampaign) => {
    setEditingId(campaign.id)
    setForm({
      name: campaign.name,
      campaign_type: campaign.campaign_type,
      subject: campaign.subject ?? '',
      email_body: campaign.email_body ?? '',
      sms_body: campaign.sms_body ?? '',
    })
    setShowForm(true)
  }

  const rows = query.data?.data ?? []

  return (
    <div>
      <PageHeader
        title="الحملات التسويقية"
        subtitle="إنشاء وإرسال حملات SMS والبريد الإلكتروني"
        actions={
          <button
            type="button"
            onClick={() => {
              setEditingId(null)
              setForm(emptyForm)
              setShowForm(!showForm)
            }}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="campaign" size={18} />
            حملة جديدة
          </button>
        }
      />

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-md grid gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md sm:grid-cols-2"
        >
          <input
            placeholder="اسم الحملة"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="rounded border border-outline-variant px-sm py-2 text-sm sm:col-span-2"
          />
          <select
            value={form.campaign_type}
            onChange={(e) => setForm({ ...form, campaign_type: e.target.value })}
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          >
            {CAMPAIGN_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {form.campaign_type === 'email' && (
            <input
              placeholder="موضوع البريد"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="rounded border border-outline-variant px-sm py-2 text-sm"
            />
          )}
          {form.campaign_type === 'email' ? (
            <textarea
              placeholder="محتوى البريد"
              value={form.email_body}
              onChange={(e) => setForm({ ...form, email_body: e.target.value })}
              rows={4}
              className="rounded border border-outline-variant px-sm py-2 text-sm sm:col-span-2"
            />
          ) : (
            <textarea
              placeholder="نص الرسالة"
              value={form.sms_body}
              onChange={(e) => setForm({ ...form, sms_body: e.target.value })}
              rows={3}
              className="rounded border border-outline-variant px-sm py-2 text-sm sm:col-span-2"
            />
          )}
          {saveMutation.isError && (
            <p className="text-sm text-error sm:col-span-2">
              {getErrorMessage(saveMutation.error)}
            </p>
          )}
          <div className="flex gap-sm sm:col-span-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary"
            >
              {editingId ? 'تحديث الحملة' : 'حفظ الحملة'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setForm(emptyForm)
              }}
              className="rounded-lg border border-outline-variant px-md py-2 text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        <DataTable<CrmCampaign & Record<string, unknown>>
          data={rows as (CrmCampaign & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          columns={[
            { key: 'name', header: 'الاسم' },
            {
              key: 'campaign_type',
              header: 'النوع',
              render: (row) =>
                CAMPAIGN_TYPES.find((t) => t.value === row.campaign_type)?.label ??
                row.campaign_type,
            },
            {
              key: 'sent_on',
              header: 'الحالة',
              render: (row) =>
                row.sent_on ? (
                  <StatusBadge status="completed" label="تم الإرسال" />
                ) : (
                  <StatusBadge status="pending" label="مسودة" />
                ),
            },
            {
              key: 'sent_on_date',
              header: 'تاريخ الإرسال',
              className: 'tabular-nums',
              render: (row) =>
                row.sent_on
                  ? new Date(row.sent_on).toLocaleDateString('ar-EG')
                  : '—',
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(row)}
                    className="text-sm text-primary hover:underline"
                  >
                    تعديل
                  </button>
                  {!row.sent_on && (
                    <button
                      type="button"
                      onClick={() => sendMutation.mutate(row.id)}
                      disabled={sendMutation.isPending}
                      className="text-sm text-secondary hover:underline"
                    >
                      إرسال
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
