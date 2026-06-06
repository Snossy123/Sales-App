import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../api/types'

interface AuthState {
  token: string | null
  user: AuthUser | null
  branchId: number | null
  warehouseId: number | null
  setAuth: (token: string, user: AuthUser) => void
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
      branchId: null,
      warehouseId: null,

      setAuth: (token, user) =>
        set({
          token,
          user,
          branchId: user.branch_id ?? user.branch?.id ?? null,
        }),

      setBranchId: (branchId) => set({ branchId }),

      setWarehouseId: (warehouseId) => set({ warehouseId }),

      logout: () =>
        set({
          token: null,
          user: null,
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
        branchId: state.branchId,
        warehouseId: state.warehouseId,
      }),
    },
  ),
)
