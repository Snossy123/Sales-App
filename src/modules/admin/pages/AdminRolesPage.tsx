import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { AdminRole, PermissionGroups } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function AdminRolesPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [toast, setToast] = useState('')

  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const { data } = await api.get<AdminRole[]>('/admin/roles')
      return data
    },
  })

  const permissionsQuery = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: async () => {
      const { data } = await api.get<PermissionGroups>('/admin/permissions')
      return data
    },
    enabled: panelOpen || editId !== null,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name, permissions }
      if (editId) {
        const { data } = await api.put<AdminRole>(`/admin/roles/${editId}`, payload)
        return data
      }
      const { data } = await api.post<AdminRole>('/admin/roles', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
      setPanelOpen(false)
      setEditId(null)
      setName('')
      setPermissions([])
      setToast('تم حفظ الدور')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const openEdit = (role: AdminRole) => {
    setEditId(role.id)
    setName(role.name)
    setPermissions(role.permissions?.map((p) => p.name) ?? [])
  }

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    )
  }

  const groups = permissionsQuery.data ?? {}

  return (
    <div>
      <PageHeader
        title="الأدوار والصلاحيات"
        subtitle="تعريف الأدوار وربط الصلاحيات"
        actions={
          <button type="button" onClick={() => { setPanelOpen(true); setEditId(null); setName(''); setPermissions([]) }} className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary">
            <Icon name="add" size={18} /> دور جديد
          </button>
        }
      />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={rolesQuery.isLoading} isError={rolesQuery.isError} error={rolesQuery.error}>
        <DataTable<AdminRole & Record<string, unknown>>
          data={(rolesQuery.data ?? []) as (AdminRole & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'name', header: 'الدور' },
            { key: 'count', header: 'عدد الصلاحيات', render: (row) => row.permissions_count ?? row.permissions?.length ?? 0 },
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

      <Modal open={panelOpen || editId !== null} onClose={() => { setPanelOpen(false); setEditId(null) }} title={editId ? 'تعديل دور' : 'دور جديد'}>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="space-y-sm">
          <input placeholder="اسم الدور" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} dir="ltr" />
          <div className="max-h-80 space-y-sm overflow-y-auto rounded-lg border border-outline-variant p-sm">
            {Object.entries(groups).map(([group, perms]) => (
              <div key={group}>
                <p className="mb-xs text-xs font-bold uppercase text-on-surface-variant">{group}</p>
                <div className="flex flex-wrap gap-xs">
                  {perms.map((perm) => (
                    <label key={perm} className="flex cursor-pointer items-center gap-xs rounded border border-outline-variant px-xs py-0.5 text-xs">
                      <input type="checkbox" checked={permissions.includes(perm)} onChange={() => togglePermission(perm)} />
                      {perm}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button type="submit" disabled={saveMutation.isPending} className="w-full rounded-lg bg-secondary py-2 text-sm font-bold text-on-secondary">حفظ</button>
        </form>
      </Modal>
    </div>
  )
}
