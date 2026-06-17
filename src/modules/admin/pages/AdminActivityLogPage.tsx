import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { ActivityLogEntry, AdminUser, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { KpiCard } from '../../../components/KpiCard'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import {
  ACTION_LABELS,
  getActionLabel,
  inferActivityAction,
  translateActivityDescription,
  translateEvent,
  translateLogName,
  type ActivityAction,
} from '../lib/activityLogLabels'
import { computeActivityLogInsights, exportActivityLogCsv } from '../lib/activityLogInsights'

const inputClass = 'rounded-lg border border-outline-variant px-sm py-2 text-sm'

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
}

const ACTION_STYLES: Record<ActivityAction, string> = {
  create: 'bg-secondary/10 text-secondary',
  update: 'bg-primary/10 text-primary',
  delete: 'bg-error/10 text-error',
  login: 'bg-tertiary/10 text-tertiary',
  other: 'bg-surface-container text-on-surface-variant',
}

interface Filters {
  search: string
  logName: string
  action: string
  causerId: string
  from: string
  to: string
}

const emptyFilters: Filters = {
  search: '',
  logName: '',
  action: '',
  causerId: '',
  from: '',
  to: '',
}

export function AdminActivityLogPage() {
  const [draft, setDraft] = useState<Filters>(emptyFilters)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [selected, setSelected] = useState<ActivityLogEntry | null>(null)

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', 'activity-log-filter'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AdminUser>>('/admin/users', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const query = useQuery({
    queryKey: ['admin', 'activity-log', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (filters.search) params.search = filters.search
      if (filters.logName) params.log_name = filters.logName
      if (filters.causerId) params.causer_id = filters.causerId
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      const { data } = await api.get<PaginatedResponse<ActivityLogEntry>>('/admin/activity-log', { params })
      return data
    },
  })

  const entries = useMemo(() => {
    const rows = query.data?.data ?? []
    if (!filters.action) return rows
    return rows.filter(
      (row) => inferActivityAction(row.description, row.event) === filters.action,
    )
  }, [query.data?.data, filters.action])

  const insights = useMemo(
    () => computeActivityLogInsights(entries, query.data?.total),
    [entries, query.data?.total],
  )

  const applyFilters = () => setFilters({ ...draft })
  const resetFilters = () => {
    setDraft(emptyFilters)
    setFilters(emptyFilters)
  }

  const exportCsv = () => {
    const csv = exportActivityLogCsv(entries)
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="سجل التدقيق"
        subtitle="تتبع التغييرات والعمليات الإدارية"
        actions={
          <button
            type="button"
            onClick={exportCsv}
            disabled={entries.length === 0}
            className="flex items-center gap-xs rounded-lg bg-secondary px-md py-sm text-sm font-bold text-on-secondary disabled:opacity-50"
          >
            <Icon name="download" size={18} />
            تصدير CSV
          </button>
        }
      />

      <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="إجمالي السجلات" value={insights.total} icon="history" />
        <KpiCard label="اليوم" value={insights.todayCount} icon="today" />
        <KpiCard label="آخر 7 أيام" value={insights.weekCount} icon="date_range" />
        <KpiCard label="مستخدمون نشطون" value={insights.uniqueUsers} icon="group" />
      </div>

      <div className="mb-md grid grid-cols-1 gap-md lg:grid-cols-2">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <h3 className="mb-sm text-sm font-bold text-on-surface">حسب نوع العملية</h3>
          <div className="flex flex-wrap gap-sm">
            {(Object.keys(ACTION_LABELS) as ActivityAction[]).map((action) => {
              const count = insights.byAction[action]
              if (count === 0) return null
              return (
                <div
                  key={action}
                  className={`rounded-lg px-sm py-xs text-sm font-medium ${ACTION_STYLES[action]}`}
                >
                  {ACTION_LABELS[action]}: {count}
                </div>
              )
            })}
            {Object.values(insights.byAction).every((c) => c === 0) && (
              <p className="text-sm text-on-surface-variant">لا توجد بيانات</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <h3 className="mb-sm text-sm font-bold text-on-surface">أكثر المستخدمين نشاطاً</h3>
          <div className="flex flex-col gap-xs">
            {insights.topUsers.map((user) => (
              <div
                key={user.name}
                className="flex items-center justify-between rounded-lg bg-surface-container-low px-sm py-xs text-sm"
              >
                <span className="text-on-surface">{user.name}</span>
                <span className="tabular-nums font-medium text-primary">{user.count}</span>
              </div>
            ))}
            {insights.topUsers.length === 0 && (
              <p className="text-sm text-on-surface-variant">لا توجد بيانات</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <div className="mb-sm grid grid-cols-1 gap-sm md:grid-cols-2 xl:grid-cols-6">
          <input
            placeholder="بحث في الوصف..."
            value={draft.search}
            onChange={(e) => setDraft((f) => ({ ...f, search: e.target.value }))}
            className={inputClass}
          />
          <select
            value={draft.logName}
            onChange={(e) => setDraft((f) => ({ ...f, logName: e.target.value }))}
            className={inputClass}
          >
            <option value="">كل الأنواع</option>
            <option value="admin">إدارة</option>
            <option value="default">افتراضي</option>
          </select>
          <select
            value={draft.action}
            onChange={(e) => setDraft((f) => ({ ...f, action: e.target.value }))}
            className={inputClass}
          >
            <option value="">كل العمليات</option>
            {(Object.keys(ACTION_LABELS) as ActivityAction[]).map((action) => (
              <option key={action} value={action}>
                {ACTION_LABELS[action]}
              </option>
            ))}
          </select>
          <select
            value={draft.causerId}
            onChange={(e) => setDraft((f) => ({ ...f, causerId: e.target.value }))}
            className={inputClass}
          >
            <option value="">كل المستخدمين</option>
            {(usersQuery.data ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={draft.from}
            onChange={(e) => setDraft((f) => ({ ...f, from: e.target.value }))}
            className={inputClass}
            title="من تاريخ"
          />
          <input
            type="date"
            value={draft.to}
            onChange={(e) => setDraft((f) => ({ ...f, to: e.target.value }))}
            className={inputClass}
            title="إلى تاريخ"
          />
        </div>
        <div className="flex flex-wrap gap-sm">
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-lg bg-primary px-md py-xs text-sm font-bold text-on-primary"
          >
            تطبيق
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-outline-variant px-md py-xs text-sm text-on-surface-variant hover:bg-surface-container-high"
          >
            إعادة تعيين
          </button>
        </div>
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<ActivityLogEntry & Record<string, unknown>>
          data={entries as (ActivityLogEntry & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          emptyMessage="لا توجد سجلات مطابقة"
          columns={[
            { key: 'id', header: '#', render: (row) => row.id },
            { key: 'created_at', header: 'التاريخ', render: (row) => formatDateTime(row.created_at) },
            { key: 'causer', header: 'بواسطة', render: (row) => row.causer?.name ?? '—' },
            {
              key: 'action',
              header: 'العملية',
              render: (row) => {
                const action = inferActivityAction(String(row.description), row.event as string | null)
                return (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_STYLES[action]}`}
                  >
                    {getActionLabel(String(row.description), row.event as string | null)}
                  </span>
                )
              },
            },
            {
              key: 'description',
              header: 'الوصف',
              render: (row) => translateActivityDescription(String(row.description ?? '')),
            },
            {
              key: 'log_name',
              header: 'النوع',
              render: (row) => translateLogName(row.log_name as string | null),
            },
            {
              key: 'details',
              header: '',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => setSelected(row as ActivityLogEntry)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                  aria-label="تفاصيل"
                >
                  <Icon name="info" size={18} />
                </button>
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title="تفاصيل السجل" size="lg">
        {selected && (
          <div className="space-y-sm text-sm">
            <div className="grid grid-cols-2 gap-sm">
              <div>
                <p className="text-on-surface-variant">التاريخ</p>
                <p className="font-medium">{formatDateTime(selected.created_at)}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">المستخدم</p>
                <p className="font-medium">{selected.causer?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">العملية</p>
                <p className="font-medium">{getActionLabel(selected.description, selected.event)}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">النوع</p>
                <p className="font-medium">{translateLogName(selected.log_name)}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">الحدث</p>
                <p className="font-medium">{translateEvent(selected.event)}</p>
              </div>
              <div>
                <p className="text-on-surface-variant">الكيان</p>
                <p className="font-medium">{selected.subject_type ?? '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-on-surface-variant">الوصف</p>
              <p className="font-medium">{translateActivityDescription(selected.description)}</p>
            </div>
            {selected.properties && Object.keys(selected.properties).length > 0 && (
              <div>
                <p className="mb-xs text-on-surface-variant">البيانات الإضافية</p>
                <pre className="overflow-x-auto rounded-lg bg-surface-container-low p-sm text-xs" dir="ltr">
                  {JSON.stringify(selected.properties, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
