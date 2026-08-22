import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { PageHeader } from '../../../components/PageHeader'

interface FeedbackRow {
  id: number
  page_context?: string | null
  rating?: number | null
  message: string
  status?: string
  created_at?: string
  user?: { id?: number; name?: string } | null
}

export function AdminFeedbackPage() {
  const query = useQuery({
    queryKey: ['admin', 'feedback'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<FeedbackRow>>('/admin/feedback', {
        params: { per_page: 50 },
      })
      return data.data ?? []
    },
  })

  return (
    <div>
      <PageHeader title="ملاحظات المستخدمين" subtitle="استعراض الملاحظات المرسلة من داخل النظام" />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<FeedbackRow>
          data={query.data ?? []}
          keyExtractor={(row) => row.id}
          pageSize={15}
          emptyMessage="لا توجد ملاحظات"
          columns={[
            {
              key: 'created_at',
              header: 'التاريخ',
              render: (row) =>
                row.created_at
                  ? new Date(row.created_at).toLocaleString('ar-EG', { numberingSystem: 'latn' })
                  : '—',
            },
            { key: 'user', header: 'المستخدم', render: (row) => row.user?.name ?? '—' },
            { key: 'page_context', header: 'الصفحة', render: (row) => row.page_context ?? '—' },
            {
              key: 'rating',
              header: 'التقييم',
              render: (row) => (row.rating != null ? String(row.rating) : '—'),
            },
            { key: 'message', header: 'الملاحظة' },
            { key: 'status', header: 'الحالة', render: (row) => row.status ?? '—' },
          ]}
        />
      </AsyncState>
    </div>
  )
}
