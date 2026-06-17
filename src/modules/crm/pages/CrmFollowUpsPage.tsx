import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { CrmSchedule, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'

const SCHEDULE_TYPES = [
  { value: 'call', label: 'مكالمة' },
  { value: 'sms', label: 'رسالة' },
  { value: 'meeting', label: 'اجتماع' },
  { value: 'email', label: 'بريد' },
] as const

const STATUS_LABELS: Record<string, string> = {
  open: 'مفتوح',
  scheduled: 'مجدول',
  completed: 'مكتمل',
  cancelled: 'ملغى',
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function CrmFollowUpsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    schedule_type: 'call' as string,
    start_datetime: '',
    description: '',
  })

  const query = useQuery({
    queryKey: ['crm-follow-ups'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CrmSchedule>>('/crm/follow-ups', {
        params: { per_page: 50, include: 'lead,customer,users' },
      })
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CrmSchedule>('/crm/follow-ups', {
        ...form,
        status: 'scheduled',
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-follow-ups'] })
      setForm({ title: '', schedule_type: 'call', start_datetime: '', description: '' })
      setShowForm(false)
    },
  })

  const handleCreate = (e: FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  const rows = query.data?.data ?? []

  return (
    <div>
      <PageHeader
        title="المتابعات"
        subtitle="جدولة ومتابعة التواصل مع العملاء المحتملين"
        actions={
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            متابعة جديدة
          </button>
        }
      />

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-md grid gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md sm:grid-cols-2"
        >
          <input
            placeholder="العنوان"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="rounded border border-outline-variant px-sm py-2 text-sm sm:col-span-2"
          />
          <select
            value={form.schedule_type}
            onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          >
            {SCHEDULE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={form.start_datetime}
            onChange={(e) => setForm({ ...form, start_datetime: e.target.value })}
            className="rounded border border-outline-variant px-sm py-2 text-sm"
            dir="ltr"
          />
          <textarea
            placeholder="الوصف"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="rounded border border-outline-variant px-sm py-2 text-sm sm:col-span-2"
          />
          {createMutation.isError && (
            <p className="text-sm text-error sm:col-span-2">
              {getErrorMessage(createMutation.error)}
            </p>
          )}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-secondary py-2 text-sm font-bold text-on-secondary sm:col-span-2"
          >
            حفظ المتابعة
          </button>
        </form>
      )}

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        <DataTable<CrmSchedule & Record<string, unknown>>
          data={rows as (CrmSchedule & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          columns={[
            { key: 'title', header: 'العنوان' },
            {
              key: 'schedule_type',
              header: 'النوع',
              render: (row) =>
                SCHEDULE_TYPES.find((t) => t.value === row.schedule_type)?.label ??
                row.schedule_type ??
                '—',
            },
            {
              key: 'contact',
              header: 'جهة الاتصال',
              render: (row) => row.lead?.name ?? row.customer?.name ?? '—',
            },
            {
              key: 'start_datetime',
              header: 'الموعد',
              className: 'tabular-nums',
              render: (row) => formatDateTime(row.start_datetime),
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge
                  status={row.status}
                  label={STATUS_LABELS[row.status] ?? row.status}
                />
              ),
            },
            {
              key: 'users',
              header: 'المسؤولون',
              render: (row) => row.users?.map((u) => u.name).join('، ') || '—',
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
