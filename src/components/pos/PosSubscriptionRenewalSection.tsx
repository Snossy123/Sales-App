import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { PaginatedResponse, SubscriptionRenewalCandidate } from '../../api/types'
import { formatDate } from '../../lib/accounting'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { StatusBadge } from '../StatusBadge'
import { Icon } from '../Icon'
import { PosSectionCard } from './PosSectionCard'
import { posInputClass, posLabelClass } from './posFormStyles'

export interface PosSubscriptionRenewalSectionProps {
  selectedCandidate: SubscriptionRenewalCandidate | null
  onCandidateChange: (candidate: SubscriptionRenewalCandidate | null) => void
  submitAttempted?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  overdue: 'متأخر',
  due_soon: 'مستحق قريباً',
  upcoming: 'قادم',
}

export function PosSubscriptionRenewalSection({
  selectedCandidate,
  onCandidateChange,
  submitAttempted = false,
}: PosSubscriptionRenewalSectionProps) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const candidatesQuery = useQuery({
    queryKey: ['sales-invoices', 'renewal-candidates', debouncedSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 30,
        'filter[days_ahead]': 30,
      }
      const q = debouncedSearch.trim()
      if (q) params['filter[q]'] = q
      const { data } = await api.get<PaginatedResponse<SubscriptionRenewalCandidate>>(
        '/sales-invoices/renewal-candidates',
        { params },
      )
      return data.data ?? []
    },
  })

  const sourceError = submitAttempted && !selectedCandidate
  const candidates = candidatesQuery.data ?? []

  return (
    <PosSectionCard
      number={1}
      title="التعاقد للتجديد"
      subtitle={
        selectedCandidate
          ? 'بيانات التعاقد والجهاز ثابتة من العقد المختار'
          : 'اختر تعاقداً انتهى اشتراكه أو يقترب من تاريخ التجديد'
      }
      highlighted={sourceError}
      contentClassName="space-y-md p-sm sm:p-md"
    >
      {!selectedCandidate && (
        <>
          <div>
            <label className={posLabelClass}>بحث</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={posInputClass}
              placeholder="سيريال، رقم تعاقد، اسم العميل أو الموبايل..."
            />
          </div>

          {candidatesQuery.isFetching && (
            <p className="text-sm text-on-surface-variant">جاري تحميل العقود المستحقة...</p>
          )}

          {!candidatesQuery.isFetching && candidates.length === 0 && (
            <p className="rounded-lg border border-dashed border-outline-variant px-md py-sm text-sm text-on-surface-variant">
              لا توجد عقود مستحقة أو قريبة من التجديد
              {debouncedSearch.trim() ? ' مطابقة للبحث' : ''}
            </p>
          )}

          {candidates.length > 0 && (
            <div className="space-y-sm">
              <p className="text-sm font-medium text-on-surface">اختر التعاقد:</p>
              {candidates.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onCandidateChange(item)}
                  className="flex w-full flex-col gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-start transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <span className="flex flex-wrap items-center gap-sm">
                    <span className="font-medium text-on-surface">
                      {item.invoice_number ?? `#${item.sales_invoice_id}`}
                      {item.customer_name ? ` — ${item.customer_name}` : ''}
                    </span>
                    {item.renewal_status ? (
                      <StatusBadge
                        status={item.renewal_status}
                        label={STATUS_LABELS[item.renewal_status] ?? item.renewal_status}
                      />
                    ) : null}
                  </span>
                  <span className="text-sm text-on-surface-variant">
                    {item.serial_number ? `سيريال: ${item.serial_number}` : 'بدون سيريال'}
                    {' · '}
                    تاريخ التجديد:{' '}
                    {item.subscription_renewal_date
                      ? formatDate(item.subscription_renewal_date)
                      : '—'}
                    {item.customer_phone ? ` · ${item.customer_phone}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {selectedCandidate && (
        <div className="flex flex-wrap items-start justify-between gap-sm rounded-lg border border-primary/30 bg-primary/5 px-md py-sm">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-sm">
              <p className="font-semibold text-on-surface">
                {selectedCandidate.invoice_number ?? `#${selectedCandidate.sales_invoice_id}`}
                {selectedCandidate.customer_name ? ` — ${selectedCandidate.customer_name}` : ''}
                {selectedCandidate.customer_phone ? ` — ${selectedCandidate.customer_phone}` : ''}
              </p>
              {selectedCandidate.renewal_status ? (
                <StatusBadge
                  status={selectedCandidate.renewal_status}
                  label={
                    STATUS_LABELS[selectedCandidate.renewal_status] ??
                    selectedCandidate.renewal_status
                  }
                />
              ) : null}
            </div>
            <p className="text-sm text-on-surface-variant">
              {selectedCandidate.serial_number
                ? `سيريال: ${selectedCandidate.serial_number}`
                : 'بدون سيريال'}
              {selectedCandidate.sim_number ? ` · شريحة: ${selectedCandidate.sim_number}` : ''}
              {' · '}
              تجديد سابق:{' '}
              {selectedCandidate.subscription_renewal_date
                ? formatDate(selectedCandidate.subscription_renewal_date)
                : '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onCandidateChange(null)}
            className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
          >
            <Icon name="close" size={16} />
            تغيير
          </button>
        </div>
      )}

      {sourceError && (
        <p className="text-xs text-error">يجب اختيار التعاقد المراد تجديد اشتراكه</p>
      )}
    </PosSectionCard>
  )
}
