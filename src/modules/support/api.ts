import { api } from '../../api/client'
import type { PaginatedResponse, SupportTask, SupportTaskStatus } from '../../api/types'

export interface SupportTaskFilters {
  status?: SupportTaskStatus | ''
  employee_id?: number | ''
  per_page?: number
}

export async function listSupportTasks(filters: SupportTaskFilters = {}) {
  const params: Record<string, string | number> = {
    per_page: filters.per_page ?? 50,
    include: 'employee,customer,salesInvoice,salesInvoiceLine',
  }
  if (filters.status) params['filter[status]'] = filters.status
  if (filters.employee_id) params['filter[employee_id]'] = filters.employee_id

  const { data } = await api.get<PaginatedResponse<SupportTask>>('/support/tasks', { params })
  return data
}

export async function assignSupportTask(taskId: number, employeeId: number) {
  const { data } = await api.patch<SupportTask>(`/support/tasks/${taskId}/assign`, {
    employee_id: employeeId,
  })
  return data
}

export async function updateSupportTaskStatus(
  taskId: number,
  status: SupportTaskStatus,
  executedAt?: string,
) {
  const body: { status: SupportTaskStatus; executed_at?: string } = { status }
  if (status === 'completed' && executedAt) {
    body.executed_at = executedAt
  }
  const { data } = await api.patch<SupportTask>(`/support/tasks/${taskId}/status`, body)
  return data
}

export const SUPPORT_STATUS_LABELS: Record<SupportTaskStatus, string> = {
  pending: 'بانتظار التعيين',
  assigned: 'تم التعيين',
  in_progress: 'قيد التنفيذ',
  completed: 'تم التنفيذ',
  cancelled: 'ملغى',
}

/** Allowed next statuses mirror the backend SupportTask::transitions(). */
export const SUPPORT_STATUS_TRANSITIONS: Record<SupportTaskStatus, SupportTaskStatus[]> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['pending'],
}
