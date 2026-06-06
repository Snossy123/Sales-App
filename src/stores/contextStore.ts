import { create } from 'zustand'
import type { Branch, Warehouse } from '../api/types'
import { useAuthStore } from './authStore'

interface ContextState {
  branches: Branch[]
  warehouses: Warehouse[]
  branchesLoading: boolean
  warehousesLoading: boolean
  setBranches: (branches: Branch[]) => void
  setWarehouses: (warehouses: Warehouse[]) => void
  setBranchesLoading: (loading: boolean) => void
  setWarehousesLoading: (loading: boolean) => void
  selectBranch: (branchId: number) => void
  selectWarehouse: (warehouseId: number) => void
}

export const useContextStore = create<ContextState>((set) => ({
  branches: [],
  warehouses: [],
  branchesLoading: false,
  warehousesLoading: false,

  setBranches: (branches) => set({ branches }),
  setWarehouses: (warehouses) => set({ warehouses }),
  setBranchesLoading: (branchesLoading) => set({ branchesLoading }),
  setWarehousesLoading: (warehousesLoading) => set({ warehousesLoading }),

  selectBranch: (branchId) => {
    useAuthStore.getState().setBranchId(branchId)
    useAuthStore.getState().setWarehouseId(null)
    set({ warehouses: [] })
  },

  selectWarehouse: (warehouseId) => {
    useAuthStore.getState().setWarehouseId(warehouseId)
  },
}))
