import { create } from 'zustand'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Set to true to opt out of the global content loading overlay (e.g. silent background polling). */
    skipGlobalLoader?: boolean
  }

  export interface InternalAxiosRequestConfig {
    skipGlobalLoader?: boolean
    _trackedByGlobalLoader?: boolean
  }
}

const LOADER_DEBOUNCE_MS = 150

interface LoadingState {
  activeRequests: number
  isRouteTransitioning: boolean
  isLoading: boolean
  startRequest: () => void
  endRequest: () => void
  startRouteTransition: () => void
  endRouteTransition: () => void
  reset: () => void
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function clearDebounceTimer() {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

function syncLoaderVisibility(
  get: () => LoadingState,
  set: (partial: Partial<LoadingState>) => void,
) {
  const { activeRequests, isRouteTransitioning, isLoading } = get()
  const isBusy = activeRequests > 0 || isRouteTransitioning

  if (!isBusy) {
    clearDebounceTimer()
    if (isLoading) {
      set({ isLoading: false })
    }
    return
  }

  if (isLoading || debounceTimer !== null) {
    return
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null
    const current = get()
    if (current.activeRequests > 0 || current.isRouteTransitioning) {
      set({ isLoading: true })
    }
  }, LOADER_DEBOUNCE_MS)
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  activeRequests: 0,
  isRouteTransitioning: false,
  isLoading: false,

  startRequest: () => {
    set((state) => ({ activeRequests: state.activeRequests + 1 }))
    syncLoaderVisibility(get, set)
  },

  endRequest: () => {
    set((state) => ({ activeRequests: Math.max(0, state.activeRequests - 1) }))
    syncLoaderVisibility(get, set)
  },

  startRouteTransition: () => {
    set({ isRouteTransitioning: true })
    syncLoaderVisibility(get, set)
  },

  endRouteTransition: () => {
    set({ isRouteTransitioning: false })
    syncLoaderVisibility(get, set)
  },

  reset: () => {
    clearDebounceTimer()
    set({
      activeRequests: 0,
      isRouteTransitioning: false,
      isLoading: false,
    })
  },
}))
