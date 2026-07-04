import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { AdminRole, PermissionGroups } from '../../../api/types'
import { formatRoleLabel, isProtectedRoleSlug } from '../../../lib/roleCatalog'
import { isSuperAdmin } from '../../../lib/access'
import { useAuthStore } from '../../../stores/authStore'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import { ToastBanner } from '../../../components/ToastBanner'
import { RolePermissionsEditor } from '../components/RolePermissionsEditor'

function flattenPermissionGroups(groups: PermissionGroups): string[] {
  return [...new Set(Object.values(groups).flat())]
}

export function AdminRolePermissionsPage() {
  const { roleId } = useParams<{ roleId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const authUser = useAuthStore((s) => s.user)
  const isNew = roleId === 'new'
  const orgWide = isSuperAdmin(authUser)

  const [roleNameAr, setRoleNameAr] = useState('')
  const [roleSlug, setRoleSlug] = useState<string | undefined>()
  const [permissions, setPermissions] = useState<string[]>([])
  const [toast, setToast] = useState('')

  const roleQuery = useQuery({
    queryKey: ['admin', 'roles', roleId],
    queryFn: async () => {
      const { data } = await api.get<AdminRole>(`/admin/roles/${roleId}`)
      return data
    },
    enabled: !isNew && Boolean(roleId),
  })

  const permissionsQuery = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: async () => {
      const { data } = await api.get<PermissionGroups>('/admin/permissions')
      return data
    },
  })

  useEffect(() => {
    if (roleQuery.data) {
      setRoleNameAr(formatRoleLabel(roleQuery.data))
      setRoleSlug(roleQuery.data.name)
      setPermissions(roleQuery.data.permissions?.map((p) => p.name) ?? [])
    }
  }, [roleQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name_ar: roleNameAr, permissions }
      if (isNew) {
        const { data } = await api.post<AdminRole>('/admin/roles', payload)
        return data
      }
      const { data } = await api.put<AdminRole>(`/admin/roles/${roleId}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
      navigate('/admin/roles')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const apiKeys = permissionsQuery.data ? flattenPermissionGroups(permissionsQuery.data) : undefined
  const canEdit = isNew || orgWide || (roleSlug ? !isProtectedRoleSlug(roleSlug) : false)
  const isLoading = (!isNew && roleQuery.isLoading) || permissionsQuery.isLoading
  const isError = roleQuery.isError || permissionsQuery.isError
  const error = roleQuery.error ?? permissionsQuery.error

  return (
    <div>
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <div>
          <nav className="mb-xs flex items-center gap-xs text-xs text-on-surface-variant">
            <Link to="/admin/roles" className="hover:text-primary">
              الأدوار
            </Link>
            <Icon name="chevron_left" size={16} />
            <span>صلاحيات الدور</span>
          </nav>
          <h1 className="text-2xl font-bold text-on-surface">
            {isNew ? 'دور جديد' : `صلاحيات: ${roleNameAr || '...'}`}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {canEdit ? 'تحديد الصلاحيات الممنوحة لهذا الدور' : 'عرض صلاحيات دور نظامي — لا يمكن تعديله من مدير الإدارة'}
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <Link
            to="/admin/roles"
            className="rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface-variant hover:bg-surface-container-high"
          >
            {canEdit ? 'إلغاء' : 'رجوع'}
          </Link>
          {canEdit && (
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !roleNameAr.trim()}
              className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary disabled:opacity-60"
            >
              <Icon name="save" size={18} />
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          )}
        </div>
      </div>

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={isLoading} isError={isError} error={error}>
        <RolePermissionsEditor
          roleNameAr={roleNameAr}
          roleSlug={roleSlug}
          selected={permissions}
          apiPermissionKeys={apiKeys}
          onChange={setPermissions}
          onRoleNameArChange={setRoleNameAr}
          isNew={isNew}
          readOnly={!canEdit}
        />
      </AsyncState>
    </div>
  )
}
