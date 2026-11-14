import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useLoadingStore } from '../stores/loadingStore'

/**
 * Tracks React Router location changes in the global loading store.
 * Must be rendered inside `<BrowserRouter>`.
 */
export function RouteLoadingTracker() {
  const location = useLocation()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const { startRouteTransition, endRouteTransition } = useLoadingStore.getState()
    startRouteTransition()

    const rafId = requestAnimationFrame(() => {
      endRouteTransition()
    })

    return () => {
      cancelAnimationFrame(rafId)
      endRouteTransition()
    }
  }, [location.pathname, location.search])

  return null
}
