import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { Branch } from '../../api/types'
import { AsyncState } from '../../components/AsyncState'
import { BranchPageHeader } from '../../components/enterprise/BranchPageHeader'
import { BranchKpiGrid } from '../../components/enterprise/BranchKpiGrid'
import { BranchInventoryTable } from '../../components/enterprise/BranchInventoryTable'
import { BranchOperationsPanel } from '../../components/enterprise/BranchOperationsPanel'
import { getBranchDetail } from '../../data/branchDetailMock'
import { useAuthStore } from '../../stores/authStore'
import { canAccessBranch } from '../../lib/access'

export function BranchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const branchId = Number(id)

  const branchQuery = useQuery({
    queryKey: ['branches', branchId],
    queryFn: async () => {
      const { data } = await api.get<Branch>(`/branches/${branchId}`)
      return data
    },
    enabled: !Number.isNaN(branchId),
    retry: false,
  })

  if (!id || Number.isNaN(branchId)) {
    return <Navigate to="/branches" replace />
  }

  if (branchQuery.isError) {
    return <Navigate to="/branches" replace />
  }

  const apiBranch = branchQuery.data
  if (apiBranch && !canAccessBranch(user, apiBranch)) {
    return <Navigate to="/branches" replace />
  }

  const branch = getBranchDetail(id, apiBranch)

  return (
    <AsyncState isLoading={branchQuery.isLoading} isError={false} error={null}>
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
    </AsyncState>
  )
}
