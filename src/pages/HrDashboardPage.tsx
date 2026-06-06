import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Employee, PaginatedResponse } from '../api/types'
import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { KpiCard } from '../components/KpiCard'
import { AsyncState } from '../components/AsyncState'
import { useAuthStore } from '../stores/authStore'

export function HrDashboardPage() {
  const branchId = useAuthStore((s) => s.branchId)

  const query = useQuery({
    queryKey: ['employees', branchId],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 100,
        include: 'branch,department',
      }
      if (branchId) params['filter[branch_id]'] = branchId

      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params,
      })
      return data
    },
  })

  const employees = query.data?.data ?? []
  const activeCount = employees.filter((e) => e.status === 'active').length
  const inactiveCount = employees.length - activeCount

  return (
    <div>
      <h1 className="mb-md text-2xl font-bold text-on-surface">الموارد البشرية</h1>

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
      >
        <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-3">
          <KpiCard label="إجمالي الموظفين" value={employees.length} icon="groups" />
          <KpiCard label="نشط" value={activeCount} icon="person_check" />
          <KpiCard label="غير نشط" value={inactiveCount} icon="person_off" />
        </div>

        <DataTable<Employee & Record<string, unknown>>
          data={employees as (Employee & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'employee_code', header: 'الكود' },
            { key: 'name', header: 'الاسم' },
            { key: 'job_title', header: 'الوظيفة' },
            {
              key: 'department',
              header: 'القسم',
              render: (row) =>
                row.department?.name_ar || row.department?.name || '—',
            },
            {
              key: 'salary',
              header: 'الراتب',
              className: 'tabular-nums',
              render: (row) =>
                row.salary != null
                  ? Number(row.salary).toLocaleString('ar-EG')
                  : '—',
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => <StatusBadge status={row.status} />,
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
