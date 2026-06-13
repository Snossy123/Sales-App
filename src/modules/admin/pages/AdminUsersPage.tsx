import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { AdminUser, Branch, PaginatedResponse, AdminRole } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const emptyForm = {
  name: '',
  email: '',
  password: '',
  branch_id: '' as number | '',
  role_names: [] as string[],
}

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState('')

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AdminUser>>('/admin/users', {
        params: { per_page: 50, include: 'branch,roles' },
      })
      return data.data
    },
  })

  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const { data } = await api.get<AdminRole[]>('/admin/roles')
      return data
    },
    enabled: panelOpen || editId !== null,
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'admin-users'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params: { per_page: 100 } })
      return data.data
    },
    enabled: panelOpen || editId !== null,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        email: form.email,
        branch_id: form.branch_id ? Number(form.branch_id) : undefined,
        role_names: form.role_names,
        ...(form.password ? { password: form.password } : {}),
      }
      if (editId) {
        const { data } = await api.put<AdminUser>(`/admin/users/${editId}`, payload)
        return data
      }
      const { data } = await api.post<AdminUser>('/admin/users', { ...payload, password: form.password })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setPanelOpen(false)
      setEditId(null)
      setForm(emptyForm)
      setToast('تم حفظ المستخدم')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const openEdit = (user: AdminUser) => {
    setEditId(user.id)
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      branch_id: user.branch_id ?? '',
      role_names: user.roles?.map((r) => r.name) ?? [],
    })
  }

  const toggleRole = (name: string) => {
    setForm((prev) => ({
      ...prev,
      role_names: prev.role_names.includes(name)
        ? prev.role_names.filter((r) => r !== name)
        : [...prev.role_names, name],
    }))
  }

  const formFields = (
    <>
      <input placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
      <input type="email" placeholder="البريد" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className={inputClass} dir="ltr" />
      <input type="password" placeholder={editId ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} className={inputClass} dir="ltr" />
      <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value ? Number(e.target.value) : '' })} className={inputClass}>
        <option value="">الفرع</option>
        {(branchesQuery.data ?? []).map((b) => (
          <option key={b.id} value={b.id}>{b.name_ar ?? b.name}</option>
        ))}
      </select>
      <div className="sm:col-span-2">
        <p className="mb-xs text-xs text-on-surface-variant">الأدوار</p>
        <div className="flex flex-wrap gap-xs">
          {(rolesQuery.data ?? []).map((role) => (
            <label key={role.id} className="flex cursor-pointer items-center gap-xs rounded-lg border border-outline-variant px-sm py-1 text-sm">
              <input type="checkbox" checked={form.role_names.includes(role.name)} onChange={() => toggleRole(role.name)} />
              {role.name}
            </label>
          ))}
        </div>
      </div>
    </>
  )

  return (
    <div>
      <PageHeader
        title="المستخدمون"
        subtitle="إدارة حسابات الموظفين والأدوار"
        actions={
          <button type="button" onClick={() => { setPanelOpen(true); setEditId(null); setForm(emptyForm) }} className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary">
            <Icon name="person_add" size={18} /> مستخدم جديد
          </button>
        }
      />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={usersQuery.isLoading} isError={usersQuery.isError} error={usersQuery.error}>
        <DataTable<AdminUser & Record<string, unknown>>
          data={(usersQuery.data ?? []) as (AdminUser & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'name', header: 'الاسم' },
            { key: 'email', header: 'البريد', className: 'tabular-nums', render: (row) => row.email },
            { key: 'branch', header: 'الفرع', render: (row) => row.branch?.name_ar ?? row.branch?.name ?? '—' },
            { key: 'roles', header: 'الأدوار', render: (row) => row.roles?.map((r) => r.name).join('، ') ?? '—' },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <button type="button" onClick={() => openEdit(row)} className="text-xs text-primary hover:underline">تعديل</button>
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal open={panelOpen || editId !== null} onClose={() => { setPanelOpen(false); setEditId(null) }} title={editId ? 'تعديل مستخدم' : 'مستخدم جديد'}>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="grid gap-sm sm:grid-cols-2">
          {formFields}
          <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-secondary py-2 text-sm font-bold text-on-secondary sm:col-span-2">
            حفظ
          </button>
        </form>
      </Modal>
    </div>
  )
}
