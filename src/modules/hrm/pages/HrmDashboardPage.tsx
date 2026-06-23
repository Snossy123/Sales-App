import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { AuthUser, Employee, HrmDashboard, PaginatedResponse } from '../../../api/types'
import { DataTable } from '../../../components/DataTable'
import { StatusBadge } from '../../../components/StatusBadge'
import { KpiCard } from '../../../components/KpiCard'
import { AsyncState } from '../../../components/AsyncState'
import { PageHeader } from '../../../components/PageHeader'
import { StartTourButton } from '../../../components/tour/StartTourButton'
import { usePageTour } from '../../../hooks/usePageTour'
import { getListScopeQueryKey, mergeScopedListParams } from '../../../lib/dataScope'
import { useAuthStore } from '../../../stores/authStore'
import { hrmLeaveTypeLabel } from '../lib/labels'

type DashboardResult =
  | { mode: 'dashboard'; stats: HrmDashboard }
  | { mode: 'employees'; employees: Employee[] }

async function fetchDashboard(user: AuthUser | null): Promise<DashboardResult> {
  try {
    const { data } = await api.get<HrmDashboard>('/hrm/dashboard')
    return { mode: 'dashboard', stats: data }
  } catch {
    const params = mergeScopedListParams(user, {
      per_page: 100,
      include: 'branch,department',
    })

    const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params })
    return { mode: 'employees', employees: data.data }
  }
}

export function HrmDashboardPage() {
  usePageTour('hrm')
  const user = useAuthStore((s) => s.user)
  const listScopeKey = getListScopeQueryKey(user)

  const query = useQuery({
    queryKey: ['hrm', 'dashboard', listScopeKey],
    queryFn: () => fetchDashboard(user),
  })

  const result = query.data

  return (
    <div>
      <PageHeader
        title="الموارد البشرية"
        subtitle="لوحة متابعة الموظفين والحضور والإجازات"
        actions={<StartTourButton tourId="hrm" />}
      />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {result?.mode === 'dashboard' && (
          <>
            <div
              data-tour="hrm-kpis"
              className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4"
            >
              <KpiCard label="حاضر اليوم" value={result.stats.present_today} icon="how_to_reg" />
              <KpiCard label="مسجل حضور الآن" value={result.stats.clocked_in_now} icon="schedule" />
              <KpiCard label="إجازات معلقة" value={result.stats.pending_leaves} icon="event_busy" />
              <KpiCard
                label="رواتب مستحقة"
                value={Number(result.stats.payroll_due_total).toLocaleString('ar-EG')}
                icon="payments"
              />
            </div>

            <div data-tour="hrm-leaves" className="mb-md">
                <h2 className="mb-sm text-lg font-semibold text-on-surface">إجازات قادمة</h2>
                {result.stats.upcoming_leaves.length > 0 ? (
                <DataTable
                  data={result.stats.upcoming_leaves as (typeof result.stats.upcoming_leaves[0] & Record<string, unknown>)[]}
                  keyExtractor={(row) => row.id}
                  pageSize={10}
                  columns={[
                    {
                      key: 'employee',
                      header: 'الموظف',
                      render: (row) => row.employee?.name ?? '—',
                    },
                    {
                      key: 'leaveType',
                      header: 'النوع',
                      render: (row) => hrmLeaveTypeLabel(row.leaveType),
                    },
                    { key: 'start_date', header: 'من' },
                    { key: 'end_date', header: 'إلى' },
                    {
                      key: 'status',
                      header: 'الحالة',
                      render: (row) => <StatusBadge status={row.status} label="معتمدة" />,
                    },
                  ]}
                />
                ) : (
                  <p className="text-sm text-on-surface-variant">لا توجد إجازات قادمة</p>
                )}
              </div>
          </>
        )}

        {result?.mode === 'employees' && (
          <>
            <div
              data-tour="hrm-kpis"
              className="mb-md grid grid-cols-1 gap-md sm:grid-cols-3"
            >
              <KpiCard label="إجمالي الموظفين" value={result.employees.length} icon="groups" />
              <KpiCard
                label="نشط"
                value={result.employees.filter((e) => e.status === 'active').length}
                icon="person_check"
              />
              <KpiCard
                label="غير نشط"
                value={result.employees.filter((e) => e.status !== 'active').length}
                icon="person_off"
              />
            </div>

            <DataTable<Employee & Record<string, unknown>>
              dataTour="hrm-employees"
              data={result.employees as (Employee & Record<string, unknown>)[]}
              keyExtractor={(row) => row.id}
              pageSize={10}
              columns={[
                { key: 'employee_code', header: 'الكود' },
                { key: 'name', header: 'الاسم' },
                { key: 'job_title', header: 'الوظيفة' },
                {
                  key: 'department',
                  header: 'القسم',
                  render: (row) => row.department?.name_ar || row.department?.name || '—',
                },
                {
                  key: 'salary',
                  header: 'الراتب',
                  className: 'tabular-nums',
                  render: (row) =>
                    row.salary != null ? Number(row.salary).toLocaleString('ar-EG') : '—',
                },
                {
                  key: 'status',
                  header: 'الحالة',
                  render: (row) => <StatusBadge status={row.status} />,
                },
              ]}
            />
          </>
        )}
      </AsyncState>
    </div>
  )
}
