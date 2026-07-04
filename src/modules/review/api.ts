import { api } from '../../api/client'
import type {
  CrmCallLog,
  PaginatedResponse,
  ServiceEvaluationAnswer,
  ServiceEvaluationQuestion,
  ServiceEvaluationRequest,
  ServiceEvaluationRequestStatus,
  SubscriptionRenewalQueueItem,
  SubscriptionRenewalStatus,
} from '../../api/types'

export const EVALUATION_STATUS_LABELS: Record<ServiceEvaluationRequestStatus, string> = {
  pending: 'بانتظار التقييم',
  completed: 'مكتمل',
  unreachable: 'تعذّر الوصول',
}

export const ANSWER_TYPE_LABELS: Record<ServiceEvaluationQuestion['answer_type'], string> = {
  text: 'نص',
  rating: 'تقييم (1–5)',
  yes_no: 'نعم / لا',
}

export async function listEvaluationQuestions() {
  const { data } = await api.get<{ data: ServiceEvaluationQuestion[] }>('/review/evaluation-questions')
  return data.data ?? []
}

export async function createEvaluationQuestion(payload: Partial<ServiceEvaluationQuestion>) {
  const { data } = await api.post<ServiceEvaluationQuestion>('/review/evaluation-questions', payload)
  return data
}

export async function updateEvaluationQuestion(id: number, payload: Partial<ServiceEvaluationQuestion>) {
  const { data } = await api.put<ServiceEvaluationQuestion>(`/review/evaluation-questions/${id}`, payload)
  return data
}

export async function deleteEvaluationQuestion(id: number) {
  await api.delete(`/review/evaluation-questions/${id}`)
}

export interface EvaluationRequestFilters {
  status?: ServiceEvaluationRequestStatus | ''
  per_page?: number
}

export async function listEvaluationRequests(filters: EvaluationRequestFilters = {}) {
  const params: Record<string, string | number> = { per_page: filters.per_page ?? 50 }
  if (filters.status) params['filter[status]'] = filters.status

  const { data } = await api.get<PaginatedResponse<ServiceEvaluationRequest>>('/review/evaluation-requests', {
    params,
  })
  return data
}

export async function getEvaluationRequest(id: number) {
  const { data } = await api.get<{
    data: ServiceEvaluationRequest
    active_questions: ServiceEvaluationQuestion[]
  }>(`/review/evaluation-requests/${id}`)
  return data
}

export async function linkEvaluationCall(id: number, crmCallLogId: number) {
  const { data } = await api.post<ServiceEvaluationRequest>(
    `/review/evaluation-requests/${id}/link-call`,
    { crm_call_log_id: crmCallLogId },
  )
  return data
}

export async function listLinkableCalls(evaluationId: number) {
  const { data } = await api.get<{ data: CrmCallLog[] }>(
    `/review/evaluation-requests/${evaluationId}/linkable-calls`,
  )
  return data.data ?? []
}

export async function recordEvaluation(
  id: number,
  payload: {
    status: 'completed' | 'unreachable'
    overall_rating?: number
    notes?: string
    answers?: Array<{
      question_id: number
      answer_text?: string
      answer_rating?: number
    }>
  },
) {
  const { data } = await api.post<ServiceEvaluationRequest>(
    `/review/evaluation-requests/${id}/record`,
    payload,
  )
  return data
}

export async function listCustomerEvaluations(customerId: number) {
  const { data } = await api.get<{ data: ServiceEvaluationRequest[] }>(
    `/customers/${customerId}/service-evaluations`,
  )
  return data.data ?? []
}

export const SUBSCRIPTION_RENEWAL_STATUS_LABELS: Record<SubscriptionRenewalStatus, string> = {
  overdue: 'متأخر',
  due_soon: 'مستحق قريباً',
  upcoming: 'قادم',
}

export interface SubscriptionRenewalFilters {
  due_status?: 'overdue' | 'upcoming' | 'all' | ''
  days_ahead?: number
  per_page?: number
}

export async function listSubscriptionRenewals(filters: SubscriptionRenewalFilters = {}) {
  const params: Record<string, string | number> = { per_page: filters.per_page ?? 50 }
  if (filters.due_status) params['filter[due_status]'] = filters.due_status
  if (filters.days_ahead != null) params['filter[days_ahead]'] = filters.days_ahead

  const { data } = await api.get<PaginatedResponse<SubscriptionRenewalQueueItem>>(
    '/review/subscription-renewals',
    { params },
  )
  return data
}

export function formatEvaluationAnswer(answer: ServiceEvaluationAnswer): string {
  if (answer.answer_type === 'rating' || answer.answer_rating != null) {
    return `${answer.answer_rating ?? '—'} / 5`
  }
  if (answer.answer_type === 'yes_no') {
    if (answer.answer_text === 'yes') return 'نعم'
    if (answer.answer_text === 'no') return 'لا'
  }
  return answer.answer_text?.trim() || '—'
}
