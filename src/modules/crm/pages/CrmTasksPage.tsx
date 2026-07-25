import axios from 'axios'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type {
  CrmTask,
  CrmTaskPriority,
  CrmTaskStatus,
  Employee,
  PaginatedResponse,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { ToastBanner } from '../../../components/ToastBanner'
import {
  CRM_INPUT,
  CRM_PRIMARY_BTN,
  CRM_SECONDARY_BTN,
  CrmPageShell,
} from '../components/CrmPageShell'
import { CrmChip } from '../components/ui/CrmChip'
import { CrmKanbanBoard, CrmKanbanColumn } from '../components/ui/CrmKanban'
import { CrmTaskCard } from '../components/ui/CrmTaskCard'
import { CrmToolbar } from '../components/ui/CrmToolbar'
import {
  CRM_TASK_PIPELINE_STAGES,
  CRM_TASK_PRIORITY_LABELS,
  CRM_TASK_STATUS_LABELS,
  createCrmTask,
  listCrmTasks,
  updateCrmTask,
  updateCrmTaskStatus,
  type CrmTaskPayload,
} from '../api/tasks'

type ViewMode = 'pipeline' | 'calendar'
type QuickFilter = 'all' | 'today' | 'late' | 'mine'

const inputClass = `w-full ${CRM_INPUT}`

const emptyForm = {
  title: '',
  description: '',
  employee_id: '' as number | '',
  priority: 'medium' as CrmTaskPriority,
  deadline: '',
  status: 'todo' as CrmTaskStatus,
  tags: '',
}

const STAGE_DOT: Record<CrmTaskStatus, string> = {
  todo: '#64748b',
  in_progress: '#2563eb',
  done: '#15803d',
}

function toDateKey(value?: string | null): string | null {
  if (!value) return null
  return value.slice(0, 10)
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ date: Date | null; key: string }> = []

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ date: null, key: `pad-${i}` })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day)
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ date, key })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, key: `pad-end-${cells.length}` })
  }
  return cells
}

function isOverdue(deadline?: string | null, status?: CrmTaskStatus) {
  if (!deadline || status === 'done') return false
  const d = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

function isToday(deadline?: string | null) {
  if (!deadline) return false
  const d = new Date(deadline)
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

export function CrmTasksPage() {
  const queryClient = useQueryClient()
  const dragId = useRef<number | null>(null)
  const [employeeFilter, setEmployeeFilter] = useState<number | ''>('')
  const [defaultApplied, setDefaultApplied] = useState(false)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline')
  const [toast, setToast] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<CrmTask | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [optimistic, setOptimistic] = useState<Record<number, CrmTaskStatus>>({})
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const meEmployeeQuery = useQuery({
    queryKey: ['me-employee'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Employee>('/me/employee')
        return data
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null
        }
        throw err
      }
    },
  })

  useEffect(() => {
    if (defaultApplied || meEmployeeQuery.isLoading) return
    setDefaultApplied(true)
  }, [defaultApplied, meEmployeeQuery.isLoading])

  const employeesQuery = useQuery({
    queryKey: ['employees', 'crm-tasks'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data
    },
  })

  const tasksQuery = useQuery({
    queryKey: ['crm-tasks', employeeFilter],
    enabled: defaultApplied,
    queryFn: () =>
      listCrmTasks({
        employee_id: employeeFilter,
        bucket: 'all',
        per_page: 200,
      }),
  })

  const invalidate = () => {
    setOptimistic({})
    queryClient.invalidateQueries({ queryKey: ['crm-tasks'] })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CrmTaskPayload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        employee_id: form.employee_id === '' ? null : Number(form.employee_id),
        priority: form.priority,
        deadline: form.deadline || null,
        status: form.status,
        tags: form.tags
          .split(/[,،]/)
          .map((t) => t.trim())
          .filter(Boolean),
      }
      if (editingTask) {
        return updateCrmTask(editingTask.id, payload)
      }
      return createCrmTask(payload)
    },
    onSuccess: () => {
      invalidate()
      setPanelOpen(false)
      setEditingTask(null)
      setForm(emptyForm)
      setToast(editingTask ? 'تم تحديث المهمة' : 'تم إنشاء المهمة')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: CrmTaskStatus }) =>
      updateCrmTaskStatus(id, status),
    onSuccess: (_data, vars) => {
      setOptimistic((prev) => {
        const next = { ...prev }
        delete next[vars.id]
        return next
      })
      invalidate()
      setToast('تم تحديث الحالة')
    },
    onError: (err, vars) => {
      setOptimistic((prev) => {
        const next = { ...prev }
        delete next[vars.id]
        return next
      })
      setToast(getErrorMessage(err))
    },
  })

  const employees = employeesQuery.data ?? []
  const myEmployeeId = meEmployeeQuery.data?.id

  const tasks = useMemo(() => {
    const raw = tasksQuery.data?.data ?? []
    return raw.map((t) => (optimistic[t.id] ? { ...t, status: optimistic[t.id] } : t))
  }, [tasksQuery.data, optimistic])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (quickFilter === 'today') return isToday(task.deadline)
      if (quickFilter === 'late') return isOverdue(task.deadline, task.status)
      if (quickFilter === 'mine') return myEmployeeId != null && task.employee_id === myEmployeeId
      return true
    })
  }, [tasks, quickFilter, myEmployeeId])

  const tasksByStatus = (status: CrmTaskStatus) =>
    filteredTasks.filter((task) => task.status === status)

  const calendarCells = useMemo(
    () => buildMonthCells(calendarCursor.year, calendarCursor.month),
    [calendarCursor.year, calendarCursor.month],
  )

  const tasksByDeadline = useMemo(() => {
    const map = new Map<string, CrmTask[]>()
    for (const task of filteredTasks) {
      const key = toDateKey(task.deadline)
      if (!key) continue
      const list = map.get(key) ?? []
      list.push(task)
      map.set(key, list)
    }
    return map
  }, [filteredTasks])

  const monthLabel = new Intl.DateTimeFormat('ar', { month: 'long', year: 'numeric' }).format(
    new Date(calendarCursor.year, calendarCursor.month, 1),
  )

  const openCreate = () => {
    setEditingTask(null)
    setForm({
      ...emptyForm,
      employee_id: employeeFilter === '' ? '' : employeeFilter,
    })
    setPanelOpen(true)
  }

  const openEdit = (task: CrmTask) => {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description ?? '',
      employee_id: task.employee_id ?? '',
      priority: task.priority,
      deadline: toDateKey(task.deadline) ?? '',
      status: task.status,
      tags: (task.tags ?? []).join(', '),
    })
    setPanelOpen(true)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    saveMutation.mutate()
  }

  const handleDrop = (status: CrmTaskStatus) => {
    const id = dragId.current
    dragId.current = null
    if (id == null) return
    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === status) return
    setOptimistic((prev) => ({ ...prev, [id]: status }))
    statusMutation.mutate({ id, status })
  }

  const shiftMonth = (delta: number) => {
    setCalendarCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  return (
    <CrmPageShell
      kicker="العمل اليومي"
      title="المهام"
      subtitle="مهام فريق المبيعات مرتبة حسب الحالة والأولوية."
      actions={
        <>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'pipeline' ? 'calendar' : 'pipeline')}
            className={CRM_SECONDARY_BTN}
          >
            <Icon name={viewMode === 'pipeline' ? 'calendar_month' : 'view_column'} size={16} />
            {viewMode === 'pipeline' ? 'التقويم' : 'الأنابيب'}
          </button>
          <button type="button" onClick={openCreate} className={CRM_PRIMARY_BTN}>
            <Icon name="add" size={18} />
            + مهمة جديدة
          </button>
        </>
      }
    >
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <CrmToolbar
        hint="اسحب المهمة لتغيير حالتها"
        end={
          <>
            <CrmChip
              label="كل الموظفين"
              active={quickFilter === 'all' && employeeFilter === ''}
              onClick={() => {
                setQuickFilter('all')
                setEmployeeFilter('')
              }}
            />
            <CrmChip
              label="مهام اليوم"
              active={quickFilter === 'today'}
              onClick={() => setQuickFilter('today')}
            />
            <CrmChip
              label="المتأخرة"
              active={quickFilter === 'late'}
              onClick={() => setQuickFilter('late')}
            />
            <CrmChip
              label="مهامي"
              active={quickFilter === 'mine'}
              onClick={() => setQuickFilter('mine')}
            />
            <select
              value={employeeFilter}
              onChange={(e) => {
                setEmployeeFilter(e.target.value ? Number(e.target.value) : '')
                setQuickFilter('all')
              }}
              className={CRM_INPUT}
              aria-label="تصفية بالموظف"
            >
              <option value="">موظف محدد…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </>
        }
      />

      <AsyncState
        isLoading={!defaultApplied || tasksQuery.isLoading}
        isError={tasksQuery.isError}
        error={tasksQuery.error}
      >
        {viewMode === 'pipeline' ? (
          <CrmKanbanBoard columns={3}>
            {CRM_TASK_PIPELINE_STAGES.map((stage) => {
              const columnTasks = tasksByStatus(stage.key)
              return (
                <CrmKanbanColumn
                  key={stage.key}
                  title={stage.label}
                  count={columnTasks.length}
                  dotColor={STAGE_DOT[stage.key]}
                  minHeight={380}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleDrop(stage.key)
                  }}
                >
                  {columnTasks.map((task) => (
                    <CrmTaskCard
                      key={task.id}
                      task={task}
                      done={task.status === 'done'}
                      onClick={() => openEdit(task)}
                      onDragStart={() => {
                        dragId.current = task.id
                      }}
                    />
                  ))}
                  {columnTasks.length === 0 ? (
                    <p className="py-8 text-center text-xs" style={{ color: 'var(--crm-text-faint)' }}>
                      لا توجد مهام
                    </p>
                  ) : null}
                </CrmKanbanColumn>
              )
            })}
          </CrmKanbanBoard>
        ) : (
          <div
            className="p-3.5"
            style={{
              background: 'var(--crm-surface)',
              border: '1px solid var(--crm-border)',
              borderRadius: 'var(--crm-radius-md)',
              boxShadow: 'var(--crm-shadow)',
            }}
          >
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <button type="button" onClick={() => shiftMonth(-1)} className={CRM_SECONDARY_BTN}>
                السابق
              </button>
              <h3 className="text-sm font-bold">{monthLabel}</h3>
              <button type="button" onClick={() => shiftMonth(1)} className={CRM_SECONDARY_BTN}>
                التالي
              </button>
            </div>
            <div
              className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium"
              style={{ color: 'var(--crm-text-muted)' }}
            >
              {['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell) => {
                const dayTasks = cell.date ? (tasksByDeadline.get(cell.key) ?? []) : []
                return (
                  <div
                    key={cell.key}
                    className="min-h-[88px] p-1"
                    style={{
                      borderRadius: 'var(--crm-radius-sm)',
                      border: cell.date ? '1px solid var(--crm-border)' : 'none',
                      background: cell.date ? 'var(--crm-surface)' : 'transparent',
                    }}
                  >
                    {cell.date && (
                      <>
                        <p className="text-xs font-bold">{cell.date.getDate()}</p>
                        <ul className="mt-1 space-y-0.5">
                          {dayTasks.slice(0, 3).map((task) => (
                            <li key={task.id}>
                              <button
                                type="button"
                                onClick={() => openEdit(task)}
                                className="w-full truncate rounded px-1 py-0.5 text-start text-[10px]"
                                style={{
                                  background: 'var(--crm-primary-soft)',
                                  color: 'var(--crm-primary)',
                                }}
                                title={task.title}
                              >
                                {task.title}
                              </button>
                            </li>
                          ))}
                          {dayTasks.length > 3 && (
                            <li className="text-[10px]" style={{ color: 'var(--crm-text-faint)' }}>
                              +{dayTasks.length - 3}
                            </li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </AsyncState>

      <Modal
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false)
          setEditingTask(null)
        }}
        title={editingTask ? 'تعديل مهمة' : 'مهمة جديدة'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="crm-scope space-y-3">
          <input
            required
            placeholder="العنوان"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
          />
          <textarea
            placeholder="الوصف"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
            rows={3}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={form.employee_id}
              onChange={(e) =>
                setForm({ ...form, employee_id: e.target.value ? Number(e.target.value) : '' })
              }
              className={inputClass}
            >
              <option value="">بدون إسناد</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as CrmTaskPriority })}
              className={inputClass}
            >
              {(Object.keys(CRM_TASK_PRIORITY_LABELS) as CrmTaskPriority[]).map((priority) => (
                <option key={priority} value={priority}>
                  {CRM_TASK_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className={inputClass}
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as CrmTaskStatus })}
              className={inputClass}
            >
              {(Object.keys(CRM_TASK_STATUS_LABELS) as CrmTaskStatus[]).map((status) => (
                <option key={status} value={status}>
                  {CRM_TASK_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <input
            placeholder="الوسوم (مثال: call, follow-up)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className={inputClass}
          />
          {saveMutation.error && (
            <p className="text-sm" style={{ color: 'var(--crm-danger)' }}>
              {getErrorMessage(saveMutation.error)}
            </p>
          )}
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className={`${CRM_PRIMARY_BTN} disabled:opacity-60`}
          >
            {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
          </button>
        </form>
      </Modal>
    </CrmPageShell>
  )
}
