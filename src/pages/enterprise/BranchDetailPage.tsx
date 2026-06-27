import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { api } from '../../api/client'
import type { Branch, GpsStock } from '../../api/types'
import { AsyncState } from '../../components/AsyncState'
import { BranchPageHeader } from '../../components/enterprise/BranchPageHeader'
import { BranchKpiGrid } from '../../components/enterprise/BranchKpiGrid'
import { BranchInventoryTable } from '../../components/enterprise/BranchInventoryTable'
import { BranchOperationsPanel } from '../../components/enterprise/BranchOperationsPanel'
import { buildBranchDashboard, getBranchWarehouseId } from '../../lib/branchDashboard'
import { useAuthStore } from '../../stores/authStore'
import { useOrgSettingsStore } from '../../stores/orgSettingsStore'
import { canAccessBranch } from '../../lib/access'

export function BranchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const general = useOrgSettingsStore((s) => s.general)
  const branchId = Number(id)
  const validId = Boolean(id) && !Number.isNaN(branchId)
  const currency = general?.currency ?? 'EGP'
  const locale = general?.default_locale === 'en' ? 'en-US' : 'ar-EG'

  const branchQuery = useQuery({
    queryKey: ['branches', branchId, 'detail'],
    queryFn: async () => {
      const { data } = await api.get<Branch>(`/branches/${branchId}`)
      return data
    },
    enabled: validId,
    retry: false,
  })

  const warehouseId = branchQuery.data ? getBranchWarehouseId(branchQuery.data) : null

  const stockQuery = useQuery({
    queryKey: ['gps-stock', 'branch-detail', warehouseId],
    queryFn: async () => {
      const { data } = await api.get<GpsStock>('/gps-stock', {
        params: { 'filter[warehouse_id]': warehouseId },
      })
      return data
    },
    enabled: warehouseId != null,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false
      }
      return failureCount < 2
    },
  })

  const branch = useMemo(() => {
    if (!branchQuery.data) return null
    return buildBranchDashboard(branchQuery.data, stockQuery.data ?? null, { currency, locale })
  }, [branchQuery.data, stockQuery.data, currency, locale])

  if (!validId) {
    return <Navigate to="/branches" replace />
  }

  if (branchQuery.isError) {
    return <Navigate to="/branches" replace />
  }

  if (branchQuery.data && !canAccessBranch(user, branchQuery.data)) {
    return <Navigate to="/branches" replace />
  }

  const isLoading = branchQuery.isLoading || (warehouseId != null && stockQuery.isLoading)

  return (
    <AsyncState isLoading={isLoading} isError={branchQuery.isError} error={branchQuery.error}>
      {branch && (
        <div className="space-y-xl">
          <nav>
            <ol className="flex gap-xs text-body-sm text-secondary">
              <li>
                <Link to="/branches" className="transition-colors hover:text-primary">
                  الفروع
                </Link>
              </li>
              <li className="no-flip">/</li>
              <li className="font-bold text-on-surface">{branch.name}</li>
            </ol>
          </nav>

          <BranchPageHeader branch={branch} />
          <BranchKpiGrid kpis={branch.kpis} />
          <div className="grid grid-cols-1 gap-xl lg:grid-cols-12">
            <div className="space-y-xl lg:col-span-8">
              <BranchInventoryTable products={branch.products} />
            </div>
            <div className="space-y-xl lg:col-span-4">
              <BranchOperationsPanel branch={branch} />
            </div>
          </div>
        </div>
      )}
    </AsyncState>
  )
}
