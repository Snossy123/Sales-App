import { api } from '../../api/client'
import type { PaginatedResponse, SupportTask, SupportTaskStatus } from '../../api/types'

export interface SupportTaskFilters {
  status?: SupportTaskStatus | ''
  employee_id?: number | ''
  customer_id?: number | ''
  task_type?: string | ''
  per_page?: number
}

export async function listSupportTasks(filters: SupportTaskFilters = {}) {
  const params: Record<string, string | number> = {
    per_page: filters.per_page ?? 50,
    include: 'employee,customer,salesInvoice,salesInvoiceLine',
  }
  if (filters.status) params['filter[status]'] = filters.status
  if (filters.employee_id) params['filter[employee_id]'] = filters.employee_id
  if (filters.customer_id) params['filter[customer_id]'] = filters.customer_id
  if (filters.task_type) params['filter[task_type]'] = filters.task_type

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
  payload?: {
    customerReceived?: boolean
    items?: Array<{ product_unit_id: number; customer_received: boolean }>
  },
) {
  const body: {
    status: SupportTaskStatus
    executed_at?: string
    customer_received?: boolean
    items?: Array<{ product_unit_id: number; customer_received: boolean }>
  } = { status }
  if (status === 'completed' && executedAt) {
    body.executed_at = executedAt
  }
  if (status === 'completed' && payload?.items) {
    body.items = payload.items
  } else if (status === 'completed' && payload?.customerReceived !== undefined) {
    body.customer_received = payload.customerReceived
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

export function isInstallationTask(task?: { task_type?: string | null } | null): boolean {
  return !task?.task_type || task.task_type === 'installation'
}

export function installationDevicesFromTask(task?: SupportTask | null) {
  if (!task) return []
  const lines = task.sales_invoice?.lines ?? []
  const seen = new Set<number>()
  const devices: Array<{ productUnitId: number; label: string }> = []

  const pushLine = (line?: SupportTask['sales_invoice_line']) => {
    const unitId = line?.product_unit_id
    if (!unitId || seen.has(unitId)) return
    seen.add(unitId)
    const serial = line.serial_number?.trim() || line.product_unit?.serial_number?.trim()
    const model = line.product_unit?.product_model?.name_ar || line.product_unit?.product_model?.name
    devices.push({
      productUnitId: unitId,
      label: [serial || `جهاز #${unitId}`, model].filter(Boolean).join(' — '),
    })
  }

  pushLine(task.sales_invoice_line)
  for (const line of lines) {
    const isInstall = line.service?.category === 'installation'
    const isDevice = !line.service_id && Boolean(line.product_unit_id)
    if (isInstall || isDevice || line.id === task.sales_invoice_line_id) {
      pushLine(line)
    }
  }

  return devices
}
