import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLoadingStore } from './loadingStore'

describe('useLoadingStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useLoadingStore.getState().reset()
  })

  afterEach(() => {
    useLoadingStore.getState().reset()
    vi.useRealTimers()
  })

  it('debounces loader visibility by 150ms for fast requests', () => {
    useLoadingStore.getState().startRequest()
    expect(useLoadingStore.getState().activeRequests).toBe(1)
    expect(useLoadingStore.getState().isLoading).toBe(false)

    vi.advanceTimersByTime(100)
    expect(useLoadingStore.getState().isLoading).toBe(false)

    useLoadingStore.getState().endRequest()
    vi.advanceTimersByTime(100)
    expect(useLoadingStore.getState().isLoading).toBe(false)
  })

  it('shows loader after 150ms and hides immediately when all requests finish', () => {
    useLoadingStore.getState().startRequest()
    useLoadingStore.getState().startRequest()

    vi.advanceTimersByTime(150)
    expect(useLoadingStore.getState().isLoading).toBe(true)

    useLoadingStore.getState().endRequest()
    expect(useLoadingStore.getState().activeRequests).toBe(1)
    expect(useLoadingStore.getState().isLoading).toBe(true)

    useLoadingStore.getState().endRequest()
    expect(useLoadingStore.getState().activeRequests).toBe(0)
    expect(useLoadingStore.getState().isLoading).toBe(false)
  })

  it('tracks route transitions with the same 150ms debounce', () => {
    useLoadingStore.getState().startRouteTransition()
    expect(useLoadingStore.getState().isLoading).toBe(false)

    vi.advanceTimersByTime(150)
    expect(useLoadingStore.getState().isLoading).toBe(true)

    useLoadingStore.getState().endRouteTransition()
    expect(useLoadingStore.getState().isLoading).toBe(false)
  })
})
