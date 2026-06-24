import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Administration, PaginatedResponse, Warehouse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { InsightBanner } from '../components/InsightBanner'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { ToastBanner } from '../components/ToastBanner'

function isCentralWarehouse(warehouse: Warehouse): boolean {
  return warehouse.is_central === true
}

function centralWarehouseForAdministration(warehouses: Warehouse[], administrationId: number): Warehouse | undefined {
  return warehouses.find(
    (warehouse) => warehouse.is_central && warehouse.administration_id === administrationId,
  )
}

function administrationName(administrations: Administration[], administrationId?: number): string {
  if (!administrationId) return '—'
  const administration = administrations.find((item) => item.id === administrationId)
  return administration?.name_ar || administration?.name || '—'
}

export function WarehousesPage() {
  const queryClient = useQueryClient()
  const [successToast, setSuccessToast] = useState('')

  const warehousesQuery = useQuery({
    queryKey: ['warehouses', 'all'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Warehouse>>('/warehouses', {
        params: { per_page: 200, include: 'branch' },
      })
      return data.data
    },
  })

  const administrationsQuery = useQuery({
    queryKey: ['administrations', 'warehouses'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Administration>>('/administrations', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ message: string; count: number }>('/administrations/ensure-hubs')
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      queryClient.invalidateQueries({ queryKey: ['administrations'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setSuccessToast(data.message || `تمت مزامنة ${data.count} مخزن مركزي`)
    },
  })

  const warehouses = warehousesQuery.data ?? []
  const administrations = administrationsQuery.data ?? []

  const missingHubAdministrations = useMemo(
    () => administrations.filter((administration) => !centralWarehouseForAdministration(warehouses, administration.id)),
    [administrations, warehouses],
  )

  const hubRows = useMemo(
    () =>
      administrations.map((administration) => {
        const hub = centralWarehouseForAdministration(warehouses, administration.id)
        return {
          administration,
          hub,
          key: administration.id,
        }
      }),
    [administrations, warehouses],
  )

  const branchWarehouses = useMemo(
    () => warehouses.filter((warehouse) => !isCentralWarehouse(warehouse)),
    [warehouses],
  )

  const isLoading = warehousesQuery.isLoading || administrationsQuery.isLoading
  const isError = warehousesQuery.isError || administrationsQuery.isError
  const error = warehousesQuery.error ?? administrationsQuery.error

  return (
    <div>
      <PageHeader
        title="المخازن"
        subtitle="المخزن المركزي يُنشأ تلقائياً مع كل إدارة — لا حاجة لتعريفه يدوياً"
        actions={
          <>
            <Link
              to="/departments"
              className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-sm"
            >
              <Icon name="corporate_fare" size={18} />
              الإدارات
            </Link>
            <button
              type="button"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
            >
              <Icon name="sync" size={18} />
              {syncMutation.isPending ? 'جاري المزامنة...' : 'مزامنة المخازن المركزية'}
            </button>
          </>
        }
      />

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      <div className="mb-md space-y-md">
        <InsightBanner
          message="عند إضافة إدارة جديدة من صفحة الإدارات، يُنشأ مخزن مركزي تلقائياً بنفس الاسم. مخازن الفروع تُنشأ تلقائياً عند إضافة الفروع."
          variant="info"
        />
        {missingHubAdministrations.length > 0 && (
          <InsightBanner
            message={`${missingHubAdministrations.length} إدارة بدون مخزن مركزي — اضغط «مزامنة المخازن المركزية» لإنشائها.`}
            variant="warning"
          />
        )}
        {syncMutation.isError && (
          <p className="text-sm text-error">{getErrorMessage(syncMutation.error)}</p>
        )}
      </div>

      <AsyncState isLoading={isLoading} isError={isError} error={error}>
        <h2 className="mb-sm text-base font-bold">المخازن المركزية</h2>
        <DataTable
          data={hubRows}
          keyExtractor={(row) => row.key}
          emptyMessage="لا توجد إدارات"
          columns={[
            {
              key: 'administration',
              header: 'الإدارة',
              render: (row) => row.administration.name_ar || row.administration.name,
            },
            {
              key: 'warehouse_name',
              header: 'المخزن',
              render: (row) => row.hub?.name_ar || row.hub?.name || '—',
            },
            {
              key: 'code',
              header: 'الكود',
              className: 'tabular-nums',
              render: (row) => row.hub?.code || '—',
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) =>
                row.hub ? (
                  <StatusBadge status="active" label="جاهز" />
                ) : (
                  <StatusBadge status="inactive" label="غير منشأ" />
                ),
            },
          ]}
        />

        <h2 className="mb-sm mt-lg text-base font-bold">مخازن الفروع</h2>
        <DataTable
          data={branchWarehouses}
          keyExtractor={(row) => row.id}
          emptyMessage="لا توجد مخازن فروع بعد — أضف فروعاً من صفحة الفروع"
          columns={[
            {
              key: 'name',
              header: 'المخزن',
              render: (row) => row.name_ar || row.name,
            },
            {
              key: 'branch',
              header: 'الفرع',
              render: (row) => row.branch?.name_ar || row.branch?.name || '—',
            },
            {
              key: 'administration',
              header: 'الإدارة',
              render: (row) =>
                administrationName(
                  administrations,
                  row.branch?.administration_id ?? row.branch?.department_id ?? row.administration_id ?? undefined,
                ),
            },
            {
              key: 'code',
              header: 'الكود',
              className: 'tabular-nums',
              render: (row) => row.code,
            },
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
          ]}
        />
      </AsyncState>
    </div>
  )
}
