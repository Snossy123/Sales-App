import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Branch, Department, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { SalesTrendChart } from '../components/enterprise/SalesTrendChart'
import { GpsKpiRow } from '../components/enterprise/GpsKpiRow'
import { DeviceHealthCards } from '../components/enterprise/DeviceHealthCards'
import { GpsDeviceTable } from '../components/enterprise/GpsDeviceTable'
import { useAuthStore } from '../stores/authStore'
import { canAccessDepartment, isDepartmentAdmin, isSuperAdmin } from '../lib/access'
import { buildDepartmentDashboard } from '../lib/departmentDashboard'

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
        params: { per_page: 100, 'filter[administration_id]': departmentId },
      })
      return data.data
    },
  })

  const dept = departmentQuery.data
  const branches = branchesQuery.data ?? []

  const dashboard = useMemo(() => {
    if (!dept) return null
    return buildDepartmentDashboard(dept, branches)
  }, [dept, branches])

  const deptName = dept?.name_ar || dept?.name || '...'
  const isLoading = departmentQuery.isLoading || branchesQuery.isLoading
  const isError = departmentQuery.isError || branchesQuery.isError
  const error = departmentQuery.error ?? branchesQuery.error

  return (
    <AsyncState isLoading={isLoading} isError={isError} error={error}>
      {dept && dashboard && (
        <div className="space-y-xl">
          <div className="flex flex-wrap items-center justify-between gap-md">
            <nav className="flex items-center gap-xs text-on-surface-variant">
              {isSuperAdmin(user) ? (
                <>
                  <Link to="/departments" className="font-body-sm text-body-sm transition-colors hover:text-primary">
                    الإدارات
                  </Link>
                  <Icon name="chevron_right" size={14} className="rotate-180" />
                </>
              ) : (
                <>
                  <span className="font-body-sm text-body-sm">الإدارة</span>
                  <Icon name="chevron_right" size={14} className="rotate-180" />
                  <span className="font-body-sm text-body-sm">لوحة الإدارة</span>
                  <Icon name="chevron_right" size={14} className="rotate-180" />
                </>
              )}
              <span className="font-body-sm text-body-sm font-bold text-on-surface">{deptName}</span>
            </nav>
            <Link
              to="/inventory/add"
              className="flex items-center gap-sm rounded-lg bg-primary px-lg py-md font-label-md text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-95"
            >
              <Icon name="add" size={20} className="no-flip" />
              جهاز جديد
            </Link>
          </div>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-md">
              <div>
                <h2 className="font-headline-md text-on-surface">
                  لوحة الإدارة — {deptName}
                </h2>
                <div className="mt-sm flex flex-wrap items-center gap-md">
                  <span className="rounded border border-outline-variant bg-surface-container-high px-sm py-1 font-label-md text-primary">
                    {dept.code}
                  </span>
                  <span
                    className={`rounded-full px-sm py-0.5 font-label-sm ${
                      dept.is_active ? 'bg-[#EAF6ED] text-[#34A853]' : 'bg-error-container text-error'
                    }`}
                  >
                    {dept.is_active ? 'نشطة' : 'موقوفة'}
                  </span>
                  <span className="flex items-center gap-xs font-body-sm text-on-surface-variant">
                    <Icon name="history" size={16} className="no-flip" />
                    تحديث تلقائي: منذ دقيقتين
                  </span>
                  {isDepartmentAdmin(user) && (
                    <span className="font-body-sm text-on-surface-variant">
                      · {branches.length} فرع
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-sm">
                <button
                  type="button"
                  className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  <Icon name="file_download" size={20} className="no-flip" />
                  تقرير المخزون
                </button>
                <button
                  type="button"
                  className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  <Icon name="share" size={20} className="no-flip" />
                  مشاركة البيانات
                </button>
              </div>
            </div>
          </section>

          <SalesTrendChart
            title="اتجهات المبيعات حسب الفرع"
            completionRate={dashboard.completionRate}
            legend={dashboard.chartLegend}
            tooltipText={dashboard.tooltipText}
          />
          <GpsKpiRow kpis={dashboard.kpis} />
          <DeviceHealthCards cards={dashboard.healthCards} />
          <GpsDeviceTable rows={dashboard.deviceRows} totalCount={dashboard.totalDevices} />
        </div>
      )}
    </AsyncState>
  )
}
