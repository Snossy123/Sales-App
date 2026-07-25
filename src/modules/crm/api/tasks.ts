import { api } from '../../../api/client'
import type {
  CrmTask,
  CrmTaskBucket,
  CrmTaskPriority,
  CrmTaskStatus,
  PaginatedResponse,
} from '../../../api/types'

export interface CrmTaskFilters {
  employee_id?: number | ''
  status?: CrmTaskStatus | ''
  priority?: CrmTaskPriority | ''
  bucket?: CrmTaskBucket | ''
  tag?: string
  per_page?: number
}

export interface CrmTaskPayload {
  title: string
  description?: string | null
  employee_id?: number | null
  priority?: CrmTaskPriority
  deadline?: string | null
  status?: CrmTaskStatus
  tags?: string[] | null
}

export async function listCrmTasks(filters: CrmTaskFilters = {}) {
  const params: Record<string, string | number> = {
    per_page: filters.per_page ?? 200,
    include: 'employee,creator',
  }
  if (filters.employee_id) params['filter[employee_id]'] = filters.employee_id
  if (filters.status) params['filter[status]'] = filters.status
  if (filters.priority) params['filter[priority]'] = filters.priority
  if (filters.bucket && filters.bucket !== 'all') params['filter[bucket]'] = filters.bucket
  if (filters.tag) params['filter[tag]'] = filters.tag

  const { data } = await api.get<PaginatedResponse<CrmTask>>('/crm/tasks', { params })
  return data
}

export async function createCrmTask(payload: CrmTaskPayload) {
  const { data } = await api.post<CrmTask>('/crm/tasks', payload)
  return data
}

export async function updateCrmTask(id: number, payload: Partial<CrmTaskPayload>) {
  const { data } = await api.put<CrmTask>(`/crm/tasks/${id}`, payload)
  return data
}

export async function updateCrmTaskStatus(id: number, status: CrmTaskStatus) {
  const { data } = await api.patch<CrmTask>(`/crm/tasks/${id}/status`, { status })
  return data
}

export const CRM_TASK_STATUS_LABELS: Record<CrmTaskStatus, string> = {
  todo: 'للتنفيذ',
  in_progress: 'قيد التنفيذ',
  done: 'تم',
}

export const CRM_TASK_PRIORITY_LABELS: Record<CrmTaskPriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
}

export const CRM_TASK_BUCKET_LABELS: Record<Exclude<CrmTaskBucket, 'all'>, string> = {
  today: 'مهام اليوم',
  upcoming: 'المهام القادمة',
  overdue: 'المهام المتأخرة',
  completed: 'المهام المكتملة',
}

export const CRM_TASK_PIPELINE_STAGES: {
  key: CrmTaskStatus
  label: string
  color: string
}[] = [
  { key: 'todo', label: 'للتنفيذ', color: 'bg-surface-container-high' },
  { key: 'in_progress', label: 'قيد التنفيذ', color: 'bg-primary/10' },
  { key: 'done', label: 'تم', color: 'bg-secondary/10' },
]
