import axios from 'axios'
import { create } from 'zustand'
import type { AuthUser } from '../api/types'
import type { TourId } from '../tours/types'
import { useAuthStore } from './authStore'

const tourSyncEnabled = import.meta.env.VITE_TOUR_SYNC_API === 'true'

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

/** Standalone Hostinger endpoint — upload deploy/tour-preferences.php to SALES-API/public/ */
export function getTourPreferencesUrl(): string | null {
  const configured = import.meta.env.VITE_TOUR_PREFERENCES_URL?.trim()
  if (configured) return configured

  const apiUrl = import.meta.env.VITE_API_URL?.trim()
  if (!apiUrl) return null

  return apiUrl.replace(/\/api\/v1\/?$/i, '/tour-preferences.php')
}

function authHeaders() {
  const { token, user, branchId, warehouseId, departmentId } = useAuthStore.getState()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  if (token) headers.Authorization = `Bearer ${token}`
  if (user?.organization_id) headers['X-Organization-Id'] = String(user.organization_id)
  if (branchId) headers['X-Branch-Id'] = String(branchId)
  if (warehouseId) headers['X-Warehouse-Id'] = String(warehouseId)
  if (departmentId) headers['X-Department-Id'] = String(departmentId)

  return headers
}

async function persistTourPreferences(
  user: AuthUser,
  tourId: TourId,
  next: Partial<Record<TourId, boolean>>,
): Promise<void> {
  if (!tourSyncEnabled) return

  const url = getTourPreferencesUrl()
  if (!url) return

  try {
    await axios.post(url, { tours: { [tourId]: true } }, { headers: authHeaders() })
  } catch {
    writeLocalTours(user.id, next)
  }
}

function syncAuthUserPreferences(user: AuthUser, next: Partial<Record<TourId, boolean>>) {
  return {
    ...user,
    preferences: {
      ...(user.preferences ?? {}),
      tours: next,
    },
  }
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
    const fromLocal = readLocalTours(user.id)
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
    writeLocalTours(user.id, next)

    useAuthStore.setState({
      user: syncAuthUserPreferences(user, next),
    })

    await persistTourPreferences(user, tourId, next)
  },

  reset: () => set({ completedTours: {}, hydratedUserId: null }),
}))
