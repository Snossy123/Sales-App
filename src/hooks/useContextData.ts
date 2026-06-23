import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Branch, Department, PaginatedResponse, Warehouse } from '../api/types'
import { getScopedBranchId, getScopedDepartmentId } from '../lib/dataScope'
import { useAuthStore } from '../stores/authStore'
import { useContextStore } from '../stores/contextStore'

export function useContextData() {
  const user = useAuthStore((s) => s.user)
  const departmentId = useAuthStore((s) => s.departmentId)
  const branchId = useAuthStore((s) => s.branchId)
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const setDepartmentId = useAuthStore((s) => s.setDepartmentId)
  const setBranchId = useAuthStore((s) => s.setBranchId)

  const scopedDepartmentId = getScopedDepartmentId(user)
  const scopedBranchId = getScopedBranchId(user)

  const {
    setDepartments,
    setBranches,
    setWarehouses,
    setDepartmentsLoading,
    setBranchesLoading,
    setWarehousesLoading,
    selectWarehouse,
  } = useContextStore()

  const departmentsQuery = useQuery({
    queryKey: ['administrations', 'context'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/administrations', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', departmentId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: {
          per_page: 100,
          'filter[administration_id]': departmentId,
        },
      })
      return data.data
    },
    enabled: Boolean(departmentId),
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
    setDepartmentsLoading(departmentsQuery.isLoading)
    if (departmentsQuery.data) {
      setDepartments(departmentsQuery.data)
      if (scopedDepartmentId != null) {
        if (departmentId !== scopedDepartmentId) {
          setDepartmentId(scopedDepartmentId)
        }
      } else if (!departmentId && departmentsQuery.data[0]) {
        setDepartmentId(departmentsQuery.data[0].id)
      }
    }
  }, [
    departmentsQuery.data,
    departmentsQuery.isLoading,
    departmentId,
    scopedDepartmentId,
    setDepartmentId,
    setDepartments,
    setDepartmentsLoading,
  ])

  useEffect(() => {
    setBranchesLoading(branchesQuery.isLoading)
    if (branchesQuery.data) {
      setBranches(branchesQuery.data)
      if (scopedBranchId != null) {
        if (branchId !== scopedBranchId) {
          setBranchId(scopedBranchId)
        }
      } else if (!branchId && branchesQuery.data[0]) {
        setBranchId(branchesQuery.data[0].id)
      }
    }
  }, [
    branchesQuery.data,
    branchesQuery.isLoading,
    branchId,
    scopedBranchId,
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
