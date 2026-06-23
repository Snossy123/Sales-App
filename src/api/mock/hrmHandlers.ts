import type {
  AuthUser,
  Employee,
  HrmAllowance,
  HrmAttendance,
  HrmDashboard,
  HrmHoliday,
  HrmJob,
  HrmLeave,
  HrmLeaveType,
  HrmPayrollGroup,
  HrmPayrollRecord,
  HrmShift,
  PaginatedResponse,
  ZkDevice,
} from '../types'
import { loadState, mutateState } from './store'
import type { DemoState } from './seed'

interface MockContext {
  branchId?: number
  user?: AuthUser
}

function paginate<T>(items: T[], params?: Record<string, string>): PaginatedResponse<T> {
  const page = Number(params?.page ?? 1)
  const perPage = Number(params?.per_page ?? 50)
  const start = (page - 1) * perPage
  const slice = items.slice(start, start + perPage)
  return {
    data: slice,
    current_page: page,
    last_page: Math.max(1, Math.ceil(items.length / perPage)),
    per_page: perPage,
    total: items.length,
  }
}

function mockError(status: number, message: string): Error & { response: { status: number; data: { message: string } } } {
  const err = new Error(message) as Error & {
    response: { status: number; data: { message: string } }
    isAxiosError: boolean
  }
  err.response = { status, data: { message } }
  err.isAxiosError = true
  return err
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function enrichEmployee(state: DemoState, emp: Employee): Employee {
  const job = emp.hrm_job_id ? state.hrmJobs.find((j) => j.id === emp.hrm_job_id) : undefined
  return {
    ...emp,
    job,
    branch: emp.branch ?? state.branches.find((b) => b.id === emp.branch_id),
    department: emp.department ?? (() => {
      const dept = state.departments.find((d) => d.id === emp.department_id)
      return dept ? { id: dept.id, name: dept.name, name_ar: dept.name_ar ?? undefined } : undefined
    })(),
    user: emp.user ?? state.users.find((u) => u.id === emp.user_id),
  }
}

function enrichLeave(state: DemoState, leave: HrmLeave): HrmLeave {
  const leaveType = state.hrmLeaveTypes.find((t) => t.id === leave.hrm_leave_type_id)
  const employee = state.employees.find((e) => e.id === leave.employee_id)
  return {
    ...leave,
    leaveType,
    employee: employee ? enrichEmployee(state, employee) : undefined,
    changedBy: leave.changed_by ? state.users.find((u) => u.id === leave.changed_by) : undefined,
  }
}

function enrichAttendance(state: DemoState, row: HrmAttendance): HrmAttendance {
  const employee = state.employees.find((e) => e.id === row.employee_id)
  const shift = state.hrmShifts.find((s) => s.id === row.hrm_shift_id)
  return {
    ...row,
    employee: employee ? enrichEmployee(state, employee) : undefined,
    shift,
  }
}

function enrichShift(state: DemoState, shift: HrmShift): HrmShift {
  const userShifts = state.hrmUserShifts
    .filter((us) => us.hrm_shift_id === shift.id)
    .map((us) => ({
      ...us,
      employee: enrichEmployee(state, state.employees.find((e) => e.id === us.employee_id)!),
    }))
  return { ...shift, userShifts }
}

function enrichAllowance(state: DemoState, row: DemoState['hrmAllowances'][0]): HrmAllowance {
  const employees = row.employee_ids
    .map((id) => state.employees.find((e) => e.id === id))
    .filter(Boolean)
    .map((e) => enrichEmployee(state, e!))
  const { employee_ids: _, ...rest } = row
  return { ...rest, employees }
}

function enrichPayroll(state: DemoState, row: HrmPayrollRecord): HrmPayrollRecord {
  const employee = state.employees.find((e) => e.id === row.employee_id)
  return {
    ...row,
    employee: employee ? enrichEmployee(state, employee) : undefined,
    branch: state.branches.find((b) => b.id === row.branch_id),
    creator: row.created_by ? state.users.find((u) => u.id === row.created_by) : undefined,
  }
}

function enrichPayrollGroup(state: DemoState, row: DemoState['hrmPayrollGroups'][0]): HrmPayrollGroup {
  const payrollRecords = row.payroll_record_ids
    .map((id) => state.hrmPayrollRecords.find((r) => r.id === id))
    .filter(Boolean)
    .map((r) => enrichPayroll(state, r!))
  const { payroll_record_ids: _, ...rest } = row
  return {
    ...rest,
    payrollRecords,
    branch: state.branches.find((b) => b.id === row.branch_id),
    creator: row.creator,
  }
}

function buildDashboard(state: DemoState): HrmDashboard {
  const todayStr = today()
  const presentToday = state.hrmAttendance.filter(
    (a) => a.date === todayStr && (a.status === 'present' || a.clock_in_time),
  ).length
  const clockedInNow = state.hrmAttendance.filter((a) => a.clock_in_time && !a.clock_out_time).length
  const pendingLeaves = state.hrmLeaves.filter((l) => l.status === 'pending').length
  const upcomingLeaves = state.hrmLeaves
    .filter((l) => l.status === 'approved' && l.start_date >= todayStr)
    .map((l) => enrichLeave(state, l))
  const employeesByDepartment: Record<string, number> = {}
  for (const emp of state.employees) {
    const dept = state.departments.find((d) => d.id === emp.department_id)
    const key = dept?.name_ar ?? dept?.name ?? 'غير محدد'
    employeesByDepartment[key] = (employeesByDepartment[key] ?? 0) + 1
  }
  const payrollDueTotal = state.hrmPayrollRecords
    .filter((r) => r.payment_status === 'due')
    .reduce((sum, r) => sum + Number(r.final_total), 0)

  return {
    present_today: presentToday,
    clocked_in_now: clockedInNow,
    pending_leaves: pendingLeaves,
    upcoming_leaves: upcomingLeaves,
    employees_by_department: employeesByDepartment,
    payroll_due_total: payrollDueTotal,
    organization_id: 1,
  }
}

function employeeForUser(state: DemoState, userId?: number): Employee | undefined {
  if (!userId) return undefined
  const emp = state.employees.find((e) => e.user_id === userId)
  return emp ? enrichEmployee(state, emp) : undefined
}

function ensureEmployeeUser(state: DemoState, employee: Employee): void {
  if (employee.user_id) return

  state.counters.user = (state.counters.user ?? 8) + 1
  const userId = state.counters.user
  const emailBase = employee.employee_code.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')
  const email = `${emailBase || `employee.${userId}`}@demo.test`

  state.users.push({
    id: userId,
    name: employee.name,
    email,
    password: 'password123',
    organization_id: employee.branch_id ? 1 : 1,
    branch_id: employee.branch_id ?? undefined,
    section_id: employee.department_id ?? undefined,
    roles: [{ id: 2, name: 'Sales' }],
    data_scope: 'branch',
    data_scope_label: 'فرع',
    permissions: ['scope.branch', 'sales.pos'],
  })

  employee.user_id = userId
}

function enrichJob(state: DemoState, job: HrmJob): HrmJob {
  const employeesCount = state.employees.filter((e) => e.hrm_job_id === job.id).length
  return { ...job, employees_count: employeesCount }
}

function buildMockZkDevices(state: DemoState): ZkDevice[] {
  return state.branches.map((branch, index) => ({
    id: index + 1,
    branch_id: branch.id,
    name: `جهاز ${branch.name_ar ?? branch.name}`,
    ip_address: `192.168.1.${10 + index}`,
    port: 4370,
    is_active: true,
    branch,
  }))
}

export function tryHandleHrmRequest(
  m: string,
  path: string,
  data: unknown,
  params: Record<string, string>,
  ctx: MockContext,
): unknown | undefined {
  const state = loadState()

  if (m === 'GET' && path === 'employees/linkable-users') {
    const employeeId = params.employee_id ? Number(params.employee_id) : null
    const linkedUserIds = new Set(
      state.employees
        .filter((emp) => emp.user_id && emp.id !== employeeId)
        .map((emp) => emp.user_id as number),
    )
    const currentUserId = employeeId
      ? state.employees.find((emp) => emp.id === employeeId)?.user_id ?? null
      : null

    const items = state.users.filter(
      (user) =>
        !linkedUserIds.has(user.id) || (currentUserId != null && user.id === currentUserId),
    )

    return {
      data: items.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        branch_id: user.branch_id ?? null,
        section_id: user.section_id ?? null,
      })),
    }
  }

  if (m === 'GET' && path === 'me/employee') {
    const employee = state.employees.find((e) => e.user_id === ctx.user?.id)
    if (!employee) throw mockError(404, 'لا يوجد ملف موظف')
    return enrichEmployee(state, employee)
  }

  if (m === 'GET' && path === 'employees') {
    let items = state.employees.map((e) => enrichEmployee(state, e))
    const branchFilter = params['filter[branch_id]']
    if (branchFilter) items = items.filter((e) => e.branch_id === Number(branchFilter))
    return paginate(items, params)
  }

  if (m === 'POST' && path === 'employees') {
    const body = data as Record<string, unknown>
    let created: Employee | undefined
    mutateState((s) => {
      s.counters.employee = (s.counters.employee ?? 3) + 1
      const nextCode = `EMP-${String(s.counters.employee).padStart(4, '0')}`
      created = {
        id: s.counters.employee,
        employee_code: String(body.employee_code ?? nextCode),
        zk_pin: (body.zk_pin as string) ?? null,
        hrm_job_id: body.hrm_job_id ? Number(body.hrm_job_id) : null,
        name: String(body.name ?? ''),
        phone: (body.phone as string) ?? null,
        job_title: body.hrm_job_id
          ? s.hrmJobs.find((j) => j.id === Number(body.hrm_job_id))?.name ?? null
          : (body.job_title as string) ?? null,
        salary: body.salary != null ? Number(body.salary) : null,
        hire_date: today(),
        status: String(body.status ?? 'active'),
        branch_id: body.branch_id ? Number(body.branch_id) : null,
        department_id: body.department_id ? Number(body.department_id) : null,
        user_id: body.user_id ? Number(body.user_id) : null,
      }
      s.employees.push(created!)
      if (created!.user_id) {
        const linked = s.users.find((user) => user.id === created!.user_id)
        if (linked) linked.name = created!.name
      } else {
        ensureEmployeeUser(s, created!)
      }
    })
    return enrichEmployee(loadState(), created!)
  }

  if (m === 'PUT' && path.match(/^employees\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const body = data as Record<string, unknown>
    let updated: Employee | undefined
    mutateState((s) => {
      const emp = s.employees.find((e) => e.id === id)
      if (!emp) throw mockError(404, 'الموظف غير موجود')
      if (body.name) emp.name = String(body.name)
      if (body.zk_pin !== undefined) emp.zk_pin = (body.zk_pin as string) || null
      if (body.hrm_job_id !== undefined) {
        emp.hrm_job_id = body.hrm_job_id ? Number(body.hrm_job_id) : null
        emp.job_title = emp.hrm_job_id
          ? s.hrmJobs.find((j) => j.id === emp.hrm_job_id)?.name ?? null
          : null
      }
      if (body.phone !== undefined) emp.phone = (body.phone as string) || null
      if (body.job_title !== undefined) emp.job_title = (body.job_title as string) || null
      if (body.salary !== undefined) emp.salary = body.salary != null ? Number(body.salary) : null
      if (body.branch_id !== undefined) emp.branch_id = body.branch_id ? Number(body.branch_id) : null
      if (body.department_id !== undefined) emp.department_id = body.department_id ? Number(body.department_id) : null
      if (body.user_id !== undefined) {
        emp.user_id = body.user_id ? Number(body.user_id) : null
        if (!emp.user_id) ensureEmployeeUser(s, emp)
      } else {
        ensureEmployeeUser(s, emp)
      }
      if (body.status) emp.status = String(body.status)
      updated = emp
    })
    return enrichEmployee(loadState(), updated!)
  }

  if (m === 'GET' && path.match(/^employees\/\d+$/)) {
    const id = Number(path.split('/')[1])
    const employee = state.employees.find((e) => e.id === id)
    if (!employee) throw mockError(404, 'الموظف غير موجود')
    return enrichEmployee(state, employee)
  }

  if (m === 'POST' && path.match(/^employees\/\d+\/profile-photo$/)) {
    const employeeId = Number(path.split('/')[1])
    let photoUrl: string | null = null
    mutateState((s) => {
      const employee = s.employees.find((e) => e.id === employeeId)
      if (!employee) throw mockError(404, 'الموظف غير موجود')
      const file = (data as FormData | undefined)?.get?.('photo')
      if (file && typeof file === 'object' && 'name' in file) {
        photoUrl = URL.createObjectURL(file as File)
      } else {
        photoUrl = `https://demo.local/profile/employee-${employeeId}.jpg`
      }
      employee.profile_photo_url = photoUrl
    })
    return { profile_photo_url: photoUrl }
  }

  if (m === 'DELETE' && path.match(/^employees\/\d+\/profile-photo$/)) {
    const employeeId = Number(path.split('/')[1])
    mutateState((s) => {
      const employee = s.employees.find((e) => e.id === employeeId)
      if (!employee) throw mockError(404, 'الموظف غير موجود')
      employee.profile_photo_url = null
    })
    return { profile_photo_url: null }
  }

  if (m === 'GET' && path.match(/^(hrm\/)?employees\/\d+\/allowances$/)) {
    const segments = path.split('/')
    const employeeId = Number(segments[segments.length - 2])
    const items = state.hrmAllowances.filter((a) => a.employee_ids?.includes(employeeId))
    return {
      allowances: items.filter((a) => a.type === 'allowance'),
      deductions: items.filter((a) => a.type === 'deduction'),
    }
  }

  if (m === 'GET' && path.match(/^(hrm\/)?employees\/\d+\/sales-targets$/)) {
    const segments = path.split('/')
    const employeeId = Number(segments[segments.length - 2])
    const targets = (state.hrmUserSalesTargets ?? []).filter((t) => t.employee_id === employeeId)
    return targets
  }

  if (m === 'GET' && path.match(/^hrm\/employees\/\d+\/sales-targets\/progress$/)) {
    const employeeId = Number(path.split('/')[2])
    const today = new Date().toISOString().split('T')[0]
    const active = (state.hrmUserSalesTargets ?? []).find(
      (t) =>
        t.employee_id === employeeId &&
        t.target_start <= today &&
        t.target_end >= today,
    )
    return { active_target: active ?? null, allocations: [] }
  }

  if (m === 'GET' && path === 'hrm/sales-targets') {
    let items = [...(state.hrmUserSalesTargets ?? [])]
    const employeeFilter = params['filter[employee_id]']
    if (employeeFilter) items = items.filter((t) => t.employee_id === Number(employeeFilter))
    const enriched = items.map((t) => ({
      ...t,
      employee: state.employees.find((e) => e.id === t.employee_id),
    }))
    return paginate(enriched, params)
  }

  if (m === 'POST' && path === 'hrm/sales-targets') {
    const body = data as Record<string, unknown>
    let created: import('../types').HrmUserSalesTarget | undefined
    mutateState((s) => {
      if (!s.hrmUserSalesTargets) s.hrmUserSalesTargets = []
      const id = (s.hrmUserSalesTargets.reduce((max, t) => Math.max(max, t.id), 0) || 0) + 1
      created = {
        id,
        employee_id: Number(body.employee_id),
        target_start: String(body.target_start),
        target_end: String(body.target_end),
        target_count: Number(body.target_count ?? 0),
        achieved_count: 0,
        commission_percent: Number(body.commission_percent ?? 0),
      }
      s.hrmUserSalesTargets.push(created)
    })
    return {
      ...created!,
      employee: state.employees.find((e) => e.id === created!.employee_id),
    }
  }

  if (m === 'PUT' && path.match(/^hrm\/sales-targets\/\d+$/)) {
    const targetId = Number(path.split('/')[2])
    const body = data as Record<string, unknown>
    let updated: import('../types').HrmUserSalesTarget | undefined
    mutateState((s) => {
      const target = s.hrmUserSalesTargets?.find((t) => t.id === targetId)
      if (!target) throw mockError(404, 'الهدف غير موجود')
      if (body.target_start) target.target_start = String(body.target_start)
      if (body.target_end) target.target_end = String(body.target_end)
      if (body.target_count != null) target.target_count = Number(body.target_count)
      if (body.commission_percent != null) target.commission_percent = Number(body.commission_percent)
      updated = target
    })
    return updated
  }

  if (m === 'GET' && path === 'hrm/dashboard') {
    return buildDashboard(state)
  }

  if (m === 'GET' && path === 'hrm/leave-types') {
    return paginate(state.hrmLeaveTypes, params)
  }

  if (m === 'POST' && path === 'hrm/leave-types') {
    const body = data as Record<string, unknown>
    let created: HrmLeaveType | undefined
    mutateState((s) => {
      s.counters.hrmLeaveType = (s.counters.hrmLeaveType ?? 3) + 1
      created = {
        id: s.counters.hrmLeaveType,
        leave_type: String(body.leave_type ?? ''),
        max_leave_count: body.max_leave_count != null ? Number(body.max_leave_count) : null,
        leave_count_interval: (body.leave_count_interval as string) ?? 'year',
      }
      s.hrmLeaveTypes.push(created!)
    })
    return created
  }

  if (m === 'PUT' && path.match(/^hrm\/leave-types\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as Record<string, unknown>
    let updated: HrmLeaveType | undefined
    mutateState((s) => {
      const row = s.hrmLeaveTypes.find((t) => t.id === id)
      if (!row) throw mockError(404, 'نوع الإجازة غير موجود')
      if (body.leave_type) row.leave_type = String(body.leave_type)
      if (body.max_leave_count !== undefined) row.max_leave_count = body.max_leave_count != null ? Number(body.max_leave_count) : null
      if (body.leave_count_interval) row.leave_count_interval = String(body.leave_count_interval)
      updated = row
    })
    return updated
  }

  if (m === 'GET' && path === 'hrm/leaves') {
    let items = state.hrmLeaves.map((l) => enrichLeave(state, l))
    const statusFilter = params['filter[status]']
    if (statusFilter) items = items.filter((l) => l.status === statusFilter)
    return paginate(items, params)
  }

  if (m === 'POST' && path === 'hrm/leaves') {
    const body = data as Record<string, unknown>
    let created: HrmLeave | undefined
    mutateState((s) => {
      s.counters.hrmLeave = (s.counters.hrmLeave ?? 2) + 1
      created = {
        id: s.counters.hrmLeave,
        hrm_leave_type_id: Number(body.hrm_leave_type_id),
        employee_id: Number(body.employee_id),
        start_date: String(body.start_date),
        end_date: String(body.end_date),
        ref_no: `LV-${String(s.counters.hrmLeave).padStart(6, '0')}`,
        status: 'pending',
        reason: (body.reason as string) ?? null,
      }
      s.hrmLeaves.push(created!)
    })
    return enrichLeave(loadState(), created!)
  }

  if (m === 'POST' && path.match(/^hrm\/leaves\/\d+\/(approve|reject)$/)) {
    const parts = path.split('/')
    const id = Number(parts[2])
    const action = parts[3] as 'approve' | 'reject'
    let updated: HrmLeave | undefined
    mutateState((s) => {
      const leave = s.hrmLeaves.find((l) => l.id === id)
      if (!leave) throw mockError(404, 'الإجازة غير موجودة')
      leave.status = action === 'approve' ? 'approved' : 'rejected'
      leave.changed_by = ctx.user?.id ?? null
      updated = leave
    })
    return enrichLeave(loadState(), updated!)
  }

  if (m === 'GET' && path === 'hrm/attendance') {
    let items = state.hrmAttendance.map((a) => enrichAttendance(state, a))
    const statusFilter = params['filter[status]']
    if (statusFilter) items = items.filter((a) => a.status === statusFilter)
    const employeeFilter = params['filter[employee_id]']
    if (employeeFilter) items = items.filter((a) => String(a.employee_id) === employeeFilter)
    return paginate(items, params)
  }

  if (m === 'PUT' && path.match(/^hrm\/attendance\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as { clock_in_time?: string | null; clock_out_time?: string | null }
    let updated: HrmAttendance | undefined
    mutateState((s) => {
      const row = s.hrmAttendance.find((a) => a.id === id)
      if (!row) throw mockError(404, 'سجل الحضور غير موجود')
      if (body.clock_in_time !== undefined) {
        row.clock_in_time = body.clock_in_time
        if (body.clock_in_time) {
          row.date = body.clock_in_time.split('T')[0]
          row.check_in = body.clock_in_time.split('T')[1]?.slice(0, 8) ?? null
        } else {
          row.check_in = null
        }
      }
      if (body.clock_out_time !== undefined) {
        row.clock_out_time = body.clock_out_time
        row.check_out = body.clock_out_time
          ? body.clock_out_time.split('T')[1]?.slice(0, 8) ?? null
          : null
      }
      updated = row
    })
    return enrichAttendance(loadState(), updated!)
  }

  if (m === 'POST' && path === 'hrm/clock-in-out') {
    const body = data as { type?: 'clock_in' | 'clock_out'; employee_id?: number }
    const employeeId = body.employee_id
    const emp = employeeId
      ? state.employees.find((e) => e.id === employeeId)
      : employeeForUser(state, ctx.user?.id)
    if (!emp) throw mockError(422, 'لا يوجد سجل موظف مرتبط بحسابك')

    const now = new Date().toISOString()
    const todayStr = today()
    let result: HrmAttendance | undefined

    mutateState((s) => {
      const employee = s.employees.find((e) => e.id === emp.id)!
      const shiftId = s.hrmUserShifts.find((us) => us.employee_id === employee.id)?.hrm_shift_id ?? null

      if (body.type === 'clock_in') {
        const open = s.hrmAttendance.find((a) => a.employee_id === employee.id && a.clock_in_time && !a.clock_out_time)
        if (open) throw mockError(422, 'لديك جلسة حضور مفتوحة')
        s.counters.hrmAttendance = (s.counters.hrmAttendance ?? 1) + 1
        result = {
          id: s.counters.hrmAttendance,
          employee_id: employee.id,
          hrm_shift_id: shiftId,
          date: todayStr,
          clock_in_time: now,
          status: 'present',
        }
        s.hrmAttendance.unshift(result)
      } else {
        const open = s.hrmAttendance.find((a) => a.employee_id === employee.id && a.clock_in_time && !a.clock_out_time)
        if (!open) throw mockError(422, 'لا توجد جلسة حضور مفتوحة')
        open.clock_out_time = now
        open.check_out = now
        result = open
      }
    })

    return enrichAttendance(loadState(), result!)
  }

  if (m === 'GET' && path === 'hrm/shifts') {
    const items = state.hrmShifts.map((s) => enrichShift(state, s))
    return paginate(items, params)
  }

  if (m === 'POST' && path === 'hrm/shifts') {
    const body = data as Record<string, unknown>
    let created: HrmShift | undefined
    mutateState((s) => {
      s.counters.hrmShift = (s.counters.hrmShift ?? 1) + 1
      created = {
        id: s.counters.hrmShift,
        name: String(body.name ?? ''),
        type: (body.type as string) ?? 'fixed_shift',
        start_time: (body.start_time as string) ?? null,
        end_time: (body.end_time as string) ?? null,
        holidays: (body.holidays as string[]) ?? null,
        is_allowed_auto_clockout: Boolean(body.is_allowed_auto_clockout),
        auto_clockout_time: (body.auto_clockout_time as string) ?? null,
      }
      s.hrmShifts.push(created!)
    })
    return enrichShift(loadState(), created!)
  }

  if (m === 'PUT' && path.match(/^hrm\/shifts\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as Record<string, unknown>
    let updated: HrmShift | undefined
    mutateState((s) => {
      const shift = s.hrmShifts.find((sh) => sh.id === id)
      if (!shift) throw mockError(404, 'الوردية غير موجودة')
      if (body.name) shift.name = String(body.name)
      if (body.type) shift.type = String(body.type)
      if (body.start_time !== undefined) shift.start_time = (body.start_time as string) || null
      if (body.end_time !== undefined) shift.end_time = (body.end_time as string) || null
      if (body.is_allowed_auto_clockout !== undefined) shift.is_allowed_auto_clockout = Boolean(body.is_allowed_auto_clockout)
      if (body.auto_clockout_time !== undefined) shift.auto_clockout_time = (body.auto_clockout_time as string) || null
      updated = shift
    })
    return enrichShift(loadState(), updated!)
  }

  if (m === 'POST' && path.match(/^hrm\/shifts\/\d+\/assign-users$/)) {
    const shiftId = Number(path.split('/')[2])
    const body = data as { assignments?: { employee_id: number; start_date: string; end_date?: string }[] }
    mutateState((s) => {
      const shift = s.hrmShifts.find((sh) => sh.id === shiftId)
      if (!shift) throw mockError(404, 'الوردية غير موجودة')
      for (const assignment of body.assignments ?? []) {
        s.counters.hrmUserShift = (s.counters.hrmUserShift ?? 3) + 1
        s.hrmUserShifts.push({
          id: s.counters.hrmUserShift,
          employee_id: assignment.employee_id,
          hrm_shift_id: shiftId,
          start_date: assignment.start_date,
          end_date: assignment.end_date ?? null,
        })
      }
    })
    const shift = loadState().hrmShifts.find((s) => s.id === shiftId)!
    return enrichShift(loadState(), shift)
  }

  if (m === 'GET' && path === 'hrm/holidays') {
    let items = state.hrmHolidays.map((h) => ({
      ...h,
      branch: h.branch_id ? state.branches.find((b) => b.id === h.branch_id) : undefined,
    }))
    const branchFilter = params['filter[branch_id]']
    if (branchFilter) {
      const bid = Number(branchFilter)
      items = items.filter((h) => !h.branch_id || h.branch_id === bid)
    }
    return paginate(items, params)
  }

  if (m === 'POST' && path === 'hrm/holidays') {
    const body = data as Record<string, unknown>
    let created: HrmHoliday | undefined
    mutateState((s) => {
      s.counters.hrmHoliday = (s.counters.hrmHoliday ?? 1) + 1
      created = {
        id: s.counters.hrmHoliday,
        name: String(body.name ?? ''),
        start_date: String(body.start_date),
        end_date: String(body.end_date),
        branch_id: body.branch_id ? Number(body.branch_id) : null,
        note: (body.note as string) ?? null,
      }
      s.hrmHolidays.push(created!)
    })
    const row = loadState().hrmHolidays.find((h) => h.id === created!.id)!
    return { ...row, branch: row.branch_id ? loadState().branches.find((b) => b.id === row.branch_id) : undefined }
  }

  if (m === 'PUT' && path.match(/^hrm\/holidays\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as Record<string, unknown>
    let updated: HrmHoliday | undefined
    mutateState((s) => {
      const row = s.hrmHolidays.find((h) => h.id === id)
      if (!row) throw mockError(404, 'العطلة غير موجودة')
      if (body.name) row.name = String(body.name)
      if (body.start_date) row.start_date = String(body.start_date)
      if (body.end_date) row.end_date = String(body.end_date)
      if (body.branch_id !== undefined) row.branch_id = body.branch_id ? Number(body.branch_id) : null
      if (body.note !== undefined) row.note = (body.note as string) || null
      updated = row
    })
    const row = updated!
    return { ...row, branch: row.branch_id ? loadState().branches.find((b) => b.id === row.branch_id) : undefined }
  }

  if (m === 'GET' && path === 'hrm/allowances') {
    const items = state.hrmAllowances.map((a) => enrichAllowance(state, a))
    return paginate(items, params)
  }

  if (m === 'POST' && path === 'hrm/allowances') {
    const body = data as Record<string, unknown>
    let created: DemoState['hrmAllowances'][0] | undefined
    mutateState((s) => {
      s.counters.hrmAllowance = (s.counters.hrmAllowance ?? 1) + 1
      created = {
        id: s.counters.hrmAllowance,
        description: String(body.description ?? ''),
        type: (body.type as string) ?? 'allowance',
        amount: Number(body.amount ?? 0),
        amount_type: (body.amount_type as string) ?? 'fixed',
        employee_ids: Array.isArray(body.employee_ids) ? body.employee_ids.map(Number) : [],
      }
      s.hrmAllowances.push(created!)
    })
    return enrichAllowance(loadState(), created!)
  }

  if (m === 'GET' && path === 'hrm/payroll') {
    let items = state.hrmPayrollRecords.map((r) => enrichPayroll(state, r))
    const statusFilter = params['filter[payment_status]']
    if (statusFilter) items = items.filter((r) => r.payment_status === statusFilter)
    return paginate(items, params)
  }

  if (m === 'POST' && path === 'hrm/payroll') {
    const body = data as Record<string, unknown>
    const employee = state.employees.find((e) => e.id === Number(body.employee_id))
    const rate = body.rate != null ? Number(body.rate) : Number(employee?.salary ?? 0)
    let created: HrmPayrollRecord | undefined
    mutateState((s) => {
      s.counters.hrmPayroll = (s.counters.hrmPayroll ?? 1) + 1
      const id = s.counters.hrmPayroll
      created = {
        id,
        employee_id: Number(body.employee_id),
        branch_id: body.branch_id ? Number(body.branch_id) : employee?.branch_id ?? null,
        ref_no: `PR-${String(id).padStart(6, '0')}`,
        duration: Number(body.duration ?? 1),
        duration_unit: (body.duration_unit as string) ?? 'month',
        rate,
        allowances: [],
        deductions: [],
        gross_total: rate,
        final_total: rate,
        payment_status: (body.payment_status as string) ?? 'due',
        created_by: ctx.user?.id ?? null,
      }
      s.hrmPayrollRecords.unshift(created!)
    })
    return enrichPayroll(loadState(), created!)
  }

  if (m === 'GET' && path === 'hrm/payroll-groups') {
    const items = state.hrmPayrollGroups.map((g) => enrichPayrollGroup(state, g))
    return paginate(items, params)
  }

  if (m === 'POST' && path === 'hrm/payroll-groups') {
    const body = data as { name?: string; payroll_record_ids?: number[] }
    let created: DemoState['hrmPayrollGroups'][0] | undefined
    mutateState((s) => {
      s.counters.hrmPayrollGroup = (s.counters.hrmPayrollGroup ?? 1) + 1
      const recordIds = body.payroll_record_ids ?? []
      const gross = recordIds.reduce((sum, rid) => {
        const rec = s.hrmPayrollRecords.find((r) => r.id === rid)
        return sum + Number(rec?.final_total ?? 0)
      }, 0)
      created = {
        id: s.counters.hrmPayrollGroup,
        name: String(body.name ?? ''),
        branch_id: ctx.branchId ?? 1,
        status: 'draft',
        payment_status: 'due',
        gross_total: gross,
        payroll_record_ids: recordIds,
      }
      s.hrmPayrollGroups.unshift(created!)
    })
    return enrichPayrollGroup(loadState(), created!)
  }

  if (m === 'POST' && path.match(/^hrm\/payroll-groups\/\d+\/mark-paid$/)) {
    const id = Number(path.split('/')[2])
    let updated: DemoState['hrmPayrollGroups'][0] | undefined
    mutateState((s) => {
      const group = s.hrmPayrollGroups.find((g) => g.id === id)
      if (!group) throw mockError(404, 'المسير غير موجود')
      group.payment_status = 'paid'
      group.status = 'finalized'
      for (const rid of group.payroll_record_ids) {
        const rec = s.hrmPayrollRecords.find((r) => r.id === rid)
        if (rec) rec.payment_status = 'paid'
      }
      updated = group
    })
    return enrichPayrollGroup(loadState(), updated!)
  }

  if (m === 'GET' && path === 'hrm/jobs') {
    let items = state.hrmJobs.map((job) => enrichJob(state, job))
    const statusFilter = params['filter[status]']
    if (statusFilter) items = items.filter((job) => job.status === statusFilter)
    return paginate(items, params)
  }

  if (m === 'POST' && path === 'hrm/jobs') {
    const body = data as Record<string, unknown>
    let created: HrmJob | undefined
    mutateState((s) => {
      s.counters.hrmJob = (s.counters.hrmJob ?? s.hrmJobs.length) + 1
      created = {
        id: s.counters.hrmJob,
        name: String(body.name ?? ''),
        description: (body.description as string) ?? null,
        status: String(body.status ?? 'active'),
      }
      s.hrmJobs.push(created!)
    })
    return enrichJob(loadState(), created!)
  }

  if (m === 'PUT' && path.match(/^hrm\/jobs\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const body = data as Record<string, unknown>
    let updated: HrmJob | undefined
    mutateState((s) => {
      const job = s.hrmJobs.find((j) => j.id === id)
      if (!job) throw mockError(404, 'الوظيفة غير موجودة')
      if (body.name) {
        job.name = String(body.name)
        for (const emp of s.employees.filter((e) => e.hrm_job_id === id)) {
          emp.job_title = job.name
        }
      }
      if (body.description !== undefined) job.description = (body.description as string) || null
      if (body.status) job.status = String(body.status)
      updated = job
    })
    return enrichJob(loadState(), updated!)
  }

  if (m === 'GET' && path.match(/^hrm\/jobs\/\d+$/)) {
    const id = Number(path.split('/')[2])
    const job = state.hrmJobs.find((j) => j.id === id)
    if (!job) throw mockError(404, 'الوظيفة غير موجودة')
    return enrichJob(state, job)
  }

  if (m === 'GET' && path === 'hrm/zk-devices') {
    return paginate(buildMockZkDevices(state), params)
  }

  return undefined
}
