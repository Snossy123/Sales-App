import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Administration, AdminUser, Branch, PaginatedResponse, AdminRole, Section } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { FilterBar } from '../../../components/FilterBar'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { Pagination } from '../../../components/Pagination'
import { ToastBanner } from '../../../components/ToastBanner'
import { useAuthStore } from '../../../stores/authStore'
import { getScopedDepartmentId, isDepartmentAdmin, isSuperAdmin } from '../../../lib/access'
import { formatRoleLabel } from '../../../lib/roleCatalog'
import { getAdministrationApiFilters } from '../../../lib/administrationScope'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'
const PER_PAGE = 15

const emptyForm = {
  name: '',
  email: '',
  password: '',
  administration_id: '' as number | '',
  branch_id: '' as number | '',
  section_id: '' as number | '',
  role_names: [] as string[],
}

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const scopedAdminId = getScopedDepartmentId(user)
  const isOrgWide = isSuperAdmin(user)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [adminFilter, setAdminFilter] = useState(() => (scopedAdminId ? String(scopedAdminId) : ''))
  const [branchFilter, setBranchFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', page, search, adminFilter, branchFilter, sectionFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: PER_PAGE,
        page,
        include: 'administration,branch,section,roles',
      }
      if (search) params['filter[name]'] = search
      if (adminFilter) params['filter[administration_id]'] = Number(adminFilter)
      else Object.assign(params, getAdministrationApiFilters(user))
      if (branchFilter) params['filter[branch_id]'] = Number(branchFilter)
      if (sectionFilter) params['filter[section_id]'] = Number(sectionFilter)
      const { data } = await api.get<PaginatedResponse<AdminUser>>('/admin/users', { params })
      return data
    },
  })

  const administrationsQuery = useQuery({
    queryKey: ['administrations', 'admin-users'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Administration>>('/administrations', { params: { per_page: 100 } })
      return data.data
    },
  })

  const filterBranchesQuery = useQuery({
    queryKey: ['branches', 'admin-users-filter', adminFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (adminFilter) params['filter[administration_id]'] = Number(adminFilter)
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params })
      return data.data
    },
    enabled: Boolean(adminFilter),
  })

  const filterSectionsQuery = useQuery({
    queryKey: ['departments', 'admin-users-filter', branchFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (branchFilter) params['filter[branch_id]'] = Number(branchFilter)
      const { data } = await api.get<PaginatedResponse<Section>>('/departments', { params })
      return data.data
    },
    enabled: Boolean(branchFilter),
  })

  const formBranchesQuery = useQuery({
    queryKey: ['branches', 'admin-users-form', form.administration_id],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (form.administration_id) params['filter[administration_id]'] = Number(form.administration_id)
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params })
      return data.data
    },
    enabled: panelOpen || editId !== null,
  })

  const formSectionsQuery = useQuery({
    queryKey: ['departments', 'admin-users-form', form.branch_id],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (form.branch_id) params['filter[branch_id]'] = Number(form.branch_id)
      const { data } = await api.get<PaginatedResponse<Section>>('/departments', { params })
      return data.data
    },
    enabled: (panelOpen || editId !== null) && Boolean(form.branch_id),
  })

  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const { data } = await api.get<AdminRole[]>('/admin/roles')
      return data
    },
    enabled: panelOpen || editId !== null,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        email: form.email,
        administration_id: form.administration_id ? Number(form.administration_id) : undefined,
        branch_id: form.branch_id ? Number(form.branch_id) : undefined,
        section_id: form.section_id ? Number(form.section_id) : undefined,
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
      administration_id: user.administration_id ?? user.department_id ?? '',
      branch_id: user.branch_id ?? '',
      section_id: user.section_id ?? '',
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

  const hasFilters = Boolean(search || adminFilter || branchFilter || sectionFilter)

  const availableRoles = useMemo(
    () => (rolesQuery.data ?? []).filter((role) => {
      if (isOrgWide) return true
      return !['Admin', 'AdministrationManager', 'Super Admin'].includes(role.name)
    }),
    [rolesQuery.data, isOrgWide],
  )

  const adminOptions = useMemo(
    () => (administrationsQuery.data ?? []).map((a) => ({ value: String(a.id), label: a.name_ar ?? a.name })),
    [administrationsQuery.data],
  )

  const branchOptions = useMemo(
    () => (filterBranchesQuery.data ?? []).map((b) => ({ value: String(b.id), label: b.name_ar ?? b.name })),
    [filterBranchesQuery.data],
  )

  const sectionOptions = useMemo(
    () => (filterSectionsQuery.data ?? []).map((s) => ({ value: String(s.id), label: s.name_ar ?? s.name })),
    [filterSectionsQuery.data],
  )

  useEffect(() => {
    setPage(1)
  }, [search, adminFilter, branchFilter, sectionFilter])

  useEffect(() => {
    if (!adminFilter) setBranchFilter('')
  }, [adminFilter])

  useEffect(() => {
    if (!branchFilter) setSectionFilter('')
  }, [branchFilter])

  const formFields = (
    <>
      <input placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
      <input type="email" placeholder="البريد" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className={inputClass} dir="ltr" />
      <input type="password" placeholder={editId ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} className={inputClass} dir="ltr" />
      <select
        value={form.administration_id}
        onChange={(e) => setForm({
          ...form,
          administration_id: e.target.value ? Number(e.target.value) : '',
          branch_id: '',
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
        value={form.branch_id}
        onChange={(e) => setForm({
          ...form,
          branch_id: e.target.value ? Number(e.target.value) : '',
          section_id: '',
        })}
        disabled={!form.administration_id}
        className={inputClass}
      >
        <option value="">الفرع</option>
        {(formBranchesQuery.data ?? []).map((b) => (
          <option key={b.id} value={b.id}>{b.name_ar ?? b.name}</option>
        ))}
      </select>
      <select
        value={form.section_id}
        onChange={(e) => setForm({ ...form, section_id: e.target.value ? Number(e.target.value) : '' })}
        disabled={!form.branch_id}
        className={inputClass}
      >
        <option value="">القسم</option>
        {(formSectionsQuery.data ?? []).map((s) => (
          <option key={s.id} value={s.id}>{s.name_ar ?? s.name}</option>
        ))}
      </select>
      <div className="sm:col-span-2">
        <p className="mb-xs text-xs text-on-surface-variant">الأدوار</p>
        <div className="flex flex-wrap gap-xs">
          {(availableRoles).map((role) => (
            <label key={role.id} className="flex cursor-pointer items-center gap-xs rounded-lg border border-outline-variant px-sm py-1 text-sm">
              <input type="checkbox" checked={form.role_names.includes(role.name)} onChange={() => toggleRole(role.name)} />
              {formatRoleLabel(role)}
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
        subtitle={isDepartmentAdmin(user) ? 'إدارة مستخدمي إدارتك فقط' : 'إدارة حسابات الموظفين والأدوار'}
        actions={
          <button type="button" onClick={() => {
            setPanelOpen(true)
            setEditId(null)
            setForm({
              ...emptyForm,
              administration_id: scopedAdminId ?? '',
            })
          }} className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary">
            <Icon name="person_add" size={18} /> مستخدم جديد
          </button>
        }
      />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم..."
        selects={[
          ...(isOrgWide ? [{
            id: 'administration',
            label: 'الإدارة',
            value: adminFilter,
            options: [{ value: '', label: 'كل الإدارات' }, ...adminOptions],
            onChange: setAdminFilter,
          }] : []),
          {
            id: 'branch',
            label: 'الفرع',
            value: branchFilter,
            options: [{ value: '', label: 'كل الفروع' }, ...branchOptions],
            onChange: setBranchFilter,
          },
          {
            id: 'section',
            label: 'القسم',
            value: sectionFilter,
            options: [{ value: '', label: 'كل الأقسام' }, ...sectionOptions],
            onChange: setSectionFilter,
          },
        ]}
        showClear={hasFilters}
        onClear={() => {
          setSearch('')
          setAdminFilter('')
          setBranchFilter('')
          setSectionFilter('')
        }}
      />

      <AsyncState isLoading={usersQuery.isLoading} isError={usersQuery.isError} error={usersQuery.error}>
        <DataTable<AdminUser & Record<string, unknown>>
          data={(usersQuery.data?.data ?? []) as (AdminUser & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'name', header: 'الاسم' },
            { key: 'email', header: 'البريد', className: 'tabular-nums', render: (row) => row.email },
            {
              key: 'administration',
              header: 'الإدارة',
              render: (row) => row.administration?.name_ar ?? row.administration?.name ?? '—',
            },
            { key: 'branch', header: 'الفرع', render: (row) => row.branch?.name_ar ?? row.branch?.name ?? '—' },
            { key: 'section', header: 'القسم', render: (row) => row.section?.name_ar ?? row.section?.name ?? '—' },
            { key: 'roles', header: 'الأدوار', render: (row) => row.roles?.map((r) => formatRoleLabel(r)).join('، ') ?? '—' },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <button type="button" onClick={() => openEdit(row)} className="text-xs text-primary hover:underline">تعديل</button>
              ),
            },
          ]}
        />
        {usersQuery.data && (
          <Pagination
            currentPage={page}
            lastPage={usersQuery.data.last_page ?? 1}
            total={usersQuery.data.total ?? 0}
            onPageChange={setPage}
          />
        )}
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
