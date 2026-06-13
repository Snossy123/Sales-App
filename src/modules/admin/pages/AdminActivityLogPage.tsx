import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { ActivityLogEntry, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { PageHeader } from '../../../components/PageHeader'
import { AdminSubNav } from '../components/AdminSubNav'

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
}

export function AdminActivityLogPage() {
  const [search, setSearch] = useState('')
  const [logName, setLogName] = useState('')

  const query = useQuery({
    queryKey: ['admin', 'activity-log', search, logName],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 50 }
      if (search) params.search = search
      if (logName) params.log_name = logName
      const { data } = await api.get<PaginatedResponse<ActivityLogEntry>>('/admin/activity-log', { params })
      return data.data
    },
  })

  return (
    <div>
      <PageHeader title="سجل التدقيق" subtitle="تتبع التغييرات والعمليات الإدارية" />
      <AdminSubNav />

      <div className="mb-md flex flex-wrap gap-sm">
        <input
          placeholder="بحث في الوصف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-outline-variant px-sm py-2 text-sm"
        />
        <select value={logName} onChange={(e) => setLogName(e.target.value)} className="rounded-lg border border-outline-variant px-sm py-2 text-sm">
          <option value="">كل السجلات</option>
          <option value="admin">إدارة</option>
          <option value="default">افتراضي</option>
        </select>
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<ActivityLogEntry & Record<string, unknown>>
          data={(query.data ?? []) as (ActivityLogEntry & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'created_at', header: 'التاريخ', render: (row) => formatDateTime(row.created_at) },
            { key: 'description', header: 'الوصف' },
            { key: 'log_name', header: 'النوع', render: (row) => row.log_name ?? '—' },
            { key: 'causer', header: 'بواسطة', render: (row) => row.causer?.name ?? '—' },
            { key: 'event', header: 'الحدث', render: (row) => row.event ?? '—' },
          ]}
        />
      </AsyncState>
    </div>
  )
}
