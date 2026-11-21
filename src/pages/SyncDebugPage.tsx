import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'

type SyncStatus = {
  mode: 'cloud' | 'branch'
  status?: string
  cloud_reachable?: boolean
  last_successful_sync?: string | null
  pending_operations?: number
  failed_operations?: number
  retry_attempts?: number
}

type OutboxItem = {
  id: number
  sequence: number
  module: string
  operation: string
  operation_uuid: string
  status: string
  attempts: number
  next_attempt_at?: string | null
  last_error?: string | null
  payload: Record<string, unknown>
  created_at?: string
}

type SyncFailure = {
  id: number
  module: string
  operation: string
  operation_uuid: string
  message: string
  status: string
  created_at?: string
}

type SyncCheckpoint = {
  id: number
  feed: string
  cursor: number
  last_success_at?: string | null
}

type BranchOutboxResponse = {
  mode: 'branch'
  status: SyncStatus
  items: OutboxItem[]
  failures: SyncFailure[]
  checkpoints: SyncCheckpoint[]
}

type CloudBranchInfo = {
  id: number
  organization_id: number
  branch_id: number
  branch_name: string
  last_pull_at?: string | null
  last_cursors?: Record<string, number>
}

type CloudChangeRow = {
  id: number
  feed: string
  record_id: number
  organization_id?: number | null
  branch_id?: number | null
  created_at?: string | null
}

type CloudInboxRow = {
  id: number
  operation_uuid: string
  module: string
  operation: string
  processed_at?: string | null
}

type CloudPendingResponse = {
  mode: 'cloud'
  latest_cursor: number
  branches: CloudBranchInfo[]
  selected_branch_id?: number | null
  feed_counts: Record<string, number>
  pending_changes: CloudChangeRow[]
  inbox: CloudInboxRow[]
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG')
}

export function SyncDebugPage() {
  const queryClient = useQueryClient()
  const [selectedBranchId, setSelectedBranchId] = useState<number | ''>('')
  const [feedFilter, setFeedFilter] = useState<string>('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const statusQuery = useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => (await api.get<SyncStatus>('/sync/status')).data,
  })

  const mode = statusQuery.data?.mode

  const outboxQuery = useQuery({
    queryKey: ['sync-outbox'],
    queryFn: async () => (await api.get<BranchOutboxResponse>('/sync/outbox')).data,
    enabled: mode === 'branch',
    refetchInterval: 15_000,
  })

  const cloudQuery = useQuery({
    queryKey: ['sync-cloud-pending', selectedBranchId],
    queryFn: async () =>
      (
        await api.get<CloudPendingResponse>('/sync/cloud-pending', {
          params: selectedBranchId ? { branch_id: selectedBranchId } : undefined,
        })
      ).data,
    enabled: mode === 'cloud',
    refetchInterval: 15_000,
  })

  const runSyncMutation = useMutation({
    mutationFn: async () => (await api.post('/sync/run')).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] })
      queryClient.invalidateQueries({ queryKey: ['sync-outbox'] })
    },
  })

  const retryMutation = useMutation({
    mutationFn: async (id: number) => (await api.post(`/sync/outbox/${id}/retry`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-outbox'] })
    },
  })

  if (statusQuery.isLoading) {
    return <div className="p-6 text-sm text-on-surface-variant">جاري تحميل حالة المزامنة…</div>
  }

  if (mode === 'branch') {
    const data = outboxQuery.data
    const items = data?.items ?? []
    const failures = data?.failures ?? []
    const checkpoints = data?.checkpoints ?? []

    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-on-surface">تشخيص المزامنة (جهاز الفرع)</h1>
            <p className="text-xs text-on-surface-variant">
              العمليات التي لم تُرفع للسحابة بعد وحالة نقاط التوقف المحلية
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => outboxQuery.refetch()}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs font-medium hover:bg-surface-container"
            >
              تحديث
            </button>
            <button
              type="button"
              disabled={runSyncMutation.isPending}
              onClick={() => runSyncMutation.mutate()}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:opacity-90 disabled:opacity-60"
            >
              {runSyncMutation.isPending ? 'جاري المزامنة…' : 'مزامنة الآن'}
            </button>
          </div>
        </div>

        {runSyncMutation.isError && (
          <div className="rounded-xl bg-error-container p-3 text-xs text-on-error-container">
            {getErrorMessage(runSyncMutation.error)}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <p className="text-xs text-on-surface-variant">الحالة</p>
            <p className="mt-1 text-sm font-bold">{data?.status?.status ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <p className="text-xs text-on-surface-variant">آخر مزامنة ناجحة</p>
            <p className="mt-1 text-xs font-bold">{formatDate(data?.status?.last_successful_sync)}</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <p className="text-xs text-on-surface-variant">عمليات معلّقة (لم تطلع)</p>
            <p className="mt-1 text-lg font-bold text-amber-600">{items.length}</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <p className="text-xs text-on-surface-variant">أخطاء مفتوحة</p>
            <p className="mt-1 text-lg font-bold text-error">{failures.length}</p>
          </div>
        </div>

        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest">
          <div className="border-b border-outline-variant px-4 py-3">
            <h2 className="text-sm font-bold">العمليات التي لم تُرفع للسحابة ({items.length})</h2>
          </div>
          {items.length === 0 ? (
            <p className="p-6 text-center text-xs text-on-surface-variant">
              لا توجد عمليات معلّقة — كل العمليات رُفعت للسحابة.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-surface-container text-on-surface-variant">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">الموديول</th>
                    <th className="px-3 py-2">العملية</th>
                    <th className="px-3 py-2">الحالة</th>
                    <th className="px-3 py-2">المحاولات</th>
                    <th className="px-3 py-2">المحاولة القادمة</th>
                    <th className="px-3 py-2">آخر خطأ</th>
                    <th className="px-3 py-2">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {items.map((item) => (
                    <>
                      <tr key={item.id} className="hover:bg-surface-container-low">
                        <td className="px-3 py-2 font-mono">{item.sequence}</td>
                        <td className="px-3 py-2">{item.module}</td>
                        <td className="px-3 py-2 font-medium">{item.operation}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              item.status === 'conflict'
                                ? 'bg-error-container text-on-error-container'
                                : 'bg-amber-500/15 text-amber-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">{item.attempts}</td>
                        <td className="px-3 py-2">{formatDate(item.next_attempt_at)}</td>
                        <td className="max-w-xs truncate px-3 py-2 text-error" title={item.last_error ?? ''}>
                          {item.last_error ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                              className="text-primary hover:underline"
                            >
                              {expandedId === item.id ? 'إخفاء' : 'تفاصيل'}
                            </button>
                            <button
                              type="button"
                              disabled={retryMutation.isPending}
                              onClick={() => retryMutation.mutate(item.id)}
                              className="rounded border border-outline-variant px-2 py-0.5 hover:bg-surface-container"
                            >
                              إعادة
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === item.id && (
                        <tr key={`${item.id}-payload`} className="bg-surface-container-low">
                          <td colSpan={8} className="p-3">
                            <pre className="max-h-60 overflow-auto rounded-lg bg-surface p-2 text-[11px]" dir="ltr">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest">
          <div className="border-b border-outline-variant px-4 py-3">
            <h2 className="text-sm font-bold">نقاط التوقف المحلية (Checkpoints)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-container text-on-surface-variant">
                <tr>
                  <th className="px-3 py-2">الجدول (Feed)</th>
                  <th className="px-3 py-2">آخر Cursor</th>
                  <th className="px-3 py-2">آخر تحديث</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {checkpoints.map((cp) => (
                  <tr key={cp.id}>
                    <td className="px-3 py-1.5 font-mono">{cp.feed}</td>
                    <td className="px-3 py-1.5 font-mono">{cp.cursor}</td>
                    <td className="px-3 py-1.5">{formatDate(cp.last_success_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    )
  }

  const cloud = cloudQuery.data
  const branches = cloud?.branches ?? []
  const activeBranchId = cloud?.selected_branch_id ?? (selectedBranchId || null)
  const activeBranch = branches.find((b) => b.branch_id === activeBranchId)
  const feedCounts = cloud?.feed_counts ?? {}
  const changes = (cloud?.pending_changes ?? []).filter((c) => !feedFilter || c.feed === feedFilter)
  const inbox = cloud?.inbox ?? []

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-on-surface">تشخيص المزامنة (السيرفر الأونلاين)</h1>
          <p className="text-xs text-on-surface-variant">
            التعديلات التي لم تنزل للفرع المحلي بعد بناءً على آخر Cursor سحبه الفرع
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={activeBranchId ?? ''}
            onChange={(e) => {
              setSelectedBranchId(e.target.value ? Number(e.target.value) : '')
              setFeedFilter('')
            }}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs"
          >
            {branches.length === 0 ? (
              <option value="">لا توجد فروع مسجلة</option>
            ) : (
              branches.map((b) => (
                <option key={b.id} value={b.branch_id}>
                  {b.branch_name} (#{b.branch_id})
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={() => cloudQuery.refetch()}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs font-medium hover:bg-surface-container"
          >
            تحديث
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs text-on-surface-variant">الفرع المختار</p>
          <p className="mt-1 text-sm font-bold">{activeBranch?.branch_name ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs text-on-surface-variant">آخر سحب من الفرع</p>
          <p className="mt-1 text-xs font-bold">{formatDate(activeBranch?.last_pull_at)}</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs text-on-surface-variant">آخر Change ID على السحابة</p>
          <p className="mt-1 font-mono text-sm font-bold">{cloud?.latest_cursor ?? 0}</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-xs text-on-surface-variant">تعديلات لم تنزل للفرع</p>
          <p className="mt-1 text-lg font-bold text-amber-600">{cloud?.pending_changes?.length ?? 0}</p>
        </div>
      </div>

      {Object.keys(feedCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFeedFilter('')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              feedFilter === '' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            الكل ({cloud?.pending_changes?.length ?? 0})
          </button>
          {Object.entries(feedCounts).map(([feed, count]) => (
            <button
              key={feed}
              type="button"
              onClick={() => setFeedFilter(feed)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                feedFilter === feed ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {feed} ({count})
            </button>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant px-4 py-3">
          <h2 className="text-sm font-bold">تعديلات لم تنزل للفرع المحلي ({changes.length})</h2>
        </div>
        {changes.length === 0 ? (
          <p className="p-6 text-center text-xs text-on-surface-variant">
            لا توجد تعديلات منتظرة — الفرع سحب أحدث التغييرات.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-container text-on-surface-variant">
                <tr>
                  <th className="px-3 py-2">Change ID</th>
                  <th className="px-3 py-2">الجدول (Feed)</th>
                  <th className="px-3 py-2">Record ID</th>
                  <th className="px-3 py-2">تاريخ التعديل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {changes.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low">
                    <td className="px-3 py-2 font-mono">{c.id}</td>
                    <td className="px-3 py-2 font-mono">{c.feed}</td>
                    <td className="px-3 py-2 font-mono">{c.record_id}</td>
                    <td className="px-3 py-2">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="border-b border-outline-variant px-4 py-3">
          <h2 className="text-sm font-bold">آخر العمليات المستلمة من الفرع (Inbox)</h2>
        </div>
        {inbox.length === 0 ? (
          <p className="p-6 text-center text-xs text-on-surface-variant">لا توجد عمليات مستلمة بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-container text-on-surface-variant">
                <tr>
                  <th className="px-3 py-2">الموديول</th>
                  <th className="px-3 py-2">العملية</th>
                  <th className="px-3 py-2">UUID</th>
                  <th className="px-3 py-2">وقت الاستلام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {inbox.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-1.5">{row.module}</td>
                    <td className="px-3 py-1.5 font-medium">{row.operation}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px]">{row.operation_uuid}</td>
                    <td className="px-3 py-1.5">{formatDate(row.processed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
