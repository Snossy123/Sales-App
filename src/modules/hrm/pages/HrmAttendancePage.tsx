import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Employee, HrmAttendance, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { FilterBar } from '../../../components/FilterBar'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'
import { formatDate } from '../../../lib/accounting'

type AttendanceRow = HrmAttendance & Record<string, unknown>

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

function formatTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

function attendanceSource(row: HrmAttendance): string {
  const note = row.clock_in_note ?? ''
  if (note.startsWith('zk')) return 'بصمة ZK'
  return 'يدوي'
}

function toDatetimeLocal(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value: string): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

export function HrmAttendancePage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('')
  const [successToast, setSuccessToast] = useState('')
  const [actionError, setActionError] = useState('')
  const [editRow, setEditRow] = useState<HrmAttendance | null>(null)
  const [editForm, setEditForm] = useState({ clock_in_time: '', clock_out_time: '' })
  const [editError, setEditError] = useState('')

  const employeesQuery = useQuery({
    queryKey: ['employees', 'hrm-attendance'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data
    },
  })

  const query = useQuery({
    queryKey: ['hrm', 'attendance', statusFilter, employeeFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 50,
        include: 'employee,shift',
      }
      if (statusFilter) params['filter[status]'] = statusFilter
      if (employeeFilter) params['filter[employee_id]'] = employeeFilter

      const { data } = await api.get<PaginatedResponse<HrmAttendance>>('/hrm/attendance', { params })
      return data.data
    },
  })

  const selectedOpenSession = useMemo(() => {
    if (!selectedEmployeeId) return null
    return (query.data ?? []).find(
      (row) =>
        row.employee_id === selectedEmployeeId &&
        row.clock_in_time &&
        !row.clock_out_time,
    )
  }, [query.data, selectedEmployeeId])

  const clockMutation = useMutation({
    mutationFn: async ({
      type,
      employeeId,
    }: {
      type: 'clock_in' | 'clock_out'
      employeeId: number
    }) => {
      const { data } = await api.post<HrmAttendance>('/hrm/clock-in-out', {
        type,
        employee_id: employeeId,
      })
      return data
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] })
      setActionError('')
      setSuccessToast(type === 'clock_in' ? 'تم تسجيل الحضور' : 'تم تسجيل الانصراف')
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  })

  const clockOutRowMutation = useMutation({
    mutationFn: async (row: HrmAttendance) => {
      const { data } = await api.post<HrmAttendance>('/hrm/clock-in-out', {
        type: 'clock_out',
        employee_id: row.employee_id,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] })
      setActionError('')
      setSuccessToast('تم تسجيل الانصراف')
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editRow) throw new Error('No row selected')
      const { data } = await api.put<HrmAttendance>(`/hrm/attendance/${editRow.id}`, {
        clock_in_time: fromDatetimeLocal(editForm.clock_in_time) ?? null,
        clock_out_time: editForm.clock_out_time
          ? fromDatetimeLocal(editForm.clock_out_time)
          : null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm'] })
      setEditRow(null)
      setEditError('')
      setActionError('')
      setSuccessToast('تم تحديث سجل الحضور')
    },
    onError: (err) => setEditError(getErrorMessage(err)),
  })

  const openEdit = (row: HrmAttendance) => {
    setEditRow(row)
    setEditError('')
    setEditForm({
      clock_in_time: toDatetimeLocal(row.clock_in_time),
      clock_out_time: toDatetimeLocal(row.clock_out_time),
    })
  }

  const rows = query.data ?? []
  const employees = employeesQuery.data ?? []

  return (
    <div>
      <PageHeader
        title="الحضور والانصراف"
        subtitle="تسجيل حضور/انصراف الموظفين أو تعديل السجلات يدوياً"
      />

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      {actionError && (
        <div className="mb-md rounded-lg border border-error/30 bg-error/5 px-md py-sm text-sm text-error">
          {actionError}
          {actionError.includes('الوردية') && (
            <span className="mt-xs block text-on-surface-variant">
              يمكنك استخدام «تعديل» من الجدول لتعيين وقت الخروج يدوياً.
            </span>
          )}
        </div>
      )}

      <div className="mb-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
        <p className="mb-sm text-sm font-medium text-on-surface">تسجيل حضور / انصراف</p>
        <div className="flex flex-wrap items-end gap-sm">
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="mb-xs block text-on-surface-variant">الموظف</span>
            <select
              value={selectedEmployeeId}
              onChange={(e) =>
                setSelectedEmployeeId(e.target.value ? Number(e.target.value) : '')
              }
              className={inputClass}
            >
              <option value="">اختر موظفاً</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={
              clockMutation.isPending ||
              !selectedEmployeeId ||
              Boolean(selectedOpenSession)
            }
            onClick={() =>
              clockMutation.mutate({
                type: 'clock_in',
                employeeId: Number(selectedEmployeeId),
              })
            }
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary disabled:opacity-50"
          >
            <Icon name="login" size={18} />
            تسجيل حضور
          </button>
          <button
            type="button"
            disabled={
              clockMutation.isPending ||
              !selectedEmployeeId ||
              !selectedOpenSession
            }
            onClick={() =>
              clockMutation.mutate({
                type: 'clock_out',
                employeeId: Number(selectedEmployeeId),
              })
            }
            className="flex items-center gap-xs rounded-lg bg-secondary px-md py-sm text-sm font-bold text-on-secondary disabled:opacity-50"
          >
            <Icon name="logout" size={18} />
            تسجيل انصراف
          </button>
        </div>
        {selectedOpenSession && (
          <p className="mt-sm text-xs text-secondary">
            {selectedOpenSession.employee?.name ?? 'الموظف'} — جلسة مفتوحة منذ{' '}
            {formatTime(selectedOpenSession.clock_in_time)}
          </p>
        )}
        <p className="mt-sm text-xs text-on-surface-variant">
          مع أجهزة البصمة ZK: البصمة الثانية في اليوم تُسجَّل كانصراف تلقائياً بعد المزامنة من{' '}
          <strong>أجهزة البصمة</strong>.
        </p>
      </div>

      <FilterBar
        selects={[
          {
            id: 'employee',
            label: 'الموظف',
            value: employeeFilter,
            onChange: setEmployeeFilter,
            options: [
              { value: '', label: 'الكل' },
              ...employees.map((emp) => ({
                value: String(emp.id),
                label: emp.name,
              })),
            ],
          },
          {
            id: 'status',
            label: 'الحالة',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: '', label: 'الكل' },
              { value: 'present', label: 'حاضر' },
              { value: 'absent', label: 'غائب' },
              { value: 'late', label: 'متأخر' },
            ],
          },
        ]}
        showClear={Boolean(statusFilter || employeeFilter)}
        onClear={() => {
          setStatusFilter('')
          setEmployeeFilter('')
        }}
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<AttendanceRow>
          data={rows as AttendanceRow[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          emptyMessage="لا توجد سجلات حضور"
          columns={[
            {
              key: 'date',
              header: 'التاريخ',
              render: (row) => formatDate(row.date),
            },
            {
              key: 'source',
              header: 'المصدر',
              render: (row) => attendanceSource(row),
            },
            {
              key: 'employee',
              header: 'الموظف',
              render: (row) => row.employee?.name ?? '—',
            },
            {
              key: 'shift',
              header: 'الوردية',
              render: (row) => row.shift?.name ?? '—',
            },
            {
              key: 'clock_in_time',
              header: 'دخول',
              render: (row) => formatTime(row.clock_in_time),
            },
            {
              key: 'clock_out_time',
              header: 'خروج',
              render: (row) => formatTime(row.clock_out_time),
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge
                  status={String(row.status ?? 'default')}
                  label={
                    row.status === 'present'
                      ? 'حاضر'
                      : row.status === 'absent'
                        ? 'غائب'
                        : row.status === 'late'
                          ? 'متأخر'
                          : String(row.status ?? '—')
                  }
                />
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="flex flex-wrap gap-sm">
                  {row.clock_in_time && !row.clock_out_time && (
                    <button
                      type="button"
                      onClick={() => clockOutRowMutation.mutate(row)}
                      disabled={clockOutRowMutation.isPending}
                      className="text-xs text-secondary hover:underline"
                    >
                      انصراف
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="text-xs text-primary hover:underline"
                  >
                    تعديل
                  </button>
                </div>
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal
        open={editRow !== null}
        onClose={() => {
          setEditRow(null)
          setEditError('')
        }}
        title={`تعديل حضور — ${editRow?.employee?.name ?? ''}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setEditError('')
            updateMutation.mutate()
          }}
          className="grid gap-sm"
        >
          {editError && (
            <div className="rounded-lg border border-error/30 bg-error/5 px-sm py-xs text-sm text-error">
              {editError}
            </div>
          )}
          <label className="text-sm">
            <span className="mb-xs block text-on-surface-variant">وقت الدخول</span>
            <input
              type="datetime-local"
              value={editForm.clock_in_time}
              onChange={(e) => setEditForm({ ...editForm, clock_in_time: e.target.value })}
              className={inputClass}
              dir="ltr"
            />
          </label>
          <label className="text-sm">
            <span className="mb-xs block text-on-surface-variant">وقت الخروج</span>
            <input
              type="datetime-local"
              value={editForm.clock_out_time}
              onChange={(e) => setEditForm({ ...editForm, clock_out_time: e.target.value })}
              className={inputClass}
              dir="ltr"
            />
          </label>
          <p className="text-xs text-on-surface-variant">
            التعديل اليدوي يتجاوز قيد «انتهاء الوردية» ويُستخدم لإغلاق السجلات المفتوحة.
          </p>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-lg bg-secondary py-2 text-sm font-bold text-on-secondary"
          >
            حفظ
          </button>
        </form>
      </Modal>
    </div>
  )
}
