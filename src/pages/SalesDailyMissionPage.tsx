import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { DailyMissionCard, DailyMissionResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'

type MissionBucketKey = 'calls' | 'viewings' | 'ready_to_contract' | 'overdue' | 'vip'

const BUCKETS: {
  key: MissionBucketKey
  title: string
  empty: string
  accent: string
  badge: string
  icon: string
}[] = [
  {
    key: 'calls',
    title: 'لازم تتكلم معاهم',
    empty: 'لا مكالمات مطلوبة اليوم',
    accent: 'border-error/40 bg-error/5',
    badge: 'bg-error text-on-error',
    icon: 'call',
  },
  {
    key: 'viewings',
    title: 'معاينات',
    empty: 'لا معاينات اليوم',
    accent: 'border-[#ef9900]/40 bg-[#ef9900]/5',
    badge: 'bg-[#ef9900] text-white',
    icon: 'visibility',
  },
  {
    key: 'ready_to_contract',
    title: 'جاهزين للتعاقد',
    empty: 'لا تعاقدات بانتظار التأكيد',
    accent: 'border-secondary/40 bg-secondary/5',
    badge: 'bg-secondary text-on-secondary',
    icon: 'handshake',
  },
  {
    key: 'overdue',
    title: 'متأخر (≥ يومين)',
    empty: 'لا متابعات متأخرة',
    accent: 'border-on-surface/40 bg-on-surface/5',
    badge: 'bg-on-surface text-surface',
    icon: 'schedule',
  },
  {
    key: 'vip',
    title: 'أولوية VIP',
    empty: 'لا عملاء VIP مسندين إليك',
    accent: 'border-primary/40 bg-primary/5',
    badge: 'bg-primary text-on-primary',
    icon: 'star',
  },
]

function MissionCard({ card }: { card: DailyMissionCard }) {
  return (
    <Link
      to={`/customers/${card.customer_id}`}
      className="block rounded-xl border border-outline-variant bg-surface-container-lowest p-md transition hover:border-primary/40 hover:bg-surface-container"
    >
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="truncate font-semibold text-on-surface">{card.customer_name}</p>
          <p className="mt-0.5 text-sm tabular-nums text-on-surface-variant">{card.customer_phone}</p>
        </div>
        <Icon name="chevron_left" size={20} className="shrink-0 text-on-surface-variant" />
      </div>
      {card.subtitle && (
        <p className="mt-sm text-xs text-on-surface-variant">{card.subtitle}</p>
      )}
    </Link>
  )
}

export function SalesDailyMissionPage() {
  const query = useQuery({
    queryKey: ['sales', 'daily-mission'],
    queryFn: async () => {
      const { data } = await api.get<DailyMissionResponse>('/sales/daily-mission')
      return data
    },
  })

  const mission = query.data
  const total =
    (mission?.counts.calls ?? 0) +
    (mission?.counts.viewings ?? 0) +
    (mission?.counts.ready_to_contract ?? 0) +
    (mission?.counts.overdue ?? 0) +
    (mission?.counts.vip ?? 0)

  return (
    <div>
      <PageHeader
        title="مهمة اليوم"
        subtitle={
          mission
            ? `Today's Mission · ${total} مهمة · ${mission.date}`
            : "Today's Mission — قائمة عمل موظف المبيعات"
        }
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {mission && (
          <div className="space-y-lg">
            {BUCKETS.map((bucket) => {
              const cards = mission[bucket.key]
              const count = mission.counts[bucket.key]

              return (
                <section
                  key={bucket.key}
                  className={`rounded-2xl border p-md ${bucket.accent}`}
                >
                  <div className="mb-md flex flex-wrap items-center gap-sm">
                    <span
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-bold ${bucket.badge}`}
                    >
                      {count}
                    </span>
                    <Icon name={bucket.icon} size={22} className="text-on-surface" />
                    <h2 className="text-lg font-bold text-on-surface">{bucket.title}</h2>
                  </div>

                  {cards.length === 0 ? (
                    <p className="rounded-lg bg-surface-container-lowest/70 px-md py-lg text-center text-sm text-on-surface-variant">
                      {bucket.empty}
                    </p>
                  ) : (
                    <div className="grid gap-sm sm:grid-cols-2 xl:grid-cols-3">
                      {cards.map((card) => (
                        <MissionCard
                          key={`${bucket.key}-${card.customer_id}-${card.meta?.schedule_id ?? card.meta?.sales_invoice_id ?? 'x'}`}
                          card={card}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </AsyncState>
    </div>
  )
}
