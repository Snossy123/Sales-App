import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import axios from 'axios'
import type { Employee, HrmUserSalesTarget } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { ProfilePhotoUploader } from '../components/ProfilePhotoUploader'
import { StatusBadge } from '../components/StatusBadge'
import { SalesPageShell } from '../components/SalesPageShell'
import { useAuthStore } from '../stores/authStore'
import { userHasPermission } from '../lib/access'

import { SalesTargetProgressCard } from '../modules/hrm/components/SalesTargetProgressCard'

export function MyProfilePage() {
  const user = useAuthStore((s) => s.user)
  const canManageHrm = userHasPermission(user, 'hr.employees.manage')

  const employeeQuery = useQuery({
    queryKey: ['me', 'employee'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Employee>('/me/employee')
        return data
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null
        }
        throw err
      }
    },
    retry: false,
  })

  const targetQuery = useQuery({
    queryKey: ['hrm', 'sales-targets', 'progress', employeeQuery.data?.id],
    queryFn: async () => {
      const { data } = await api.get<{ active_target: HrmUserSalesTarget | null }>(
        `/hrm/employees/${employeeQuery.data!.id}/sales-targets/progress`,
      )
      return data.active_target
    },
    enabled: Boolean(employeeQuery.data?.id),
  })

  return (
    <SalesPageShell title="حسابي" subtitle="بيانات الموظف والأهداف">
      <AsyncState
        isLoading={employeeQuery.isLoading}
        isError={employeeQuery.isError && employeeQuery.error != null}
        error={employeeQuery.error}
      >
        {!employeeQuery.data && !employeeQuery.isLoading && !employeeQuery.isError ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
            لا يوجد ملف موظف مرتبط بحسابك. تواصل مع إدارة الموارد البشرية.
          </p>
        ) : (
          employeeQuery.data && (
          <div className="space-y-md">
            <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              <div className="border-b border-outline-variant/60 bg-surface-container/40 px-lg py-md">
                <div className="grid grid-cols-1 items-start gap-lg sm:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-sm">
                      <h1 className="text-2xl font-bold">{employeeQuery.data.name}</h1>
                      <StatusBadge status={employeeQuery.data.status} />
                    </div>
                    <p className="mt-sm text-on-surface-variant">
                      {employeeQuery.data.job?.name ?? employeeQuery.data.job_title ?? '—'}
                    </p>
                    <p className="mt-xs text-sm text-on-surface-variant" dir="ltr">
                      {user?.email}
                    </p>
                  </div>
                  <ProfilePhotoUploader
                    entityType="employee"
                    entityId={employeeQuery.data.id}
                    name={employeeQuery.data.name}
                    photoUrl={employeeQuery.data.profile_photo_url}
                    variant="employee"
                    layout="vertical"
                    queryKeys={[['me', 'employee']]}
                  />
                </div>
              </div>
              <dl className="grid gap-md p-lg sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-sm text-on-surface-variant">الهاتف</dt>
                  <dd className="tabular-nums">{employeeQuery.data.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">الرقم القومي</dt>
                  <dd className="tabular-nums">{employeeQuery.data.national_id ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">الفرع</dt>
                  <dd>{employeeQuery.data.branch?.name_ar ?? employeeQuery.data.branch?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">القسم</dt>
                  <dd>
                    {employeeQuery.data.department?.name_ar ??
                      employeeQuery.data.department?.name ??
                      '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">تاريخ التعيين</dt>
                  <dd>{employeeQuery.data.hire_date ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-on-surface-variant">الراتب</dt>
                  <dd className="tabular-nums">
                    {employeeQuery.data.salary != null
                      ? Number(employeeQuery.data.salary).toLocaleString('ar-EG')
                      : '—'}
                  </dd>
                </div>
              </dl>
            </section>

            {targetQuery.data && <SalesTargetProgressCard target={targetQuery.data} />}

            {canManageHrm && (
              <Link
                to={`/hrm/employees/${employeeQuery.data.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-primary bg-primary/5 px-md py-sm text-sm font-medium text-primary hover:bg-primary/10"
              >
                <Icon name="badge" size={18} />
                عرض ملف HRM الكامل
              </Link>
            )}
          </div>
          )
        )}
      </AsyncState>
    </SalesPageShell>
  )
}
