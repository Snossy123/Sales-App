import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Branch, PaginatedResponse, Warehouse } from '../api/types'
import { useAuthStore } from '../stores/authStore'
import { useContextStore } from '../stores/contextStore'

export function useContextData() {
  const branchId = useAuthStore((s) => s.branchId)
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const setBranchId = useAuthStore((s) => s.setBranchId)

  const {
    setBranches,
    setWarehouses,
    setBranchesLoading,
    setWarehousesLoading,
    selectWarehouse,
  } = useContextStore()

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const warehousesQuery = useQuery({
    queryKey: ['warehouses', branchId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Warehouse>>('/warehouses', {
        params: { per_page: 100, 'filter[branch_id]': branchId },
      })
      return data.data
    },
    enabled: Boolean(branchId),
  })

  useEffect(() => {
    setBranchesLoading(branchesQuery.isLoading)
    if (branchesQuery.data) {
      setBranches(branchesQuery.data)
      if (!branchId && branchesQuery.data[0]) {
        setBranchId(branchesQuery.data[0].id)
      }
    }
  }, [
    branchesQuery.data,
    branchesQuery.isLoading,
    branchId,
    setBranchId,
    setBranches,
    setBranchesLoading,
  ])

  useEffect(() => {
    setWarehousesLoading(warehousesQuery.isLoading)
    if (warehousesQuery.data) {
      setWarehouses(warehousesQuery.data)
      if (!warehouseId && warehousesQuery.data[0]) {
        selectWarehouse(warehousesQuery.data[0].id)
      }
    }
  }, [
    warehousesQuery.data,
    warehousesQuery.isLoading,
    warehouseId,
    selectWarehouse,
    setWarehouses,
    setWarehousesLoading,
  ])
}
