import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Branch, Department, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { KpiCard } from '../components/KpiCard'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useAuthStore } from '../stores/authStore'
import { canAccessDepartment, isSuperAdmin } from '../lib/access'

export function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const departmentId = Number(id)
  const user = useAuthStore((s) => s.user)

  if (!id || Number.isNaN(departmentId)) {
    return <Navigate to="/" replace />
  }

  if (!canAccessDepartment(user, departmentId)) {
    return <Navigate to="/" replace />
  }

  const departmentQuery = useQuery({
    queryKey: ['departments', departmentId],
    queryFn: async () => {
      const { data } = await api.get<Department>(`/departments/${departmentId}`)
      return data
    },
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'department', departmentId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[department_id]': departmentId },
      })
      return data.data
    },
  })

  const dept = departmentQuery.data
  const branches = branchesQuery.data ?? []

  const kpis = useMemo(() => {
    const stock = dept?.department_stock
    return [
      { label: 'مخزون الإدارة', value: String(stock?.quantity ?? 0), icon: 'inventory_2' },
      { label: 'قيد التوزيع', value: String(stock?.pending ?? 0), icon: 'pending' },
      { label: 'موزّع للفروع', value: String(stock?.distributed ?? 0), icon: 'local_shipping' },
      { label: 'عدد الفروع', value: String(branches.length), icon: 'store' },
    ]
  }, [dept, branches.length])

  return (
    <div className="space-y-md">
      <nav className="mb-sm">
        <ol className="flex gap-xs text-body-sm text-secondary">
          {isSuperAdmin(user) && (
            <>
              <li>
                <Link to="/departments" className="transition-colors hover:text-primary">
                  الإدارات
                </Link>
              </li>
              <li className="no-flip">/</li>
            </>
          )}
          <li className="font-bold text-on-surface">{dept?.name_ar || dept?.name || '...'}</li>
        </ol>
      </nav>

      <AsyncState
        isLoading={departmentQuery.isLoading}
        isError={departmentQuery.isError}
        error={departmentQuery.error}
      >
        {dept && (
          <>
            <PageHeader
              title={dept.name_ar || dept.name}
              subtitle={`كود الإدارة: ${dept.code}`}
              actions={
                <StatusBadge
                  status={dept.is_active ? 'active' : 'inactive'}
                  label={dept.is_active ? 'نشطة' : 'موقوفة'}
                />
              }
            />

            <div className="mb-md grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi) => (
                <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} />
              ))}
            </div>
          </>
        )}
      </AsyncState>

      <section>
        <h2 className="mb-sm text-lg font-bold text-on-surface">فروع الإدارة</h2>
        <AsyncState
          isLoading={branchesQuery.isLoading}
          isError={branchesQuery.isError}
          error={branchesQuery.error}
        >
          <DataTable<Branch & Record<string, unknown>>
            data={branches as (Branch & Record<string, unknown>)[]}
            keyExtractor={(row) => row.id}
            emptyMessage="لا توجد فروع لهذه الإدارة"
            columns={[
              { key: 'code', header: 'الكود' },
              { key: 'name_ar', header: 'الاسم', render: (row) => row.name_ar || row.name },
              { key: 'address', header: 'العنوان' },
              {
                key: 'is_active',
                header: 'الحالة',
                render: (row) => (
                  <StatusBadge
                    status={row.is_active ? 'active' : 'inactive'}
                    label={row.is_active ? 'نشط' : 'موقوف'}
                  />
                ),
              },
              {
                key: 'actions',
                header: 'إجراءات',
                render: (row) => (
                  <Link to={`/branches/${row.id}`} className="text-sm text-primary hover:underline">
                    عرض التفاصيل
                  </Link>
                ),
              },
            ]}
          />
        </AsyncState>
      </section>
    </div>
  )
}
