import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type {
  AdminUser,
  Branch,
  Department,
  Employee,
  HrmAllowance,
  HrmAttendance,
  HrmJob,
  HrmLeave,
  HrmPayrollRecord,
  HrmUserSalesTarget,
  PaginatedResponse,
  ZkDevice,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { ProfilePhotoUploader } from '../../../components/ProfilePhotoUploader'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'
import { EmployeeAccountModeField, inferEmployeeAccountMode, type EmployeeAccountMode } from '../components/EmployeeAccountModeField'
import { EmployeeZkDeviceField } from '../components/EmployeeZkDeviceField'
import { SalesTargetFormModal } from '../components/SalesTargetFormModal'
import { SalesTargetProgressCard } from '../components/SalesTargetProgressCard'
import { branchZkDevice, zkDeviceLabel } from '../lib/zkDevice'
import { hrmLeaveTypeLabel } from '../lib/labels'

type TabId = 'attendance' | 'leaves' | 'allowances' | 'payroll' | 'sales-targets' | 'debts'

interface EmployeeDebtRow {
  id: number
  amount: number
  remaining_balance: number
  status: string
  reason?: string | null
  created_at?: string
}

interface EmployeeAllowancesResponse {
  allowances: HrmAllowance[]
  deductions: HrmAllowance[]
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'attendance', label: 'الحضور' },
  { id: 'leaves', label: 'الإجازات' },
  { id: 'allowances', label: 'البدلات' },
  { id: 'payroll', label: 'الرواتب' },
  { id: 'debts', label: 'المديونيات' },
  { id: 'sales-targets', label: 'أهداف المبيعات' },
]

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const emptyForm = {
  user_account_mode: 'none' as EmployeeAccountMode,
  linked_user_id: '' as number | '',
  zk_device_id: '' as number | '',
  zk_pin: '',
  name: '',
  phone: '',
  national_id: '',
  hire_date: '',
  hrm_job_id: '' as number | '',
  salary: '',
  branch_id: '' as number | '',
  department_id: '' as number | '',
  status: 'active',
}

function leaveDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
}

function formatTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

export function HrmEmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const employeeId = Number(id)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabId>('attendance')
  const [editOpen, setEditOpen] = useState(false)
  const [targetModalOpen, setTargetModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HrmUserSalesTarget | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState('')

  const employeeQuery = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data } = await api.get<Employee>(`/employees/${id}`, {
        params: { include: 'branch,department,job,user' },
      })
      return data
    },
    enabled: Boolean(id),
  })

  const attendanceQuery = useQuery({
    queryKey: ['hrm', 'attendance', 'employee', id],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmAttendance>>('/hrm/attendance', {
        params: { per_page: 50, 'filter[employee_id]': employeeId, include: 'shift' },
      })
      return data.data
    },
    enabled: activeTab === 'attendance' && Boolean(id),
  })

  const leavesQuery = useQuery({
    queryKey: ['hrm', 'leaves', 'employee', id],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmLeave>>('/hrm/leaves', {
        params: { per_page: 50, 'filter[employee_id]': employeeId, include: 'leaveType' },
      })
      return data.data
    },
    enabled: activeTab === 'leaves' && Boolean(id),
  })

  const allowancesQuery = useQuery({
    queryKey: ['hrm', 'allowances', 'employee', id],
    queryFn: async () => {
      const { data } = await api.get<EmployeeAllowancesResponse>(`/hrm/employees/${id}/allowances`)
      return data
    },
    enabled: activeTab === 'allowances' && Boolean(id),
  })

  const payrollQuery = useQuery({
    queryKey: ['hrm', 'payroll', 'employee', id],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmPayrollRecord>>('/hrm/payroll', {
        params: { per_page: 50, 'filter[employee_id]': employeeId },
      })
      return data.data
    },
    enabled: activeTab === 'payroll' && Boolean(id),
  })

  const debtsQuery = useQuery({
    queryKey: ['hrm', 'employee-debts', id],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<EmployeeDebtRow>>(`/hrm/employees/${id}/debts`, {
        params: { per_page: 50 },
      })
      return data.data ?? []
    },
    enabled: activeTab === 'debts' && Boolean(id),
  })

  const salesTargetsQuery = useQuery({
    queryKey: ['hrm', 'sales-targets', 'employee', id],
    queryFn: async () => {
      const { data } = await api.get<HrmUserSalesTarget[] | { data: HrmUserSalesTarget[] }>(
        `/hrm/employees/${id}/sales-targets`,
      )
      return Array.isArray(data) ? data : (data.data ?? [])
    },
    enabled: activeTab === 'sales-targets' && Boolean(id),
  })

  const targetProgressQuery = useQuery({
    queryKey: ['hrm', 'sales-targets', 'progress', id],
    queryFn: async () => {
      const { data } = await api.get<{ active_target: HrmUserSalesTarget | null }>(
        `/hrm/employees/${id}/sales-targets/progress`,
      )
      return data.active_target
    },
    enabled: Boolean(id),
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'hrm-employee-detail'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params: { per_page: 100 } })
      return data.data
    },
    enabled: editOpen,
  })

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'hrm-employee-detail'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/departments', { params: { per_page: 100 } })
      return data.data
    },
    enabled: editOpen,
  })

  const zkDevicesQuery = useQuery({
    queryKey: ['hrm', 'zk-devices', 'hrm-employee-detail'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ZkDevice>>('/hrm/zk-devices', {
        params: { per_page: 100, include: 'branch' },
      })
      return data.data
    },
  })

  const jobsQuery = useQuery({
    queryKey: ['hrm', 'jobs', 'hrm-employee-detail'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmJob>>('/hrm/jobs', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data
    },
    enabled: editOpen,
  })

  const linkableUsersQuery = useQuery({
    queryKey: ['employees', 'linkable-users', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminUser[] }>('/employees/linkable-users', {
        params: { employee_id: employeeId },
      })
      return data.data
    },
    enabled: editOpen && Boolean(id),
  })

  const leaveActionMutation = useMutation({
    mutationFn: async ({ leaveId, action }: { leaveId: number; action: 'approve' | 'reject' }) => {
      await api.post(`/hrm/leaves/${leaveId}/${action}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'leaves', 'employee', id] })
      setToast('تم تحديث حالة الإجازة')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const selectedUser = form.linked_user_id
        ? linkableUsersQuery.data?.find((user) => user.id === form.linked_user_id)
        : undefined
      const payload = {
        user_account_mode: form.user_account_mode,
        user_id: form.user_account_mode === 'link' && form.linked_user_id
          ? Number(form.linked_user_id)
          : null,
        zk_pin: form.zk_pin || undefined,
        name: selectedUser?.name ?? form.name,
        phone: form.phone || undefined,
        national_id: form.national_id || undefined,
        hire_date: form.hire_date || undefined,
        hrm_job_id: form.hrm_job_id ? Number(form.hrm_job_id) : null,
        salary: form.salary ? Number(form.salary) : undefined,
        branch_id: form.branch_id ? Number(form.branch_id) : undefined,
        department_id: form.department_id ? Number(form.department_id) : undefined,
        status: form.status,
      }
      const { data } = await api.put<Employee>(`/employees/${id}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setEditOpen(false)
      setToast('تم حفظ الموظف')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const employee = employeeQuery.data
  const zkDevices = zkDevicesQuery.data ?? []
  const branchDevice = employee ? branchZkDevice(zkDevices, employee.branch_id) : undefined

  const handleDeviceChange = (deviceId: number | '') => {
    const device = zkDevices.find((d) => d.id === deviceId)
    setForm((current) => ({
      ...current,
      zk_device_id: deviceId,
      branch_id: device?.branch_id ?? current.branch_id,
    }))
  }

  const handleBranchChange = (branchId: number | '') => {
    const device = branchZkDevice(zkDevices, branchId)
    setForm((current) => ({
      ...current,
      branch_id: branchId,
      zk_device_id: device?.id ?? '',
    }))
  }

  const handleAccountModeChange = (mode: EmployeeAccountMode) => {
    setForm((current) => ({
      ...current,
      user_account_mode: mode,
      linked_user_id: mode === 'link' ? current.linked_user_id : '',
    }))
  }

  const handleLinkedUserChange = (userId: number | '', user?: AdminUser) => {
    setForm((current) => ({
      ...current,
      linked_user_id: userId,
      name: user?.name ?? (userId ? current.name : ''),
      branch_id: user?.branch_id ?? current.branch_id,
      department_id: user?.section_id ?? current.department_id,
    }))
  }

  const openEdit = () => {
    if (!employee) return
    setForm({
      user_account_mode: inferEmployeeAccountMode(employee),
      linked_user_id: employee.user_id ?? '',
      zk_device_id: branchZkDevice(zkDevices, employee.branch_id)?.id ?? '',
      zk_pin: employee.zk_pin ?? '',
      name: employee.name,
      phone: employee.phone ?? '',
      national_id: employee.national_id ?? '',
      hire_date: employee.hire_date ?? '',
      hrm_job_id: employee.hrm_job_id ?? '',
      salary: employee.salary != null ? String(employee.salary) : '',
      branch_id: employee.branch_id ?? '',
      department_id: employee.department_id ?? '',
      status: employee.status,
    })
    setEditOpen(true)
  }

  const allowanceRows = [
    ...(allowancesQuery.data?.allowances ?? []).map((row) => ({ ...row, rowType: 'allowance' as const })),
    ...(allowancesQuery.data?.deductions ?? []).map((row) => ({ ...row, rowType: 'deduction' as const })),
  ]

  return (
    <div>
      <Link
        to="/hrm/employees"
        className="mb-md inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Icon name="arrow_forward" size={18} />
        العودة للموظفين
      </Link>

      {toast && (
        <div className="mb-md">
          <ToastBanner message={toast} onDismiss={() => setToast('')} />
        </div>
      )}

      <AsyncState
        isLoading={employeeQuery.isLoading}
        isError={employeeQuery.isError}
        error={employeeQuery.error}
      >
        {employee && (
          <>
            <section className="mb-md overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              <div className="border-b border-outline-variant/60 bg-surface-container/40 px-lg py-md">
                <div className="grid grid-cols-1 items-start gap-lg sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-sm">
                      <h1 className="text-2xl font-bold text-on-surface">{employee.name}</h1>
                      <StatusBadge status={employee.status} />
                      <button
                        type="button"
                        onClick={openEdit}
                        className="rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface hover:bg-surface-container"
                      >
                        تعديل
                      </button>
                    </div>
                    {(employee.job?.name ?? employee.job_title) && (
                      <p className="mt-sm text-lg font-medium text-on-surface">
                        {employee.job?.name ?? employee.job_title}
                      </p>
                    )}
                    {employee.job?.description?.trim() && (
                      <p className="mt-xs text-sm leading-relaxed text-on-surface-variant">
                        {employee.job.description.trim()}
                      </p>
                    )}
                  </div>
                  <ProfilePhotoUploader
                    entityType="employee"
                    entityId={employee.id}
                    name={employee.name}
                    photoUrl={employee.profile_photo_url}
                    variant="employee"
                    layout="vertical"
                    queryKeys={[['employee', id ?? ''], ['employees']]}
                  />
                </div>
              </div>

              <dl className="grid gap-md p-lg sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-sm text-on-surface-variant">الرقم القومي</dt>
                  <dd className="tabular-nums">{employee.national_id ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">تاريخ التعيين</dt>
                  <dd>{employee.hire_date ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">الهاتف</dt>
                  <dd className="tabular-nums">{employee.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">رقم البصمة</dt>
                  <dd className="tabular-nums">{employee.zk_pin ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">جهاز البصمة</dt>
                  <dd className="tabular-nums">{zkDeviceLabel(branchDevice)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">الفرع</dt>
                  <dd>{employee.branch?.name_ar ?? employee.branch?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">القسم</dt>
                  <dd>{employee.department?.name_ar ?? employee.department?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">الراتب</dt>
                  <dd className="tabular-nums">
                    {employee.salary != null ? Number(employee.salary).toLocaleString('ar-EG') : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">حساب المستخدم</dt>
                  <dd dir="ltr">{employee.user?.email ?? '—'}</dd>
                </div>
              </dl>
            </section>

            <div className="mb-md flex flex-wrap gap-xs border-b border-outline-variant">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-md py-sm text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'attendance' && (
              <AsyncState
                isLoading={attendanceQuery.isLoading}
                isError={attendanceQuery.isError}
                error={attendanceQuery.error}
              >
                <DataTable<HrmAttendance & Record<string, unknown>>
                  data={(attendanceQuery.data ?? []) as (HrmAttendance & Record<string, unknown>)[]}
                  keyExtractor={(row) => row.id}
                  pageSize={10}
                  emptyMessage="لا سجلات حضور"
                  columns={[
                    { key: 'date', header: 'التاريخ' },
                    {
                      key: 'clock_in_time',
                      header: 'دخول',
                      render: (row) => formatTime(row.clock_in_time ?? row.check_in),
                    },
                    {
                      key: 'clock_out_time',
                      header: 'خروج',
                      render: (row) => formatTime(row.clock_out_time ?? row.check_out),
                    },
                    {
                      key: 'status',
                      header: 'الحالة',
                      render: (row) => (row.status ? <StatusBadge status={row.status} /> : '—'),
                    },
                    { key: 'shift', header: 'الوردية', render: (row) => row.shift?.name ?? '—' },
                  ]}
                />
              </AsyncState>
            )}

            {activeTab === 'leaves' && (
              <AsyncState
                isLoading={leavesQuery.isLoading}
                isError={leavesQuery.isError}
                error={leavesQuery.error}
              >
                <DataTable<HrmLeave & Record<string, unknown>>
                  data={(leavesQuery.data ?? []) as (HrmLeave & Record<string, unknown>)[]}
                  keyExtractor={(row) => row.id}
                  pageSize={10}
                  emptyMessage="لا طلبات إجازة"
                  columns={[
                    { key: 'ref_no', header: 'المرجع', render: (row) => row.ref_no || `#${row.id}` },
                    { key: 'leaveType', header: 'النوع', render: (row) => hrmLeaveTypeLabel(row.leaveType) },
                    { key: 'start_date', header: 'من' },
                    { key: 'end_date', header: 'إلى' },
                    {
                      key: 'days',
                      header: 'الأيام',
                      render: (row) => leaveDays(String(row.start_date), String(row.end_date)),
                    },
                    {
                      key: 'status',
                      header: 'الحالة',
                      render: (row) => (
                        <StatusBadge
                          status={String(row.status)}
                          label={
                            row.status === 'approved'
                              ? 'معتمدة'
                              : row.status === 'rejected'
                                ? 'مرفوضة'
                                : 'معلقة'
                          }
                        />
                      ),
                    },
                    {
                      key: 'actions',
                      header: 'إجراءات',
                      render: (row) =>
                        row.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={leaveActionMutation.isPending}
                              onClick={() => leaveActionMutation.mutate({ leaveId: row.id, action: 'approve' })}
                              className="text-sm text-secondary hover:underline disabled:opacity-50"
                            >
                              اعتماد
                            </button>
                            <button
                              type="button"
                              disabled={leaveActionMutation.isPending}
                              onClick={() => leaveActionMutation.mutate({ leaveId: row.id, action: 'reject' })}
                              className="text-sm text-error hover:underline disabled:opacity-50"
                            >
                              رفض
                            </button>
                          </div>
                        ) : (
                          '—'
                        ),
                    },
                  ]}
                />
              </AsyncState>
            )}

            {activeTab === 'allowances' && (
              <AsyncState
                isLoading={allowancesQuery.isLoading}
                isError={allowancesQuery.isError}
                error={allowancesQuery.error}
              >
                <DataTable<(HrmAllowance & { rowType: 'allowance' | 'deduction' }) & Record<string, unknown>>
                  data={allowanceRows as ((HrmAllowance & { rowType: 'allowance' | 'deduction' }) & Record<string, unknown>)[]}
                  keyExtractor={(row) => `${row.rowType}-${row.id}`}
                  pageSize={10}
                  emptyMessage="لا بدلات أو خصومات"
                  columns={[
                    { key: 'description', header: 'الوصف' },
                    {
                      key: 'rowType',
                      header: 'النوع',
                      render: (row) => (row.rowType === 'allowance' ? 'بدل' : 'خصم'),
                    },
                    {
                      key: 'amount',
                      header: 'القيمة',
                      className: 'tabular-nums',
                      render: (row) => Number(row.amount).toLocaleString('ar-EG'),
                    },
                    { key: 'applicable_date', header: 'التاريخ', render: (row) => row.applicable_date ?? '—' },
                  ]}
                />
              </AsyncState>
            )}

            {activeTab === 'payroll' && (
              <AsyncState
                isLoading={payrollQuery.isLoading}
                isError={payrollQuery.isError}
                error={payrollQuery.error}
              >
                <DataTable<HrmPayrollRecord & Record<string, unknown>>
                  data={(payrollQuery.data ?? []) as (HrmPayrollRecord & Record<string, unknown>)[]}
                  keyExtractor={(row) => row.id}
                  pageSize={10}
                  emptyMessage="لا سجلات رواتب"
                  columns={[
                    { key: 'ref_no', header: 'المرجع', render: (row) => row.ref_no || `#${row.id}` },
                    {
                      key: 'duration',
                      header: 'المدة',
                      render: (row) => `${row.duration} ${row.duration_unit ?? ''}`,
                    },
                    {
                      key: 'gross_total',
                      header: 'الإجمالي',
                      className: 'tabular-nums',
                      render: (row) => Number(row.gross_total).toLocaleString('ar-EG'),
                    },
                    {
                      key: 'final_total',
                      header: 'الصافي',
                      className: 'tabular-nums',
                      render: (row) => Number(row.final_total).toLocaleString('ar-EG'),
                    },
                    {
                      key: 'payment_status',
                      header: 'الدفع',
                      render: (row) => (
                        <StatusBadge
                          status={String(row.payment_status)}
                          label={row.payment_status === 'paid' ? 'مدفوع' : 'مستحق'}
                        />
                      ),
                    },
                  ]}
                />
              </AsyncState>
            )}

            {activeTab === 'debts' && (
              <AsyncState
                isLoading={debtsQuery.isLoading}
                isError={debtsQuery.isError}
                error={debtsQuery.error}
              >
                <DataTable<EmployeeDebtRow & Record<string, unknown>>
                  data={(debtsQuery.data ?? []) as (EmployeeDebtRow & Record<string, unknown>)[]}
                  keyExtractor={(row) => row.id}
                  pageSize={10}
                  emptyMessage="لا مديونيات مسجلة"
                  columns={[
                    {
                      key: 'amount',
                      header: 'المبلغ',
                      className: 'tabular-nums',
                      render: (row) => Number(row.amount).toLocaleString('ar-EG'),
                    },
                    {
                      key: 'remaining_balance',
                      header: 'المتبقي',
                      className: 'tabular-nums',
                      render: (row) => Number(row.remaining_balance).toLocaleString('ar-EG'),
                    },
                    {
                      key: 'status',
                      header: 'الحالة',
                      render: (row) => (
                        <StatusBadge
                          status={row.status === 'settled' ? 'success' : 'warning'}
                          label={row.status === 'settled' ? 'مسددة' : 'نشطة'}
                        />
                      ),
                    },
                    { key: 'reason', header: 'السبب', render: (row) => row.reason ?? '—' },
                  ]}
                />
              </AsyncState>
            )}

            {activeTab === 'sales-targets' && (
              <AsyncState
                isLoading={salesTargetsQuery.isLoading}
                isError={salesTargetsQuery.isError}
                error={salesTargetsQuery.error}
              >
                <div className="space-y-md">
                  {targetProgressQuery.data && (
                    <SalesTargetProgressCard target={targetProgressQuery.data} />
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditTarget(null)
                        setTargetModalOpen(true)
                      }}
                      className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary"
                    >
                      إضافة هدف
                    </button>
                  </div>
                  <DataTable<HrmUserSalesTarget & Record<string, unknown>>
                    data={(salesTargetsQuery.data ?? []) as (HrmUserSalesTarget & Record<string, unknown>)[]}
                    keyExtractor={(row) => row.id}
                    pageSize={10}
                    emptyMessage="لا أهداف مبيعات"
                    columns={[
                      { key: 'target_start', header: 'من' },
                      { key: 'target_end', header: 'إلى' },
                      {
                        key: 'target_count',
                        header: 'الهدف',
                        render: (row) => row.target_count ?? '—',
                      },
                      {
                        key: 'achieved_count',
                        header: 'المحقق',
                        render: (row) => row.achieved_count ?? 0,
                      },
                      {
                        key: 'commission_percent',
                        header: 'العمولة %',
                        className: 'tabular-nums',
                        render: (row) =>
                          row.commission_percent != null ? `${row.commission_percent}%` : '—',
                      },
                      {
                        key: 'actions',
                        header: '',
                        render: (row) => (
                          <button
                            type="button"
                            onClick={() => {
                              setEditTarget(row as HrmUserSalesTarget)
                              setTargetModalOpen(true)
                            }}
                            className="text-sm text-primary hover:underline"
                          >
                            تعديل
                          </button>
                        ),
                      },
                    ]}
                  />
                </div>
              </AsyncState>
            )}
          </>
        )}
      </AsyncState>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="تعديل موظف">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="grid gap-sm sm:grid-cols-2"
        >
          <EmployeeAccountModeField
            mode={form.user_account_mode}
            linkedUserId={form.linked_user_id}
            onModeChange={handleAccountModeChange}
            onLinkedUserChange={handleLinkedUserChange}
            users={linkableUsersQuery.data ?? []}
            isLoading={linkableUsersQuery.isLoading}
          />
          {!(form.user_account_mode === 'link' && form.linked_user_id) && (
            <input
              placeholder="الاسم"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className={inputClass}
            />
          )}
          <input
            placeholder="الهاتف"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
            dir="ltr"
          />
          <input
            placeholder="الرقم القومي"
            value={form.national_id}
            onChange={(e) => setForm({ ...form, national_id: e.target.value })}
            className={inputClass}
            dir="ltr"
          />
          <input
            type="date"
            placeholder="تاريخ التعيين"
            value={form.hire_date}
            onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
            className={inputClass}
          />
          <select
            value={form.hrm_job_id}
            onChange={(e) =>
              setForm({ ...form, hrm_job_id: e.target.value ? Number(e.target.value) : '' })
            }
            className={inputClass}
          >
            <option value="">الوظيفة</option>
            {(jobsQuery.data ?? []).map((job) => (
              <option key={job.id} value={job.id}>
                {job.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="الراتب"
            value={form.salary}
            onChange={(e) => setForm({ ...form, salary: e.target.value })}
            className={inputClass}
            dir="ltr"
          />
          <select
            value={form.branch_id}
            onChange={(e) => handleBranchChange(e.target.value ? Number(e.target.value) : '')}
            className={inputClass}
          >
            <option value="">الفرع</option>
            {(branchesQuery.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name_ar ?? b.name}
              </option>
            ))}
          </select>
          <select
            value={form.department_id}
            onChange={(e) =>
              setForm({ ...form, department_id: e.target.value ? Number(e.target.value) : '' })
            }
            className={inputClass}
          >
            <option value="">القسم</option>
            {(departmentsQuery.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name_ar ?? d.name}
              </option>
            ))}
          </select>
          <EmployeeZkDeviceField
            value={form.zk_device_id}
            onChange={handleDeviceChange}
            devices={zkDevices}
            isLoading={zkDevicesQuery.isLoading}
          />
          <input
            placeholder="رقم البصمة"
            value={form.zk_pin}
            onChange={(e) => setForm({ ...form, zk_pin: e.target.value })}
            className={inputClass}
            dir="ltr"
          />
          <p className="sm:col-span-2 text-[11px] text-on-surface-variant">
            للموظف المتحرك: استخدم نفس رقم البصمة على كل أجهزة الفروع المسموحة. الفرع هنا = الفرع الأساسي للرواتب.
          </p>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className={inputClass}
          >
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-lg bg-secondary py-2 text-sm font-bold text-on-secondary sm:col-span-2"
          >
            حفظ
          </button>
        </form>
      </Modal>

      <SalesTargetFormModal
        open={targetModalOpen}
        onClose={() => setTargetModalOpen(false)}
        employeeId={employeeId}
        target={editTarget}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['hrm', 'sales-targets', 'employee', id] })
          queryClient.invalidateQueries({ queryKey: ['hrm', 'sales-targets', 'progress', id] })
        }}
      />
    </div>
  )
}
