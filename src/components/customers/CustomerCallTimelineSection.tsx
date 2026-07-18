import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { CrmCallLog, PaginatedResponse } from '../../api/types'
import { formatDatetime12hDisplay } from '../../lib/datetime12h'
import { userHasPermission } from '../../lib/access'
import { useAuthStore } from '../../stores/authStore'
import { AsyncState } from '../AsyncState'
import { Icon } from '../Icon'

interface CustomerCallTimelineSectionProps {
  customerId: number
}

function formatDuration(seconds?: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins <= 0) return `${secs} ث`
  return `${mins}:${String(secs).padStart(2, '0')} د`
}

export function CustomerCallTimelineSection({ customerId }: CustomerCallTimelineSectionProps) {
  const user = useAuthStore((s) => s.user)
  const canView =
    userHasPermission(user, 'crm.view_all_call_log') ||
    userHasPermission(user, 'crm.view_own_call_log')

  const query = useQuery({
    queryKey: ['customer', customerId, 'call-logs'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CrmCallLog>>('/crm/call-logs', {
        params: { customer_id: customerId, per_page: 50 },
      })
      return data.data ?? []
    },
    enabled: Boolean(customerId) && canView,
  })

  if (!canView) {
    return (
      <section id="customer-calls" className="mb-md scroll-mt-24">
        <h2 className="mb-sm text-lg font-semibold">المكالمات والتسجيلات</h2>
        <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
          لا توجد صلاحية لعرض سجل المكالمات
        </p>
      </section>
    )
  }

  const calls = query.data ?? []

  return (
    <section id="customer-calls" className="mb-md scroll-mt-24">
      <h2 className="mb-sm text-lg font-semibold">المكالمات والتسجيلات</h2>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {calls.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
            لا توجد مكالمات مسجّلة
          </p>
        ) : (
          <ol className="relative space-y-0 border-s-2 border-outline-variant/70 pe-0 ps-md">
            {calls.map((call) => (
              <li key={call.id} className="relative mb-md last:mb-0">
                <span className="absolute -start-[calc(0.5rem+5px)] top-2 h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-on-surface">
                        {call.mobile_name?.trim() || call.user?.name || 'مكالمة'}
                      </p>
                      <p className="mt-0.5 text-sm text-on-surface-variant tabular-nums">
                        {call.mobile_number ?? '—'}
                        {' · '}
                        {formatDuration(call.duration)}
                        {' · '}
                        {formatDatetime12hDisplay(call.start_time)}
                      </p>
                    </div>
                    {call.call_type && (
                      <span className="rounded-md bg-surface-container px-sm py-0.5 text-xs text-on-surface-variant">
                        {call.call_type}
                      </span>
                    )}
                  </div>

                  {call.audio_url ? (
                    <div className="mt-sm">
                      <audio controls preload="none" className="h-10 w-full max-w-md" src={call.audio_url}>
                        <track kind="captions" />
                      </audio>
                    </div>
                  ) : (
                    <p className="mt-sm flex items-center gap-1 text-xs text-on-surface-variant">
                      <Icon name="mic_off" size={14} />
                      بدون تسجيل صوتي
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </AsyncState>
    </section>
  )
}
