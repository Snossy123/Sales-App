import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Branch, Department, Employee, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { ToastBanner } from '../../../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const emptyForm = {
  employee_code: '',
  name: '',
  phone: '',
  job_title: '',
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

  const query = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, include: 'branch,department,user' },
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_code: form.employee_code,
        name: form.name,
        phone: form.phone || undefined,
        job_title: form.job_title || undefined,
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

  const openEdit = (emp: Employee) => {
    setEditId(emp.id)
    setForm({
      employee_code: emp.employee_code,
      name: emp.name,
      phone: emp.phone ?? '',
      job_title: emp.job_title ?? '',
      salary: emp.salary != null ? String(emp.salary) : '',
      branch_id: emp.branch_id ?? '',
      department_id: emp.department_id ?? '',
      status: emp.status,
    })
  }

  const formFields = (
    <>
      <input placeholder="كود الموظف" value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} required className={inputClass} dir="ltr" />
      <input placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
      <input placeholder="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} dir="ltr" />
      <input placeholder="المسمى الوظيفي" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} className={inputClass} />
      <input type="number" placeholder="الراتب" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className={inputClass} dir="ltr" />
      <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value ? Number(e.target.value) : '' })} className={inputClass}>
        <option value="">الفرع</option>
        {(branchesQuery.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name_ar ?? b.name}</option>)}
      </select>
      <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value ? Number(e.target.value) : '' })} className={inputClass}>
        <option value="">القسم</option>
        {(departmentsQuery.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name_ar ?? d.name}</option>)}
      </select>
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
            { key: 'employee_code', header: 'الكود' },
            { key: 'name', header: 'الاسم' },
            { key: 'job_title', header: 'الوظيفة', render: (row) => row.job_title ?? '—' },
            { key: 'branch', header: 'الفرع', render: (row) => row.branch?.name_ar ?? row.branch?.name ?? '—' },
            { key: 'salary', header: 'الراتب', className: 'tabular-nums', render: (row) => row.salary != null ? Number(row.salary).toLocaleString('ar-EG') : '—' },
            { key: 'status', header: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
            { key: 'actions', header: '', render: (row) => (
              <button type="button" onClick={() => openEdit(row)} className="text-xs text-primary hover:underline">تعديل</button>
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
