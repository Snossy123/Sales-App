import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { api } from '../../../api/client'
import type { AuthUser, Employee, HrmDashboard, PaginatedResponse } from '../../../api/types'
import { DataTable } from '../../../components/DataTable'
import { StatusBadge } from '../../../components/StatusBadge'
import { AsyncState } from '../../../components/AsyncState'
import { ChartCard } from '../../../components/ChartCard'
import { DonutChartPanel, type DonutSlice } from '../../../components/charts/DonutChartPanel'
import { BarChartPanel } from '../../../components/charts/BarChartPanel'
import { Icon } from '../../../components/Icon'
import { StartTourButton } from '../../../components/tour/StartTourButton'
import { usePageTour } from '../../../hooks/usePageTour'
import { getListScopeQueryKey, mergeScopedListParams } from '../../../lib/dataScope'
import { CHART_COLORS, formatArNumber } from '../../../lib/chartColors'
import { useAuthStore } from '../../../stores/authStore'
import { HrmStatCard } from '../components/dashboard/HrmStatCard'
import { AttendanceRing } from '../components/dashboard/AttendanceRing'
import { UpcomingLeavesList } from '../components/dashboard/UpcomingLeavesList'

type DashboardResult =
  | { mode: 'dashboard'; stats: HrmDashboard }
  | { mode: 'employees'; employees: Employee[] }

const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending: 'معلقة',
  approved: 'معتمدة',
  rejected: 'مرفوضة',
}

const QUICK_ACTIONS = [
  { to: '/hrm/employees', label: 'الموظفون', icon: 'groups' },
  { to: '/hrm/attendance', label: 'الحضور', icon: 'fingerprint' },
  { to: '/hrm/leaves', label: 'الإجازات', icon: 'event_busy' },
  { to: '/hrm/payroll', label: 'الرواتب', icon: 'payments' },
]

function todayLabel(): string {
  return new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function weekdayLabel(dateStr: string): string {
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return dateStr
  return parsed.toLocaleDateString('ar-EG', { weekday: 'short' })
}

async function fetchDashboard(user: AuthUser | null): Promise<DashboardResult> {
  try {
    const { data } = await api.get<HrmDashboard>('/hrm/dashboard')
    return { mode: 'dashboard', stats: data }
  } catch (error) {
    // Only fall back to the employees list when the dashboard is genuinely
    // unavailable (not found) or the user lacks permission. Re-throw real
    // failures (server errors, network) so they surface instead of being
    // masked by the fallback.
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    if (status !== 403 && status !== 404) {
      throw error
    }

    const params = mergeScopedListParams(user, {
      per_page: 100,
      include: 'branch,department',
    })

    const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params })
    return { mode: 'employees', employees: data.data }
  }
}

function DashboardHero() {
  return (
    <div className="relative mb-md overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-container p-lg text-on-primary shadow-md">
      <div className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full bg-on-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-on-primary/10 blur-2xl" />
      <div className="relative flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium opacity-80">{todayLabel()}</p>
          <h1 className="mt-xs text-2xl font-bold sm:text-3xl">الموارد البشرية</h1>
          <p className="mt-xs text-sm opacity-90">لوحة متابعة الموظفين والحضور والإجازات</p>
        </div>
        <div className="flex flex-wrap items-center gap-xs">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="inline-flex items-center gap-xs rounded-lg bg-on-primary/15 px-sm py-xs text-sm font-medium text-on-primary backdrop-blur transition-colors hover:bg-on-primary/25"
            >
              <Icon name={action.icon} size={18} />
              {action.label}
            </Link>
          ))}
          <StartTourButton tourId="hrm" />
        </div>
      </div>
    </div>
  )
}

function DashboardView({ stats }: { stats: HrmDashboard }) {
  const deptData: DonutSlice[] = Object.entries(stats.employees_by_department ?? {}).map(
    ([label, value]) => ({ label, value: Number(value) }),
  )
  const deptTotal = deptData.reduce((sum, slice) => sum + slice.value, 0)
  const totalEmployees = stats.total_employees ?? (deptTotal || stats.present_today)

  const leaveStatusData: DonutSlice[] = Object.entries(stats.leaves_by_status ?? {}).map(
    ([status, value]) => ({ label: LEAVE_STATUS_LABELS[status] ?? status, value: Number(value) }),
  )

  const trendData = Object.entries(stats.attendance_trend ?? {}).map(([date, count]) => ({
    day: weekdayLabel(date),
    count: Number(count),
  }))

  return (
    <>
      <div
        data-tour="hrm-kpis"
        className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4"
      >
        <HrmStatCard
          label="حاضر اليوم"
          value={stats.present_today}
          icon="how_to_reg"
          accent="primary"
          caption={`من ${totalEmployees} موظف`}
        />
        <HrmStatCard
          label="مسجل حضور الآن"
          value={stats.clocked_in_now}
          icon="schedule"
          accent="secondary"
          caption="جلسات مفتوحة"
        />
        <HrmStatCard
          label="إجازات معلقة"
          value={stats.pending_leaves}
          icon="event_busy"
          accent="tertiary"
          caption="بانتظار الاعتماد"
        />
        <HrmStatCard
          label="رواتب مستحقة"
          value={formatArNumber(Number(stats.payroll_due_total))}
          icon="payments"
          accent="error"
          caption="غير مدفوعة"
        />
      </div>

      <div className="mb-md grid grid-cols-1 gap-md lg:grid-cols-3">
        <ChartCard title="نسبة الحضور اليوم" subtitle="الحاضرون مقابل إجمالي الموظفين">
          <div className="flex h-full items-center justify-center">
            <AttendanceRing present={stats.present_today} total={totalEmployees} />
          </div>
        </ChartCard>

        <ChartCard title="الموظفون حسب القسم" subtitle="توزيع الموظفين النشطين">
          <DonutChartPanel data={deptData} />
        </ChartCard>

        {leaveStatusData.length > 0 ? (
          <ChartCard title="الإجازات حسب الحالة" subtitle="جميع طلبات الإجازة">
            <DonutChartPanel data={leaveStatusData} />
          </ChartCard>
        ) : (
          <ChartCard title="الموظفون" subtitle="ملخص القوى العاملة">
            <div className="flex h-full flex-col items-center justify-center gap-xs">
              <span className="text-5xl font-bold tabular-nums text-on-surface">
                {totalEmployees}
              </span>
              <span className="text-sm text-on-surface-variant">إجمالي الموظفين</span>
            </div>
          </ChartCard>
        )}
      </div>

      {trendData.length > 0 && (
        <div className="mb-md">
          <ChartCard title="اتجاه الحضور" subtitle="عدد الحاضرين خلال آخر ٧ أيام">
            <BarChartPanel
              data={trendData}
              xKey="day"
              series={[{ key: 'count', label: 'الحاضرون', color: CHART_COLORS[0] }]}
              height={240}
            />
          </ChartCard>
        </div>
      )}

      <div data-tour="hrm-leaves">
        <h2 className="mb-sm flex items-center gap-xs text-lg font-semibold text-on-surface">
          <Icon name="event_upcoming" size={20} className="text-primary" />
          إجازات قادمة
        </h2>
        <UpcomingLeavesList leaves={stats.upcoming_leaves} />
      </div>
    </>
  )
}

function EmployeesFallbackView({ employees }: { employees: Employee[] }) {
  const activeCount = employees.filter((e) => e.status === 'active').length

  return (
    <>
      <div data-tour="hrm-kpis" className="mb-md grid grid-cols-1 gap-md sm:grid-cols-3">
        <HrmStatCard
          label="إجمالي الموظفين"
          value={employees.length}
          icon="groups"
          accent="primary"
        />
        <HrmStatCard label="نشط" value={activeCount} icon="person_check" accent="secondary" />
        <HrmStatCard
          label="غير نشط"
          value={employees.length - activeCount}
          icon="person_off"
          accent="error"
        />
      </div>

      <DataTable<Employee & Record<string, unknown>>
        dataTour="hrm-employees"
        data={employees as (Employee & Record<string, unknown>)[]}
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
  )
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
      <DashboardHero />

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {result?.mode === 'dashboard' && <DashboardView stats={result.stats} />}
        {result?.mode === 'employees' && <EmployeesFallbackView employees={result.employees} />}
      </AsyncState>
    </div>
  )
}
