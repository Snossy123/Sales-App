import { useEffect, useRef } from 'react'

export function useDebouncedDraftSync<T>(
  value: T,
  save: (value: T) => void,
  enabled: boolean,
  delay = 300,
) {
  const skipFirst = useRef(true)

  useEffect(() => {
    if (!enabled) return
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    const timer = window.setTimeout(() => save(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, save, enabled, delay])
}
