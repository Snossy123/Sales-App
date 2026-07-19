import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../../../api/client'
import type { Employee, HrmUserSalesTarget, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { SalesTargetFormModal } from '../components/SalesTargetFormModal'

const PIE_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#84CC16',
  '#F97316',
  '#6366F1',
]

type TargetWithEmployee = HrmUserSalesTarget & {
  employee?: { id?: number; name?: string }
}

function employeeName(row: TargetWithEmployee): string {
  return row.employee?.name ?? `#${row.employee_id}`
}

function aggregateByEmployee(targets: TargetWithEmployee[]) {
  const map = new Map<number, { employee_id: number; name: string; target: number; achieved: number }>()

  for (const row of targets) {
    const existing = map.get(row.employee_id)
    const target = Number(row.target_count ?? 0)
    const achieved = Number(row.achieved_count ?? 0)
    if (existing) {
      existing.target += target
      existing.achieved += achieved
    } else {
      map.set(row.employee_id, {
        employee_id: row.employee_id,
        name: employeeName(row),
        target,
        achieved,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}

export function HrmSalesTargetsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HrmUserSalesTarget | null>(null)
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')

  const employeesQuery = useQuery({
    queryKey: ['employees', 'sales-targets-filter'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100 },
      })
      return data.data ?? []
    },
  })

  const targetsQuery = useQuery({
    queryKey: ['hrm', 'sales-targets', employeeFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 100,
        include: 'employee',
      }
      if (employeeFilter !== 'all') {
        params['filter[employee_id]'] = Number(employeeFilter)
      }
      const { data } = await api.get<PaginatedResponse<TargetWithEmployee>>('/hrm/sales-targets', {
        params,
      })
      return data.data ?? []
    },
  })

  const today = new Date().toISOString().split('T')[0]
  const activeTargets = useMemo(
    () => (targetsQuery.data ?? []).filter((t) => t.target_start <= today && t.target_end >= today),
    [targetsQuery.data, today],
  )

  const chartRows = useMemo(() => aggregateByEmployee(activeTargets), [activeTargets])

  const summary = useMemo(() => {
    const target = chartRows.reduce((sum, row) => sum + row.target, 0)
    const achieved = chartRows.reduce((sum, row) => sum + row.achieved, 0)
    const percent = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0
    return { target, achieved, percent }
  }, [chartRows])

  const barData = useMemo(
    () =>
      chartRows.map((row) => ({
        name: row.name,
        التارجت: row.target,
        المحقق: row.achieved,
      })),
    [chartRows],
  )

  const pieData = useMemo(
    () =>
      chartRows
        .filter((row) => row.achieved > 0)
        .map((row) => ({ name: row.name, value: row.achieved })),
    [chartRows],
  )

  return (
    <SalesPageShell
      title="أهداف المبيعات"
      subtitle="تحديد أهداف عدد التعاقدات لكل موظف"
      actions={
        <button
          type="button"
          onClick={() => {
            setEditTarget(null)
            setModalOpen(true)
          }}
          className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary"
        >
          هدف جديد
        </button>
      }
    >
      <div className="mb-md flex flex-col gap-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-xs space-y-1">
          <label htmlFor="employee-filter" className="text-xs font-medium text-on-surface-variant">
            الموظف
          </label>
          <select
            id="employee-filter"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-sm text-sm text-on-surface"
          >
            <option value="all">الكل</option>
            {(employeesQuery.data ?? []).map((emp) => (
              <option key={emp.id} value={String(emp.id)}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chartRows.length > 0 && (
        <div className="mb-md space-y-md">
          <div className="max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
            <div className="mb-sm flex items-center justify-between gap-sm">
              <div className="flex items-center gap-sm">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name="track_changes" size={18} className="text-primary" />
                </span>
                <h2 className="text-sm font-semibold text-on-surface">تقدم التارجت</h2>
              </div>
              <span className="text-sm font-bold tabular-nums text-on-surface">
                {summary.achieved}/{summary.target}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-container">
              <div
                className="ms-auto h-full rounded-full bg-primary transition-all"
                style={{ width: `${summary.percent}%` }}
              />
            </div>
            <p className="mt-xs text-left text-xs text-on-surface-variant tabular-nums">
              {summary.percent}% · تعاقد
            </p>
          </div>

          <div className="grid grid-cols-1 gap-md xl:grid-cols-2">
            <div className="min-h-[300px] rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
              <p className="mb-sm text-xs font-semibold text-on-surface-variant">
                التارجت مقابل المحقق
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant, #e2e8f0)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="التارجت" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="المحقق" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="min-h-[300px] rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
              <p className="mb-sm text-xs font-semibold text-on-surface-variant">
                حصة كل موظف من المحقق
              </p>
              {pieData.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-on-surface-variant">
                  لا يوجد تعاقدات محققة في الفترة النشطة
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} تعاقد`, 'المحقق']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      <AsyncState
        isLoading={targetsQuery.isLoading}
        isError={targetsQuery.isError}
        error={targetsQuery.error}
      >
        <DataTable<TargetWithEmployee & Record<string, unknown>>
          data={(targetsQuery.data ?? []) as (TargetWithEmployee & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={15}
          emptyMessage="لا أهداف مبيعات"
          columns={[
            {
              key: 'employee',
              header: 'الموظف',
              render: (row) => employeeName(row as TargetWithEmployee),
            },
            { key: 'target_start', header: 'من' },
            { key: 'target_end', header: 'إلى' },
            {
              key: 'progress',
              header: 'التقدم',
              render: (row) => `${row.achieved_count ?? 0}/${row.target_count ?? 0}`,
            },
            {
              key: 'commission_percent',
              header: 'العمولة %',
              render: (row) => (row.commission_percent != null ? `${row.commission_percent}%` : '—'),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditTarget(row as HrmUserSalesTarget)
                      setModalOpen(true)
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    تعديل
                  </button>
                  <Link
                    to={`/hrm/employees/${row.employee_id}`}
                    className="text-sm text-on-surface-variant hover:underline"
                  >
                    الموظف
                  </Link>
                </div>
              ),
            },
          ]}
        />
      </AsyncState>

      <SalesTargetFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        target={editTarget}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['hrm', 'sales-targets'] })}
      />
    </SalesPageShell>
  )
}
