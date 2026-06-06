import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../api/types'

interface AuthState {
  token: string | null
  user: AuthUser | null
  departmentId: number | null
  branchId: number | null
  warehouseId: number | null
  setAuth: (token: string, user: AuthUser) => void
  setDepartmentId: (id: number | null) => void
  setBranchId: (id: number | null) => void
  setWarehouseId: (id: number | null) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      departmentId: null,
      branchId: null,
      warehouseId: null,

      setAuth: (token, user) =>
        set({
          token,
          user,
          departmentId: user.department_id ?? null,
          branchId: user.branch_id ?? user.branch?.id ?? null,
        }),

      setDepartmentId: (departmentId) =>
        set({ departmentId, branchId: null, warehouseId: null }),

      setBranchId: (branchId) => set({ branchId, warehouseId: null }),

      setWarehouseId: (warehouseId) => set({ warehouseId }),

      logout: () =>
        set({
          token: null,
          user: null,
          departmentId: null,
          branchId: null,
          warehouseId: null,
        }),

      isAuthenticated: () => Boolean(get().token),
    }),
    {
      name: 'stitch-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        departmentId: state.departmentId,
        branchId: state.branchId,
        warehouseId: state.warehouseId,
      }),
    },
  ),
)
