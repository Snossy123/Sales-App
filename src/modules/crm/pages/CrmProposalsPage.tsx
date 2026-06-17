import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { CrmProposal, CrmProposalTemplate, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'

type Tab = 'proposals' | 'templates'

const emptyProposal = { subject: '', body: '', cc: '', bcc: '' }

export function CrmProposalsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('proposals')
  const [showForm, setShowForm] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyProposal)

  const proposalsQuery = useQuery({
    queryKey: ['crm-proposals'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CrmProposal>>('/crm/proposals', {
        params: { per_page: 50, include: 'lead,customer' },
      })
      return data
    },
  })

  const templatesQuery = useQuery({
    queryKey: ['crm-proposal-templates'],
    queryFn: async () => {
      const { data } = await api.get<CrmProposalTemplate[]>('/crm/proposal-templates')
      return data
    },
  })

  const saveProposalMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CrmProposal>('/crm/proposals', form)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-proposals'] })
      setForm(emptyProposal)
      setShowForm(false)
    },
  })

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (editingTemplateId) {
        const { data } = await api.put<CrmProposalTemplate>(
          `/crm/proposal-templates/${editingTemplateId}`,
          form,
        )
        return data
      }
      const { data } = await api.post<CrmProposalTemplate>('/crm/proposal-templates', form)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-proposal-templates'] })
      setForm(emptyProposal)
      setEditingTemplateId(null)
      setShowForm(false)
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (tab === 'proposals') saveProposalMutation.mutate()
    else saveTemplateMutation.mutate()
  }

  const startEditTemplate = (template: CrmProposalTemplate) => {
    setEditingTemplateId(template.id)
    setForm({
      subject: template.subject,
      body: template.body,
      cc: template.cc ?? '',
      bcc: template.bcc ?? '',
    })
    setShowForm(true)
  }

  const applyTemplate = (template: CrmProposalTemplate) => {
    setTab('proposals')
    setForm({
      subject: template.subject,
      body: template.body,
      cc: template.cc ?? '',
      bcc: template.bcc ?? '',
    })
    setShowForm(true)
  }

  const isSaving = saveProposalMutation.isPending || saveTemplateMutation.isPending
  const saveError = saveProposalMutation.error ?? saveTemplateMutation.error

  return (
    <div>
      <PageHeader
        title="العروض والقوالب"
        subtitle="إرسال عروض للعملاء وإدارة قوالب العروض"
        actions={
          <button
            type="button"
            onClick={() => {
              setEditingTemplateId(null)
              setForm(emptyProposal)
              setShowForm(!showForm)
            }}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="description" size={18} />
            {tab === 'templates' ? 'قالب جديد' : 'عرض جديد'}
          </button>
        }
      />

      <div className="mb-md flex gap-xs border-b border-outline-variant">
        {(
          [
            { key: 'proposals', label: 'العروض المرسلة' },
            { key: 'templates', label: 'القوالب' },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key)
              setShowForm(false)
              setForm(emptyProposal)
            }}
            className={`px-md py-sm text-sm font-medium transition-colors ${
              tab === item.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-md grid gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
        >
          <input
            placeholder="الموضوع"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            required
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <div className="grid gap-sm sm:grid-cols-2">
            <input
              placeholder="نسخة CC"
              value={form.cc}
              onChange={(e) => setForm({ ...form, cc: e.target.value })}
              dir="ltr"
              className="rounded border border-outline-variant px-sm py-2 text-sm"
            />
            <input
              placeholder="نسخة BCC"
              value={form.bcc}
              onChange={(e) => setForm({ ...form, bcc: e.target.value })}
              dir="ltr"
              className="rounded border border-outline-variant px-sm py-2 text-sm"
            />
          </div>
          <textarea
            placeholder="محتوى العرض"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            required
            rows={6}
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          />
          {saveError && (
            <p className="text-sm text-error">{getErrorMessage(saveError)}</p>
          )}
          <div className="flex gap-sm">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary"
            >
              {tab === 'templates'
                ? editingTemplateId
                  ? 'تحديث القالب'
                  : 'حفظ القالب'
                : 'إرسال العرض'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingTemplateId(null)
                setForm(emptyProposal)
              }}
              className="rounded-lg border border-outline-variant px-md py-2 text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {tab === 'proposals' ? (
        <AsyncState
          isLoading={proposalsQuery.isLoading}
          isError={proposalsQuery.isError}
          error={proposalsQuery.error}
        >
          <DataTable<CrmProposal & Record<string, unknown>>
            data={(proposalsQuery.data?.data ?? []) as (CrmProposal & Record<string, unknown>)[]}
            keyExtractor={(row) => row.id}
            pageSize={10}
            columns={[
              { key: 'subject', header: 'الموضوع' },
              {
                key: 'contact',
                header: 'جهة الاتصال',
                render: (row) => row.lead?.name ?? row.customer?.name ?? '—',
              },
              {
                key: 'created_at',
                header: 'التاريخ',
                className: 'tabular-nums',
                render: (row) =>
                  row.created_at
                    ? new Date(row.created_at).toLocaleDateString('ar-EG')
                    : '—',
              },
            ]}
          />
        </AsyncState>
      ) : (
        <AsyncState
          isLoading={templatesQuery.isLoading}
          isError={templatesQuery.isError}
          error={templatesQuery.error}
        >
          <DataTable<CrmProposalTemplate & Record<string, unknown>>
            data={(templatesQuery.data ?? []) as (CrmProposalTemplate & Record<string, unknown>)[]}
            keyExtractor={(row) => row.id}
            pageSize={10}
            columns={[
              { key: 'subject', header: 'الموضوع' },
              {
                key: 'body',
                header: 'المحتوى',
                render: (row) =>
                  row.body.length > 80 ? `${row.body.slice(0, 80)}…` : row.body,
              },
              {
                key: 'actions',
                header: '',
                render: (row) => (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => applyTemplate(row)}
                      className="text-sm text-secondary hover:underline"
                    >
                      استخدام
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditTemplate(row)}
                      className="text-sm text-primary hover:underline"
                    >
                      تعديل
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </AsyncState>
      )}
    </div>
  )
}
