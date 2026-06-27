import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { AdminUser, Branch, Department, Employee, HrmJob, PaginatedResponse, ZkDevice } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ProfileAvatar } from '../../../components/ProfileAvatar'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'
import { EntityRowActions } from '../../../components/crud/EntityRowActions'
import { getEntityCrudConfig } from '../../../lib/crud/entityCrudRegistry'
import { EmployeeUserField } from '../components/EmployeeUserField'
import { EmployeeZkDeviceField } from '../components/EmployeeZkDeviceField'
import { branchZkDevice, zkDeviceLabel } from '../lib/zkDevice'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const emptyForm = {
  user_id: '' as number | '',
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

export function HrmEmployeesPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState('')
  const crudConfig = getEntityCrudConfig('employees')

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
    enabled: panelOpen || editId !== null,
  })

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'hrm-employees'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/departments', { params: { per_page: 100 } })
      return data.data
    },
    enabled: panelOpen || editId !== null,
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
    enabled: panelOpen || editId !== null,
  })

  const linkableUsersQuery = useQuery({
    queryKey: ['employees', 'linkable-users', editId],
    queryFn: async () => {
      const params: Record<string, number> = {}
      if (editId) params.employee_id = editId
      const { data } = await api.get<{ data: AdminUser[] }>('/employees/linkable-users', { params })
      return data.data
    },
    enabled: panelOpen || editId !== null,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const selectedUser = form.user_id
        ? linkableUsersQuery.data?.find((user) => user.id === form.user_id)
        : undefined
      const payload = {
        user_id: form.user_id ? Number(form.user_id) : null,
        zk_pin: form.zk_pin || undefined,
        name: selectedUser?.name ?? form.name,
        phone: form.phone || undefined,
        hrm_job_id: form.hrm_job_id ? Number(form.hrm_job_id) : null,
        salary: form.salary ? Number(form.salary) : undefined,
        branch_id: form.branch_id ? Number(form.branch_id) : undefined,
        department_id: form.department_id ? Number(form.department_id) : undefined,
        status: form.status,
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
      setPanelOpen(false)
      setEditId(null)
      setForm(emptyForm)
      setToast('تم حفظ الموظف')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

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

  const openEdit = (emp: Employee) => {
    setEditId(emp.id)
    setForm({
      user_id: emp.user_id ?? '',
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

  const handleUserChange = (userId: number | '', user?: AdminUser) => {
    setForm((current) => ({
      ...current,
      user_id: userId,
      name: user?.name ?? (userId ? current.name : ''),
      branch_id: user?.branch_id ?? current.branch_id,
      department_id: user?.section_id ?? current.department_id,
    }))
  }

  const zkDevices = zkDevicesQuery.data ?? []
  const linkableUsers = linkableUsersQuery.data ?? []
  const usesExistingUser = Boolean(form.user_id)

  const formFields = (
    <>
      <EmployeeUserField
        value={form.user_id}
        onChange={handleUserChange}
        users={linkableUsers}
        isLoading={linkableUsersQuery.isLoading}
      />
      {!usesExistingUser && (
        <input placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
      )}
      <input placeholder="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} dir="ltr" />
      <select value={form.hrm_job_id} onChange={(e) => setForm({ ...form, hrm_job_id: e.target.value ? Number(e.target.value) : '' })} className={inputClass}>
        <option value="">الوظيفة</option>
        {(jobsQuery.data ?? []).map((job) => (
          <option key={job.id} value={job.id}>{job.name}</option>
        ))}
      </select>
      <input type="number" placeholder="الراتب" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className={inputClass} dir="ltr" />
      <select
        value={form.branch_id}
        onChange={(e) => handleBranchChange(e.target.value ? Number(e.target.value) : '')}
        className={inputClass}
      >
        <option value="">الفرع</option>
        {(branchesQuery.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name_ar ?? b.name}</option>)}
      </select>
      <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value ? Number(e.target.value) : '' })} className={inputClass}>
        <option value="">القسم</option>
        {(departmentsQuery.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name_ar ?? d.name}</option>)}
      </select>
      <EmployeeZkDeviceField
        value={form.zk_device_id}
        onChange={handleDeviceChange}
        devices={zkDevices}
        isLoading={zkDevicesQuery.isLoading}
      />
      <input placeholder="رقم البصمة" value={form.zk_pin} onChange={(e) => setForm({ ...form, zk_pin: e.target.value })} className={inputClass} dir="ltr" />
      <p className="sm:col-span-2 text-[11px] text-on-surface-variant">
        للموظف المتحرك: استخدم نفس رقم البصمة على كل أجهزة الفروع المسموحة. الفرع هنا = الفرع الأساسي للرواتب.
      </p>
      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
        <option value="active">نشط</option>
        <option value="inactive">غير نشط</option>
      </select>
    </>
  )

  return (
    <div>
      <PageHeader title="الموظفون" subtitle="إدارة سجل الموظفين" actions={
        <button type="button" onClick={() => { setPanelOpen(true); setEditId(null); setForm(emptyForm) }} className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary">
          <Icon name="person_add" size={18} /> موظف جديد
        </button>
      } />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<Employee & Record<string, unknown>>
          data={(query.data ?? []) as (Employee & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
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
      </AsyncState>

      <Modal open={panelOpen || editId !== null} onClose={() => { setPanelOpen(false); setEditId(null) }} title={editId ? 'تعديل موظف' : 'موظف جديد'}>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="grid gap-sm sm:grid-cols-2">
          {formFields}
          <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-secondary py-2 text-sm font-bold text-on-secondary sm:col-span-2">حفظ</button>
        </form>
      </Modal>
    </div>
  )
}
