import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PortalUser } from '../api/types'

interface PortalAuthState {
  token: string | null
  user: PortalUser | null
  setAuth: (token: string, user: PortalUser) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token, user) => set({ token, user }),

      logout: () => set({ token: null, user: null }),

      isAuthenticated: () => Boolean(get().token),
    }),
    {
      name: 'stitch-portal-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    },
  ),
)
