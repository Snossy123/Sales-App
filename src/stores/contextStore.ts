import { create } from 'zustand'
import type { Branch, Department, Warehouse } from '../api/types'
import { useAuthStore } from './authStore'

interface ContextState {
  departments: Department[]
  branches: Branch[]
  warehouses: Warehouse[]
  departmentsLoading: boolean
  branchesLoading: boolean
  warehousesLoading: boolean
  setDepartments: (departments: Department[]) => void
  setBranches: (branches: Branch[]) => void
  setWarehouses: (warehouses: Warehouse[]) => void
  setDepartmentsLoading: (loading: boolean) => void
  setBranchesLoading: (loading: boolean) => void
  setWarehousesLoading: (loading: boolean) => void
  selectDepartment: (departmentId: number) => void
  selectBranch: (branchId: number) => void
  selectWarehouse: (warehouseId: number) => void
}

export const useContextStore = create<ContextState>((set) => ({
  departments: [],
  branches: [],
  warehouses: [],
  departmentsLoading: false,
  branchesLoading: false,
  warehousesLoading: false,

  setDepartments: (departments) => set({ departments }),
  setBranches: (branches) => set({ branches }),
  setWarehouses: (warehouses) => set({ warehouses }),
  setDepartmentsLoading: (departmentsLoading) => set({ departmentsLoading }),
  setBranchesLoading: (branchesLoading) => set({ branchesLoading }),
  setWarehousesLoading: (warehousesLoading) => set({ warehousesLoading }),

  selectDepartment: (departmentId) => {
    useAuthStore.getState().setDepartmentId(departmentId)
    set({ branches: [], warehouses: [] })
  },

  selectBranch: (branchId) => {
    useAuthStore.getState().setBranchId(branchId)
    useAuthStore.getState().setWarehouseId(null)
    set({ warehouses: [] })
  },

  selectWarehouse: (warehouseId) => {
    useAuthStore.getState().setWarehouseId(warehouseId)
  },
}))
