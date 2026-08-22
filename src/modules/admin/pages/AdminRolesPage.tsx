import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { AdminRole } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'
import { formatRoleLabel, isProtectedRoleSlug } from '../../../lib/roleCatalog'
import { useAuthStore } from '../../../stores/authStore'
import { isSuperAdmin } from '../../../lib/access'

export function AdminRolesPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const orgWide = isSuperAdmin(user)
  const canManageAdminOverride = user?.data_scope === 'administration'

  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const { data } = await api.get<AdminRole[]>('/admin/roles')
      return data
    },
  })

  return (
    <div>
      <PageHeader
        title="الأدوار والصلاحيات"
        subtitle={
          orgWide
            ? 'تعريف الأدوار وربط الصلاحيات'
            : canManageAdminOverride
              ? 'تعديل صلاحيات الأدوار لموظفي إدارتك دون تغيير تعريف الشركة'
              : 'عرض الأدوار المتاحة وإنشاء أدوار مخصصة لموظفي إدارتك'
        }
        actions={
          <button
            type="button"
            onClick={() => navigate('/admin/roles/new/permissions')}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} /> دور مخصص جديد
          </button>
        }
      />

      <AsyncState isLoading={rolesQuery.isLoading} isError={rolesQuery.isError} error={rolesQuery.error}>
        <DataTable<AdminRole & Record<string, unknown>>
          data={(rolesQuery.data ?? []) as (AdminRole & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          columns={[
            {
              key: 'name',
              header: 'الدور',
              render: (row) => (
                <span className="inline-flex flex-wrap items-center gap-xs">
                  {formatRoleLabel(row)}
                  {row.is_administration_override && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      تجاوز الإدارة
                    </span>
                  )}
                </span>
              ),
            },
            {
              key: 'count',
              header: 'عدد الصلاحيات',
              render: (row) => row.permissions_count ?? row.permissions?.length ?? 0,
            },
            {
              key: 'actions',
              header: '',
              render: (row) => {
                const readOnly = !orgWide && !canManageAdminOverride && isProtectedRoleSlug(row.name)
                const adminOverride = !orgWide && canManageAdminOverride && isProtectedRoleSlug(row.name)
                return (
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/roles/${row.id}/permissions`)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {readOnly ? 'عرض الصلاحيات' : adminOverride ? 'تعديل صلاحيات الإدارة' : 'تعديل الصلاحيات'}
                  </button>
                )
              },
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
