import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { AdminRole } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { PageHeader } from '../../../components/PageHeader'

export function AdminRolesPage() {
  const navigate = useNavigate()

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
        subtitle="تعريف الأدوار وربط الصلاحيات"
        actions={
          <button
            type="button"
            onClick={() => navigate('/admin/roles/new/permissions')}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} /> دور جديد
          </button>
        }
      />

      <AsyncState isLoading={rolesQuery.isLoading} isError={rolesQuery.isError} error={rolesQuery.error}>
        <DataTable<AdminRole & Record<string, unknown>>
          data={(rolesQuery.data ?? []) as (AdminRole & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'name', header: 'الدور' },
            {
              key: 'count',
              header: 'عدد الصلاحيات',
              render: (row) => row.permissions_count ?? row.permissions?.length ?? 0,
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => navigate(`/admin/roles/${row.id}/permissions`)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  تعديل الصلاحيات
                </button>
              ),
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
