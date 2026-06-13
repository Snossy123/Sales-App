import { create } from 'zustand'
import { api, isDemoMode } from '../api/client'
import type { AuthUser, UserPreferences } from '../api/types'
import type { TourId } from '../tours/types'

function localStorageKey(userId: number): string {
  return `stitch-tours-${userId}`
}

function readLocalTours(userId: number): Partial<Record<TourId, boolean>> {
  try {
    const raw = localStorage.getItem(localStorageKey(userId))
    if (!raw) return {}
    return JSON.parse(raw) as Partial<Record<TourId, boolean>>
  } catch {
    return {}
  }
}

function writeLocalTours(userId: number, tours: Partial<Record<TourId, boolean>>) {
  localStorage.setItem(localStorageKey(userId), JSON.stringify(tours))
}

interface TourState {
  completedTours: Partial<Record<TourId, boolean>>
  hydratedUserId: number | null
  hydrateFromUser: (user: AuthUser | null) => void
  isCompleted: (tourId: TourId) => boolean
  markComplete: (tourId: TourId, user: AuthUser | null) => Promise<void>
  reset: () => void
}

export const useTourStore = create<TourState>((set, get) => ({
  completedTours: {},
  hydratedUserId: null,

  hydrateFromUser: (user) => {
    if (!user) {
      set({ completedTours: {}, hydratedUserId: null })
      return
    }

    if (get().hydratedUserId === user.id) return

    const fromApi = user.preferences?.tours ?? {}
    const fromLocal = isDemoMode ? readLocalTours(user.id) : {}
    set({
      hydratedUserId: user.id,
      completedTours: { ...fromLocal, ...fromApi },
    })
  },

  isCompleted: (tourId) => Boolean(get().completedTours[tourId]),

  markComplete: async (tourId, user) => {
    if (!user) return

    const next = { ...get().completedTours, [tourId]: true }
    set({ completedTours: next })

    if (isDemoMode) {
      writeLocalTours(user.id, next)
      const { useAuthStore } = await import('./authStore')
      useAuthStore.setState({
        user: {
          ...user,
          preferences: {
            ...(user.preferences ?? {}),
            tours: next,
          },
        },
      })
      try {
        await api.patch('/auth/me/preferences', { tours: { [tourId]: true } })
      } catch {
        /* localStorage is source of truth in demo */
      }
      return
    }

    try {
      await api.patch('/auth/me/preferences', {
        tours: { [tourId]: true },
      })
      const updatedPreferences: UserPreferences = {
        ...(user.preferences ?? {}),
        tours: { ...(user.preferences?.tours ?? {}), [tourId]: true },
      }
      const { useAuthStore } = await import('./authStore')
      useAuthStore.setState({
        user: { ...user, preferences: updatedPreferences },
      })
    } catch {
      writeLocalTours(user.id, next)
    }
  },

  reset: () => set({ completedTours: {}, hydratedUserId: null }),
}))
