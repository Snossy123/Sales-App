import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { SupportTask } from '../../api/types'
import { formatDate } from '../../lib/accounting'
import { userHasPermission } from '../../lib/access'
import {
  listSupportTasks,
  SUPPORT_STATUS_LABELS,
} from '../../modules/support/api'
import { useAuthStore } from '../../stores/authStore'
import { AsyncState } from '../AsyncState'
import { StatusBadge } from '../StatusBadge'

interface CustomerInstallationsSectionProps {
  customerId: number
}

export function CustomerInstallationsSection({ customerId }: CustomerInstallationsSectionProps) {
  const user = useAuthStore((s) => s.user)
  const canView =
    userHasPermission(user, 'support.view_all_tasks') ||
    userHasPermission(user, 'support.view_assigned_tasks') ||
    userHasPermission(user, 'customers.manage')

  const query = useQuery({
    queryKey: ['customer', customerId, 'installations'],
    queryFn: async () => {
      const page = await listSupportTasks({
        customer_id: customerId,
        task_type: 'installation',
        per_page: 50,
      })
      return page.data ?? []
    },
    enabled: Boolean(customerId) && canView,
  })

  if (!canView) {
    return (
      <section id="customer-installations" className="mb-md scroll-mt-24">
        <h2 className="mb-sm text-lg font-semibold">التركيبات</h2>
        <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
          لا توجد صلاحية لعرض التركيبات
        </p>
      </section>
    )
  }

  const tasks = query.data ?? []

  return (
    <section id="customer-installations" className="mb-md scroll-mt-24">
      <h2 className="mb-sm text-lg font-semibold">التركيبات</h2>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-lg text-center text-sm text-on-surface-variant">
            لا توجد مهام تركيب
          </p>
        ) : (
          <ul className="space-y-sm">
            {tasks.map((task: SupportTask) => (
              <li
                key={task.id}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium tabular-nums">
                    {task.serial_number ?? 'جهاز'}
                  </span>
                  <StatusBadge
                    status={task.status}
                    label={SUPPORT_STATUS_LABELS[task.status] ?? task.status}
                  />
                  {task.invoice_number && task.sales_invoice_id && (
                    <Link
                      to={`/contracts/${task.sales_invoice_id}`}
                      className="text-primary hover:underline"
                    >
                      {task.invoice_number}
                    </Link>
                  )}
                </div>
                <dl className="mt-sm grid gap-1 text-on-surface-variant sm:grid-cols-2">
                  <div>
                    <dt className="inline text-xs">الفني: </dt>
                    <dd className="inline font-medium text-on-surface">
                      {task.employee_name ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-xs">تاريخ التنفيذ: </dt>
                    <dd className="inline font-medium text-on-surface tabular-nums">
                      {task.executed_at ? formatDate(task.executed_at) : '—'}
                    </dd>
                  </div>
                  {(task.vehicle_info || task.vehicle_type) && (
                    <div className="sm:col-span-2">
                      <dt className="inline text-xs">المركبة: </dt>
                      <dd className="inline font-medium text-on-surface">
                        {[task.vehicle_type, task.vehicle_info].filter(Boolean).join(' · ')}
                      </dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </AsyncState>
    </section>
  )
}
