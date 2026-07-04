import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '../../../api/client'
import type { ServiceEvaluationQuestion } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { formatDate } from '../../../lib/accounting'
import {
  EVALUATION_STATUS_LABELS,
  formatEvaluationAnswer,
  getEvaluationRequest,
  linkEvaluationCall,
  listLinkableCalls,
  recordEvaluation,
} from '../api'

type AnswerState = Record<number, { answer_text?: string; answer_rating?: number }>

export function EvaluationRecordPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const requestId = Number(id)

  const [overallRating, setOverallRating] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [answers, setAnswers] = useState<AnswerState>({})
  const [selectedCallId, setSelectedCallId] = useState<number | ''>('')

  const query = useQuery({
    queryKey: ['review', 'evaluation-request', requestId],
    queryFn: () => getEvaluationRequest(requestId),
    enabled: Number.isFinite(requestId),
  })

  const request = query.data?.data
  const activeQuestions = query.data?.active_questions ?? []
  const isPending = request?.status === 'pending'

  const linkableCallsQuery = useQuery({
    queryKey: ['review', 'linkable-calls', requestId],
    queryFn: () => listLinkableCalls(requestId),
    enabled: Number.isFinite(requestId) && isPending,
  })

  useEffect(() => {
    if (request?.call_log?.id) {
      setSelectedCallId(request.call_log.id)
    }
  }, [request?.call_log?.id])

  useEffect(() => {
    if (!request) return
    setOverallRating(request.overall_rating ?? '')
    setNotes(request.notes ?? '')
    const initial: AnswerState = {}
    for (const answer of request.answers ?? []) {
      initial[answer.service_evaluation_question_id] = {
        answer_text: answer.answer_text ?? undefined,
        answer_rating: answer.answer_rating ?? undefined,
      }
    }
    setAnswers(initial)
  }, [request])

  const recordMutation = useMutation({
    mutationFn: (status: 'completed' | 'unreachable') =>
      recordEvaluation(requestId, {
        status,
        overall_rating: overallRating === '' ? undefined : Number(overallRating),
        notes: notes || undefined,
        answers: Object.entries(answers).map(([questionId, value]) => ({
          question_id: Number(questionId),
          answer_text: value.answer_text,
          answer_rating: value.answer_rating,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', 'evaluation-requests'] })
      queryClient.invalidateQueries({ queryKey: ['review', 'evaluation-request', requestId] })
      if (request?.customer_id) {
        queryClient.invalidateQueries({
          queryKey: ['customer', request.customer_id, 'evaluations'],
        })
      }
      navigate('/review/evaluation-queue')
    },
  })

  const linkCallMutation = useMutation({
    mutationFn: () => linkEvaluationCall(requestId, Number(selectedCallId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', 'evaluation-request', requestId] })
    },
  })

  const patchAnswer = (questionId: number, patch: Partial<AnswerState[number]>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...patch },
    }))
  }

  const renderQuestionInput = (question: ServiceEvaluationQuestion) => {
    const value = answers[question.id] ?? {}

    if (question.answer_type === 'rating') {
      return (
        <select
          value={value.answer_rating ?? ''}
          onChange={(e) =>
            patchAnswer(question.id, {
              answer_rating: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          disabled={!isPending}
          className="w-full max-w-xs rounded-lg border border-outline-variant px-sm py-2 text-sm"
        >
          <option value="">—</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      )
    }

    if (question.answer_type === 'yes_no') {
      return (
        <select
          value={value.answer_text ?? ''}
          onChange={(e) => patchAnswer(question.id, { answer_text: e.target.value || undefined })}
          disabled={!isPending}
          className="w-full max-w-xs rounded-lg border border-outline-variant px-sm py-2 text-sm"
        >
          <option value="">—</option>
          <option value="yes">نعم</option>
          <option value="no">لا</option>
        </select>
      )
    }

    return (
      <textarea
        value={value.answer_text ?? ''}
        onChange={(e) => patchAnswer(question.id, { answer_text: e.target.value })}
        disabled={!isPending}
        rows={2}
        className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="تسجيل تقييم العميل"
        subtitle={request?.customer_name ?? ''}
        actions={
          <Link to="/review/evaluation-queue" className="text-sm text-primary hover:underline">
            ← العودة للقائمة
          </Link>
        }
      />

      {recordMutation.isError && (
        <p className="mb-sm text-sm text-error">{getErrorMessage(recordMutation.error)}</p>
      )}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {request && (
          <div className="grid gap-md lg:grid-cols-3">
            <div className="space-y-md lg:col-span-1">
              <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                <h2 className="mb-sm text-sm font-semibold text-on-surface-variant">بيانات العميل</h2>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-on-surface-variant">العميل</dt>
                    <dd className="font-medium">{request.customer_name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-on-surface-variant">الهاتف</dt>
                    <dd className="font-medium tabular-nums">{request.customer_phone ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-on-surface-variant">العقد</dt>
                    <dd className="font-medium">{request.invoice_number ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-on-surface-variant">تاريخ التنفيذ</dt>
                    <dd className="font-medium">
                      {request.executed_at ? formatDate(request.executed_at) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-on-surface-variant">الفني</dt>
                    <dd className="font-medium">{request.technician_name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-on-surface-variant">الحالة</dt>
                    <dd>
                      <StatusBadge status={request.status} label={EVALUATION_STATUS_LABELS[request.status]} />
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            <div className="space-y-md lg:col-span-2">
              <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                <h2 className="mb-md text-sm font-semibold">ربط المكالمة</h2>
                {request.call_log ? (
                  <div className="mb-md space-y-1 text-sm">
                    <p>
                      مرتبطة بمكالمة: {request.call_log.mobile_name ?? request.call_log.mobile_number ?? `#${request.call_log.id}`}
                      {request.call_log.duration != null ? ` · ${request.call_log.duration} ث` : ''}
                    </p>
                    {request.call_log.audio_url && (
                      <audio controls src={request.call_log.audio_url} className="w-full max-w-md" />
                    )}
                  </div>
                ) : (
                  <p className="mb-md text-sm text-on-surface-variant">لم تُربط مكالمة بعد.</p>
                )}
                {isPending && (
                  <div className="flex flex-wrap items-end gap-sm">
                    <div className="min-w-[200px] flex-1">
                      <label className="mb-1 block text-xs text-on-surface-variant">اختر من سجل المكالمات</label>
                      <select
                        value={selectedCallId}
                        onChange={(e) => setSelectedCallId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
                      >
                        <option value="">—</option>
                        {(linkableCallsQuery.data ?? []).map((call) => (
                          <option key={call.id} value={call.id}>
                            {call.mobile_name ?? call.mobile_number ?? `#${call.id}`}
                            {call.start_time ? ` · ${call.start_time.slice(0, 10)}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={!selectedCallId || linkCallMutation.isPending}
                      onClick={() => linkCallMutation.mutate()}
                      className="rounded-lg border border-outline-variant px-md py-2 text-sm hover:bg-surface-container disabled:opacity-50"
                    >
                      ربط المكالمة
                    </button>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                <h2 className="mb-md text-sm font-semibold">أسئلة التقييم</h2>

                {(isPending ? activeQuestions : (request.answers ?? []).map((a) => ({
                  id: a.service_evaluation_question_id,
                  question_ar: a.question_ar ?? '',
                  answer_type: a.answer_type ?? 'text',
                }))).length === 0 ? (
                  <p className="text-sm text-on-surface-variant">لا توجد أسئلة نشطة.</p>
                ) : (
                  <div className="space-y-md">
                    {(isPending
                      ? activeQuestions
                      : (request.answers ?? []).map((a) => ({
                          id: a.service_evaluation_question_id,
                          question_ar: a.question_ar ?? '',
                          answer_type: a.answer_type ?? 'text',
                        }))
                    ).map((question) => (
                      <div key={question.id}>
                        <label className="mb-1 block text-sm font-medium">{question.question_ar}</label>
                        {isPending ? (
                          renderQuestionInput(question as ServiceEvaluationQuestion)
                        ) : (
                          <p className="text-sm text-on-surface">
                            {formatEvaluationAnswer({
                              service_evaluation_question_id: question.id,
                              answer_type: question.answer_type as ServiceEvaluationQuestion['answer_type'],
                              answer_text: answers[question.id]?.answer_text ?? null,
                              answer_rating: answers[question.id]?.answer_rating ?? null,
                            })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-md space-y-md border-t border-outline-variant/60 pt-md">
                  <div>
                    <label className="mb-1 block text-sm font-medium">التقييم العام (1–5)</label>
                    {isPending ? (
                      <select
                        value={overallRating}
                        onChange={(e) =>
                          setOverallRating(e.target.value ? Number(e.target.value) : '')
                        }
                        className="w-full max-w-xs rounded-lg border border-outline-variant px-sm py-2 text-sm"
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm">{request.overall_rating ?? '—'}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">ملاحظات</label>
                    {isPending ? (
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{request.notes?.trim() || '—'}</p>
                    )}
                  </div>
                </div>

                {isPending && (
                  <div className="mt-md flex flex-wrap gap-sm">
                    <button
                      type="button"
                      onClick={() => recordMutation.mutate('completed')}
                      disabled={recordMutation.isPending}
                      className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary"
                    >
                      تم التسجيل
                    </button>
                    <button
                      type="button"
                      onClick={() => recordMutation.mutate('unreachable')}
                      disabled={recordMutation.isPending}
                      className="rounded-lg border border-outline-variant px-md py-2 text-sm hover:bg-surface-container"
                    >
                      تعذّر الوصول
                    </button>
                  </div>
                )}

                {!isPending && request.recorded_by_name && (
                  <p className="mt-md text-xs text-on-surface-variant">
                    سجّله: {request.recorded_by_name}
                    {request.completed_at ? ` · ${formatDate(request.completed_at)}` : ''}
                  </p>
                )}
              </section>
            </div>
          </div>
        )}
      </AsyncState>
    </div>
  )
}
