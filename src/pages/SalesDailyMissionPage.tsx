import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { DailyMissionCard, DailyMissionResponse, DailyMissionRole } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { KpiCard } from '../components/KpiCard'
import { PageHeader } from '../components/PageHeader'
import { canAccessRoute } from '../lib/permissions'
import { useAuthStore } from '../stores/authStore'

type MissionBucketKey =
  | 'calls'
  | 'viewings'
  | 'ready_to_contract'
  | 'overdue'
  | 'vip'
  | 'collection_overdue'
  | 'collection_due_today'
  | 'collected_today'
  | 'review_pending'
  | 'reviewed_today'

const QUICK_ACTIONS = [
  { to: '/pos', icon: 'point_of_sale', label: 'تعاقد جديد' },
  { to: '/customers/add', icon: 'group_add', label: 'عميل جديد' },
  { to: '/inventory/branch', icon: 'inventory', label: 'مخزون الفرع' },
  { to: '/installments', icon: 'payments', label: 'تحصيل الأقساط' },
  { to: '/invoices/review', icon: 'fact_check', label: 'مراجعة التعاقدات' },
]

const BUCKETS: {
  key: MissionBucketKey
  title: string
  empty: string
  accent: string
  badge: string
  icon: string
  roles: DailyMissionRole[]
}[] = [
  {
    key: 'calls',
    title: 'لازم تتكلم معاهم',
    empty: 'لا مكالمات مطلوبة اليوم',
    accent: 'border-error/40 bg-error/5',
    badge: 'bg-error text-on-error',
    icon: 'call',
    roles: ['sales'],
  },
  {
    key: 'viewings',
    title: 'معاينات',
    empty: 'لا معاينات اليوم',
    accent: 'border-[#ef9900]/40 bg-[#ef9900]/5',
    badge: 'bg-[#ef9900] text-white',
    icon: 'visibility',
    roles: ['sales'],
  },
  {
    key: 'ready_to_contract',
    title: 'جاهزين للتعاقد',
    empty: 'لا تعاقدات بانتظار التأكيد',
    accent: 'border-secondary/40 bg-secondary/5',
    badge: 'bg-secondary text-on-secondary',
    icon: 'handshake',
    roles: ['sales'],
  },
  {
    key: 'overdue',
    title: 'متأخر (≥ يومين)',
    empty: 'لا متابعات متأخرة',
    accent: 'border-on-surface/40 bg-on-surface/5',
    badge: 'bg-on-surface text-surface',
    icon: 'schedule',
    roles: ['sales'],
  },
  {
    key: 'vip',
    title: 'أولوية VIP',
    empty: 'لا عملاء VIP مسندين إليك',
    accent: 'border-primary/40 bg-primary/5',
    badge: 'bg-primary text-on-primary',
    icon: 'star',
    roles: ['sales'],
  },
  {
    key: 'collection_overdue',
    title: 'أقساط متأخرة مسندة إليك',
    empty: 'لا أقساط متأخرة مسندة إليك',
    accent: 'border-error/40 bg-error/5',
    badge: 'bg-error text-on-error',
    icon: 'warning',
    roles: ['collector'],
  },
  {
    key: 'collection_due_today',
    title: 'مستحقة اليوم',
    empty: 'لا أقساط مستحقة اليوم',
    accent: 'border-[#ef9900]/40 bg-[#ef9900]/5',
    badge: 'bg-[#ef9900] text-white',
    icon: 'event',
    roles: ['collector'],
  },
  {
    key: 'collected_today',
    title: 'ما حصّلته اليوم',
    empty: 'لا تحصيلات مسجّلة اليوم',
    accent: 'border-secondary/40 bg-secondary/5',
    badge: 'bg-secondary text-on-secondary',
    icon: 'payments',
    roles: ['collector'],
  },
  {
    key: 'review_pending',
    title: 'بانتظار مراجعتك',
    empty: 'لا تعاقدات بانتظار المراجعة',
    accent: 'border-error/40 bg-error/5',
    badge: 'bg-error text-on-error',
    icon: 'fact_check',
    roles: ['reviewer'],
  },
  {
    key: 'reviewed_today',
    title: 'ما راجعته اليوم',
    empty: 'لم تراجع تعاقدات اليوم',
    accent: 'border-secondary/40 bg-secondary/5',
    badge: 'bg-secondary text-on-secondary',
    icon: 'task_alt',
    roles: ['reviewer'],
  },
]

const SUMMARY_CARDS: Record<
  DailyMissionRole,
  { key: string; label: string; icon: string }[]
> = {
  sales: [
    { key: 'invoices_today', label: 'تعاقداتي اليوم', icon: 'receipt_long' },
    { key: 'customers_added_today', label: 'عملاء أضفتهم اليوم', icon: 'group_add' },
    { key: 'open_followups', label: 'متابعات مفتوحة', icon: 'flag' },
  ],
  collector: [
    { key: 'collection_overdue', label: 'أقساط متأخرة', icon: 'warning' },
    { key: 'collection_due_today', label: 'مستحقة اليوم', icon: 'event' },
    { key: 'collected_today', label: 'ما حصّلته اليوم', icon: 'payments' },
  ],
  reviewer: [
    { key: 'review_pending', label: 'بانتظار المراجعة', icon: 'fact_check' },
    { key: 'reviewed_today', label: 'ما راجعته اليوم', icon: 'task_alt' },
  ],
}

function formatTodayLabel() {
  return new Intl.DateTimeFormat('ar-EG', {
    numberingSystem: 'latn',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function MissionCard({ card }: { card: DailyMissionCard }) {
  return (
    <Link
      to={card.href ?? `/customers/${card.customer_id}`}
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
  const user = useAuthStore((s) => s.user)
  const visibleActions = useMemo(
    () => QUICK_ACTIONS.filter((action) => canAccessRoute(action.to, user)),
    [user],
  )

  const query = useQuery({
    queryKey: ['sales', 'daily-mission'],
    queryFn: async () => {
      const { data } = await api.get<DailyMissionResponse>('/sales/daily-mission')
      return data
    },
  })

  const mission = query.data
  const role = mission?.role ?? 'sales'
  const todayLabel = formatTodayLabel()
  const summaryCards = SUMMARY_CARDS[role]
  const openCount = summaryCards.reduce((sum, card) => sum + (mission?.summary?.[card.key] ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="مهمة اليوم"
        subtitle={mission ? `${todayLabel} — ${openCount} بند لمتابعة شغلك اليوم` : todayLabel}
      />

      {visibleActions.length > 0 && (
        <div className="mb-md grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-5">
          {visibleActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest px-sm py-sm text-sm font-medium text-on-surface transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name={action.icon} size={20} className="no-flip" />
              </div>
              {action.label}
            </Link>
          ))}
        </div>
      )}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {mission && (
          <div className="space-y-lg">
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
              {summaryCards.map((card) => (
                <KpiCard
                  key={card.key}
                  label={card.label}
                  value={mission.summary?.[card.key] ?? 0}
                  icon={card.icon}
                  alert={(mission.summary?.[card.key] ?? 0) > 0 && card.key.includes('overdue')}
                />
              ))}
            </div>

            {BUCKETS.filter((bucket) => bucket.roles.includes(role)).map((bucket) => {
              const cards = mission[bucket.key] ?? []
              const count = mission.counts[bucket.key] ?? cards.length

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
                          key={`${bucket.key}-${card.customer_id}-${card.meta?.schedule_id ?? card.meta?.sales_invoice_id ?? card.meta?.installment_item_id ?? card.meta?.payment_transaction_id ?? 'x'}`}
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
