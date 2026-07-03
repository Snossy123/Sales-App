import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AsyncState } from '../AsyncState'
import { CollapsibleSection } from '../CollapsibleSection'
import { StatusBadge } from '../StatusBadge'
import { formatDate } from '../../lib/accounting'
import { userHasPermission } from '../../lib/access'
import {
  EVALUATION_STATUS_LABELS,
  formatEvaluationAnswer,
  listCustomerEvaluations,
} from '../../modules/review/api'
import { useAuthStore } from '../../stores/authStore'

interface CustomerEvaluationsSectionProps {
  customerId: number
}

export function CustomerEvaluationsSection({ customerId }: CustomerEvaluationsSectionProps) {
  const user = useAuthStore((s) => s.user)
  const canViewDetail = userHasPermission(user, 'review.view_evaluation_queue')

  const query = useQuery({
    queryKey: ['customer', customerId, 'evaluations'],
    queryFn: () => listCustomerEvaluations(customerId),
  })

  const rows = query.data ?? []

  return (
    <section className="mb-md">
      <h2 className="mb-sm text-lg font-semibold">تقييمات الخدمة</h2>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
            لا توجد تقييمات بعد
          </p>
        ) : (
          <div className="space-y-sm">
            {rows.map((row) => (
              <CollapsibleSection
                key={row.id}
                title={`${row.invoice_number ?? '—'} · ${row.executed_at ? formatDate(row.executed_at) : '—'}`}
                summary={EVALUATION_STATUS_LABELS[row.status]}
                defaultOpen={row.status === 'pending'}
              >
                <div className="space-y-md">
                  <div className="flex flex-wrap items-center gap-sm">
                    <StatusBadge status={row.status} label={EVALUATION_STATUS_LABELS[row.status]} />
                    {row.overall_rating != null && (
                      <span className="text-sm text-on-surface-variant">
                        التقييم العام: <strong>{row.overall_rating}/5</strong>
                      </span>
                    )}
                    {row.completed_at && (
                      <span className="text-sm text-on-surface-variant">
                        تاريخ التسجيل: {formatDate(row.completed_at)}
                      </span>
                    )}
                  </div>

                  {(row.answers ?? []).length > 0 && (
                    <dl className="space-y-2 text-sm">
                      {(row.answers ?? []).map((answer) => (
                        <div key={answer.service_evaluation_question_id}>
                          <dt className="text-on-surface-variant">{answer.question_ar}</dt>
                          <dd className="font-medium">{formatEvaluationAnswer(answer)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {row.notes?.trim() && (
                    <p className="text-sm text-on-surface">
                      <span className="text-on-surface-variant">ملاحظات: </span>
                      {row.notes}
                    </p>
                  )}

                  {canViewDetail && (
                    <Link
                      to={`/review/evaluation-queue/${row.id}`}
                      className="inline-block text-sm text-primary hover:underline"
                    >
                      {row.status === 'pending' ? 'تسجيل التقييم' : 'عرض التفاصيل'}
                    </Link>
                  )}
                </div>
              </CollapsibleSection>
            ))}
          </div>
        )}
      </AsyncState>
    </section>
  )
}
