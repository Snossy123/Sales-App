import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type {
  Administration,
  AdminRole,
  AdminUser,
  Branch,
  Department,
  Employee,
  HrmJob,
  PaginatedResponse,
  Section,
  ZkDevice,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { FilterBar } from '../../../components/FilterBar'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ProfileAvatar } from '../../../components/ProfileAvatar'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'
import { EntityRowActions } from '../../../components/crud/EntityRowActions'
import { getScopedDepartmentId, isSuperAdmin, userHasPermission } from '../../../lib/access'
import { getEntityCrudConfig } from '../../../lib/crud/entityCrudRegistry'
import { formatRoleLabel } from '../../../lib/roleCatalog'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useAuthStore } from '../../../stores/authStore'
import {
  EmployeeAccountModeField,
  inferEmployeeAccountMode,
  type EmployeeAccountMode,
} from '../components/EmployeeAccountModeField'
import { EmployeeZkDeviceField } from '../components/EmployeeZkDeviceField'
import { branchZkDevice, zkDeviceLabel } from '../lib/zkDevice'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

function employeeStatusSearchText(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === 'active') return 'active نشط'
  if (normalized === 'inactive') return 'inactive غير نشط'
  return status
}

function employeeSearchHaystack(employee: Employee, devices: ZkDevice[]): string {
  const parts = [
    employee.zk_pin,
    employee.name,
    employee.job?.name,
    employee.job_title,
    employee.branch?.name_ar,
    employee.branch?.name,
    zkDeviceLabel(branchZkDevice(devices, employee.branch_id)),
    employee.salary != null ? String(employee.salary) : '',
    employee.salary != null ? Number(employee.salary).toLocaleString('ar-EG') : '',
    employeeStatusSearchText(employee.status),
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}

type CreateEntryType = 'employee' | 'user'

const emptyEmployeeForm = {
  user_account_mode: 'none' as EmployeeAccountMode,
  linked_user_id: '' as number | '',
  zk_device_id: '' as number | '',
  zk_pin: '',
  name: '',
  phone: '',
  hrm_job_id: '' as number | '',
  salary: '',
  branch_id: '' as number | '',
  department_id: '' as number | '',
  status: 'active',
}

const emptyUserForm = {
  name: '',
  email: '',
  password: '',
  administration_id: '' as number | '',
  branch_id: '' as number | '',
  branch_ids: [] as number[],
  section_id: '' as number | '',
  role_names: [] as string[],
}

export function HrmEmployeesPage() {
  const queryClient = useQueryClient()
  const authUser = useAuthStore((s) => s.user)
  const scopedAdminId = getScopedDepartmentId(authUser)
  const canCreateUsers = userHasPermission(authUser, 'users.manage')
  const isOrgWide = isSuperAdmin(authUser)

  const [panelOpen, setPanelOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [createEntryType, setCreateEntryType] = useState<CreateEntryType>('employee')
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm)
  const [userForm, setUserForm] = useState(emptyUserForm)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const crudConfig = getEntityCrudConfig('employees')

  const modalOpen = panelOpen || editId !== null
  const isCreateMode = panelOpen && editId === null

  const query = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, include: 'branch,department,job,user' },
      })
      return data.data
    },
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'hrm-employees'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params: { per_page: 100 } })
      return data.data
    },
    enabled: modalOpen,
  })

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'hrm-employees'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/departments', { params: { per_page: 100 } })
      return data.data
    },
    enabled: modalOpen,
  })

  const zkDevicesQuery = useQuery({
    queryKey: ['hrm', 'zk-devices', 'hrm-employees'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ZkDevice>>('/hrm/zk-devices', {
        params: { per_page: 100, include: 'branch' },
      })
      return data.data
    },
  })

  const jobsQuery = useQuery({
    queryKey: ['hrm', 'jobs', 'hrm-employees'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmJob>>('/hrm/jobs', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data
    },
    enabled: modalOpen,
  })

  const linkableUsersQuery = useQuery({
    queryKey: ['employees', 'linkable-users', editId],
    queryFn: async () => {
      const params: Record<string, number> = {}
      if (editId) params.employee_id = editId
      const { data } = await api.get<{ data: AdminUser[] }>('/employees/linkable-users', { params })
      return data.data
    },
    enabled: modalOpen,
  })

  const administrationsQuery = useQuery({
    queryKey: ['administrations', 'hrm-employees-user-form'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Administration>>('/administrations', { params: { per_page: 100 } })
      return data.data
    },
    enabled: modalOpen && isCreateMode && createEntryType === 'user',
  })

  const userFormBranchesQuery = useQuery({
    queryKey: ['branches', 'hrm-employees-user-form', userForm.administration_id],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (userForm.administration_id) params['filter[administration_id]'] = Number(userForm.administration_id)
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params })
      return data.data
    },
    enabled: modalOpen && isCreateMode && createEntryType === 'user',
  })

  const userFormSectionsQuery = useQuery({
    queryKey: ['departments', 'hrm-employees-user-form', userForm.branch_id],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (userForm.branch_id) params['filter[branch_id]'] = Number(userForm.branch_id)
      const { data } = await api.get<PaginatedResponse<Section>>('/departments', { params })
      return data.data
    },
    enabled: modalOpen && isCreateMode && createEntryType === 'user' && Boolean(userForm.branch_id),
  })

  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles', 'hrm-employees-user-form'],
    queryFn: async () => {
      const { data } = await api.get<AdminRole[]>('/admin/roles')
      return data
    },
    enabled: modalOpen && isCreateMode && createEntryType === 'user' && canCreateUsers,
  })

  const saveEmployeeMutation = useMutation({
    mutationFn: async () => {
      const selectedUser = employeeForm.linked_user_id
        ? linkableUsersQuery.data?.find((user) => user.id === employeeForm.linked_user_id)
        : undefined
      const payload = {
        user_account_mode: employeeForm.user_account_mode,
        user_id: employeeForm.user_account_mode === 'link' && employeeForm.linked_user_id
          ? Number(employeeForm.linked_user_id)
          : null,
        zk_pin: employeeForm.zk_pin || undefined,
        name: selectedUser?.name ?? employeeForm.name,
        phone: employeeForm.phone || undefined,
        hrm_job_id: employeeForm.hrm_job_id ? Number(employeeForm.hrm_job_id) : null,
        salary: employeeForm.salary ? Number(employeeForm.salary) : undefined,
        branch_id: employeeForm.branch_id ? Number(employeeForm.branch_id) : undefined,
        department_id: employeeForm.department_id ? Number(employeeForm.department_id) : undefined,
        status: employeeForm.status,
      }
      if (editId) {
        const { data } = await api.put<Employee>(`/employees/${editId}`, payload)
        return data
      }
      const { data } = await api.post<Employee>('/employees', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      closeModal()
      setToast('تم حفظ الموظف')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const saveUserMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        administration_id: userForm.administration_id ? Number(userForm.administration_id) : undefined,
        branch_id: userForm.branch_id ? Number(userForm.branch_id) : undefined,
        branch_ids: userForm.branch_ids,
        section_id: userForm.section_id ? Number(userForm.section_id) : undefined,
        role_names: userForm.role_names,
      }
      const { data } = await api.post<AdminUser>('/admin/users', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      closeModal()
      setToast('تم إنشاء المستخدم')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const resetUserForm = (): typeof emptyUserForm => ({
    ...emptyUserForm,
    administration_id: scopedAdminId != null ? scopedAdminId : '',
  })

  const closeModal = () => {
    setPanelOpen(false)
    setEditId(null)
    setCreateEntryType('employee')
    setEmployeeForm(emptyEmployeeForm)
    setUserForm(resetUserForm())
  }

  const handleDeviceChange = (deviceId: number | '') => {
    const device = zkDevices.find((d) => d.id === deviceId)
    setEmployeeForm((current) => ({
      ...current,
      zk_device_id: deviceId,
      branch_id: device?.branch_id ?? current.branch_id,
    }))
  }

  const handleBranchChange = (branchId: number | '') => {
    const device = branchZkDevice(zkDevices, branchId)
    setEmployeeForm((current) => ({
      ...current,
      branch_id: branchId,
      zk_device_id: device?.id ?? '',
    }))
  }

  const handleAccountModeChange = (mode: EmployeeAccountMode) => {
    setEmployeeForm((current) => ({
      ...current,
      user_account_mode: mode,
      linked_user_id: mode === 'link' ? current.linked_user_id : '',
      name: mode === 'link' && current.linked_user_id ? current.name : current.name,
    }))
  }

  const handleLinkedUserChange = (userId: number | '', user?: AdminUser) => {
    setEmployeeForm((current) => ({
      ...current,
      linked_user_id: userId,
      name: user?.name ?? (userId ? current.name : ''),
      branch_id: user?.branch_id ?? current.branch_id,
      department_id: user?.section_id ?? current.department_id,
    }))
  }

  const openEdit = (emp: Employee) => {
    setEditId(emp.id)
    setCreateEntryType('employee')
    setEmployeeForm({
      user_account_mode: inferEmployeeAccountMode(emp),
      linked_user_id: emp.user_id ?? '',
      zk_device_id: branchZkDevice(zkDevices, emp.branch_id)?.id ?? '',
      zk_pin: emp.zk_pin ?? '',
      name: emp.name,
      phone: emp.phone ?? '',
      hrm_job_id: emp.hrm_job_id ?? '',
      salary: emp.salary != null ? String(emp.salary) : '',
      branch_id: emp.branch_id ?? '',
      department_id: emp.department_id ?? '',
      status: emp.status,
    })
  }

  const toggleAllowedBranch = (branchId: number) => {
    setUserForm((prev) => ({
      ...prev,
      branch_ids: prev.branch_ids.includes(branchId)
        ? prev.branch_ids.filter((id) => id !== branchId)
        : [...prev.branch_ids, branchId],
    }))
  }

  const toggleRole = (name: string) => {
    setUserForm((prev) => ({
      ...prev,
      role_names: prev.role_names.includes(name)
        ? prev.role_names.filter((r) => r !== name)
        : [...prev.role_names, name],
    }))
  }

  const zkDevices = zkDevicesQuery.data ?? []
  const linkableUsers = linkableUsersQuery.data ?? []
  const usesLinkedUser = employeeForm.user_account_mode === 'link' && Boolean(employeeForm.linked_user_id)
  const availableRoles = rolesQuery.data ?? []

  const filteredEmployees = useMemo(() => {
    const employees = query.data ?? []
    const term = debouncedSearch.trim().toLowerCase()
    if (!term) return employees
    return employees.filter((employee) => employeeSearchHaystack(employee, zkDevices).includes(term))
  }, [query.data, debouncedSearch, zkDevices])

  const selectedPermissions = useMemo(() => {
    const keys = new Set<string>()
    for (const roleName of userForm.role_names) {
      const role = availableRoles.find((item) => item.name === roleName)
      for (const permission of role?.permissions ?? []) {
        keys.add(permission.name)
      }
    }
    return [...keys].sort()
  }, [availableRoles, userForm.role_names])

  const employeeFormFields = (
    <>
      <EmployeeAccountModeField
        mode={employeeForm.user_account_mode}
        linkedUserId={employeeForm.linked_user_id}
        onModeChange={handleAccountModeChange}
        onLinkedUserChange={handleLinkedUserChange}
        users={linkableUsers}
        isLoading={linkableUsersQuery.isLoading}
      />
      {!usesLinkedUser && (
        <input
          placeholder="الاسم"
          value={employeeForm.name}
          onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
          required
          className={inputClass}
        />
      )}
      <input
        placeholder="الهاتف"
        value={employeeForm.phone}
        onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
        className={inputClass}
        dir="ltr"
      />
      <select
        value={employeeForm.hrm_job_id}
        onChange={(e) => setEmployeeForm({ ...employeeForm, hrm_job_id: e.target.value ? Number(e.target.value) : '' })}
        className={inputClass}
      >
        <option value="">الوظيفة</option>
        {(jobsQuery.data ?? []).map((job) => (
          <option key={job.id} value={job.id}>{job.name}</option>
        ))}
      </select>
      <input
        type="number"
        placeholder="الراتب"
        value={employeeForm.salary}
        onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })}
        className={inputClass}
        dir="ltr"
      />
      <select
        value={employeeForm.branch_id}
        onChange={(e) => handleBranchChange(e.target.value ? Number(e.target.value) : '')}
        className={inputClass}
      >
        <option value="">الفرع</option>
        {(branchesQuery.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name_ar ?? b.name}</option>)}
      </select>
      <select
        value={employeeForm.department_id}
        onChange={(e) => setEmployeeForm({ ...employeeForm, department_id: e.target.value ? Number(e.target.value) : '' })}
        className={inputClass}
      >
        <option value="">القسم</option>
        {(departmentsQuery.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name_ar ?? d.name}</option>)}
      </select>
      <EmployeeZkDeviceField
        value={employeeForm.zk_device_id}
        onChange={handleDeviceChange}
        devices={zkDevices}
        isLoading={zkDevicesQuery.isLoading}
      />
      <input
        placeholder="رقم البصمة"
        value={employeeForm.zk_pin}
        onChange={(e) => setEmployeeForm({ ...employeeForm, zk_pin: e.target.value })}
        className={inputClass}
        dir="ltr"
      />
      <p className="sm:col-span-2 text-[11px] text-on-surface-variant">
        للموظف المتحرك: استخدم نفس رقم البصمة على كل أجهزة الفروع المسموحة. الفرع هنا = الفرع الأساسي للرواتب.
      </p>
      <select
        value={employeeForm.status}
        onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
        className={inputClass}
      >
        <option value="active">نشط</option>
        <option value="inactive">غير نشط</option>
      </select>
    </>
  )

  const userFormFields = (
    <>
      <input
        placeholder="الاسم"
        value={userForm.name}
        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
        required
        className={inputClass}
      />
      <input
        type="email"
        placeholder="البريد"
        value={userForm.email}
        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
        required
        className={inputClass}
        dir="ltr"
      />
      <input
        type="password"
        placeholder="كلمة المرور"
        value={userForm.password}
        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
        required
        className={inputClass}
        dir="ltr"
      />
      <select
        value={userForm.administration_id}
        onChange={(e) => setUserForm({
          ...userForm,
          administration_id: e.target.value ? Number(e.target.value) : '',
          branch_id: '',
          branch_ids: [],
          section_id: '',
        })}
        disabled={!isOrgWide}
        className={inputClass}
      >
        <option value="">الإدارة</option>
        {(administrationsQuery.data ?? []).map((a) => (
          <option key={a.id} value={a.id}>{a.name_ar ?? a.name}</option>
        ))}
      </select>
      <select
        value={userForm.branch_id}
        onChange={(e) => setUserForm({
          ...userForm,
          branch_id: e.target.value ? Number(e.target.value) : '',
          section_id: '',
        })}
        disabled={!userForm.administration_id}
        className={inputClass}
      >
        <option value="">الفرع الأساسي</option>
        {(userFormBranchesQuery.data ?? []).map((b) => (
          <option key={b.id} value={b.id}>{b.name_ar ?? b.name}</option>
        ))}
      </select>
      <select
        value={userForm.section_id}
        onChange={(e) => setUserForm({ ...userForm, section_id: e.target.value ? Number(e.target.value) : '' })}
        disabled={!userForm.branch_id}
        className={inputClass}
      >
        <option value="">القسم</option>
        {(userFormSectionsQuery.data ?? []).map((s) => (
          <option key={s.id} value={s.id}>{s.name_ar ?? s.name}</option>
        ))}
      </select>
      <div className="sm:col-span-2">
        <p className="mb-xs text-xs text-on-surface-variant">الفروع المسموحة (للموظف المتحرك)</p>
        <div className="flex flex-wrap gap-xs rounded-lg border border-outline-variant p-sm">
          {(userFormBranchesQuery.data ?? []).length === 0 && (
            <span className="text-xs text-on-surface-variant">اختر الإدارة أولاً</span>
          )}
          {(userFormBranchesQuery.data ?? []).map((branch) => (
            <label key={branch.id} className="flex cursor-pointer items-center gap-xs rounded-lg border border-outline-variant px-sm py-1 text-sm">
              <input
                type="checkbox"
                checked={userForm.branch_ids.includes(branch.id)}
                onChange={() => toggleAllowedBranch(branch.id)}
              />
              {branch.name_ar ?? branch.name}
            </label>
          ))}
        </div>
        <p className="mt-xs text-[11px] text-on-surface-variant">
          عند تحديد فرع وقسم يُنشأ سجل موظف تلقائياً ويرتبط بالحساب.
        </p>
      </div>
      <div className="sm:col-span-2">
        <p className="mb-xs text-xs text-on-surface-variant">الأدوار</p>
        <div className="flex flex-wrap gap-xs">
          {availableRoles.map((role) => (
            <label key={role.id} className="flex cursor-pointer items-center gap-xs rounded-lg border border-outline-variant px-sm py-1 text-sm">
              <input
                type="checkbox"
                checked={userForm.role_names.includes(role.name)}
                onChange={() => toggleRole(role.name)}
              />
              {formatRoleLabel(role)}
            </label>
          ))}
        </div>
        {selectedPermissions.length > 0 && (
          <p className="mt-xs text-[11px] leading-relaxed text-on-surface-variant">
            الصلاحيات الناتجة: {selectedPermissions.join(' · ')}
          </p>
        )}
      </div>
    </>
  )

  const modalTitle = editId ? 'تعديل موظف' : createEntryType === 'user' ? 'مستخدم جديد' : 'موظف جديد'
  const isSaving = saveEmployeeMutation.isPending || saveUserMutation.isPending

  return (
    <div>
      <PageHeader title="الموظفون" subtitle="إدارة سجل الموظفين" actions={
        <button
          type="button"
          onClick={() => {
            setPanelOpen(true)
            setEditId(null)
            setCreateEntryType('employee')
            setEmployeeForm(emptyEmployeeForm)
            setUserForm(resetUserForm())
          }}
          className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
        >
          <Icon name="person_add" size={18} /> موظف جديد
        </button>
      } />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث في الاسم، البصمة، الوظيفة، الفرع، الجهاز، الراتب، الحالة..."
        showClear={Boolean(search)}
        onClear={() => setSearch('')}
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<Employee & Record<string, unknown>>
          data={filteredEmployees as (Employee & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          maxHeight="70vh"
          emptyMessage={search.trim() ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد بيانات'}
          columns={[
            { key: 'zk_pin', header: 'رقم البصمة', render: (row) => row.zk_pin ?? '—', className: 'tabular-nums' },
            {
              key: 'name',
              header: 'الاسم',
              render: (row) => (
                <span className="inline-flex items-center gap-sm">
                  <ProfileAvatar
                    name={row.name}
                    photoUrl={row.profile_photo_url}
                    variant="employee"
                    size="sm"
                  />
                  {row.name}
                </span>
              ),
            },
            { key: 'job_title', header: 'الوظيفة', render: (row) => row.job?.name ?? row.job_title ?? '—' },
            { key: 'branch', header: 'الفرع', render: (row) => row.branch?.name_ar ?? row.branch?.name ?? '—' },
            {
              key: 'zk_device',
              header: 'جهاز البصمة',
              render: (row) => zkDeviceLabel(branchZkDevice(zkDevices, row.branch_id)),
              className: 'tabular-nums',
            },
            { key: 'salary', header: 'الراتب', className: 'tabular-nums', render: (row) => row.salary != null ? Number(row.salary).toLocaleString('ar-EG') : '—' },
            { key: 'status', header: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
            { key: 'actions', header: '', render: (row) => (
              <EntityRowActions
                row={row as Employee}
                config={crudConfig}
                queryKeys={[['employees']]}
                onEdit={openEdit}
              />
            ) },
          ]}
        />
        {!query.isLoading && !query.isError && (
          <p className="mt-sm text-xs text-on-surface-variant">
            إجمالي {filteredEmployees.length}
            {debouncedSearch.trim() && query.data
              ? ` من أصل ${query.data.length}`
              : null}
          </p>
        )}
      </AsyncState>

      <Modal open={modalOpen} onClose={closeModal} title={modalTitle}>
        {isCreateMode && canCreateUsers && (
          <div className="mb-md flex gap-xs rounded-lg border border-outline-variant p-1">
            {([
              { id: 'employee' as const, label: 'موظف' },
              { id: 'user' as const, label: 'مستخدم' },
            ]).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setCreateEntryType(option.id)
                  if (option.id === 'user') {
                    setUserForm((prev) => ({
                      ...prev,
                      administration_id:
                        prev.administration_id !== ''
                          ? prev.administration_id
                          : scopedAdminId != null
                            ? scopedAdminId
                            : '',
                    }))
                  }
                }}
                className={`flex-1 rounded-md px-sm py-2 text-sm font-semibold transition-colors ${
                  createEntryType === option.id
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (isCreateMode && createEntryType === 'user') {
              saveUserMutation.mutate()
              return
            }
            saveEmployeeMutation.mutate()
          }}
          className="grid gap-sm sm:grid-cols-2"
        >
          {isCreateMode && createEntryType === 'user' ? userFormFields : employeeFormFields}
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-secondary py-2 text-sm font-bold text-on-secondary sm:col-span-2"
          >
            حفظ
          </button>
        </form>
      </Modal>
    </div>
  )
}
