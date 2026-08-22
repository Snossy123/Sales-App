import { useEffect, useRef } from 'react'
import { useProcedureDraftStore } from '../stores/procedureDraftStore'

interface UseProcedureDraftOptions<T> {
  id: string
  userId: number | null
  titleAr: string
  resumePath: string
  snapshot: T
  isMeaningful: boolean
  enabled?: boolean
  delay?: number
}

export function useProcedureDraft<T>({
  id,
  userId,
  titleAr,
  resumePath,
  snapshot,
  isMeaningful,
  enabled = true,
  delay = 300,
}: UseProcedureDraftOptions<T>) {
  const skipFirst = useRef(true)

  useEffect(() => {
    if (!enabled || userId == null || !id) return
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }

    const timer = window.setTimeout(() => {
      if (!isMeaningful) {
        useProcedureDraftStore.getState().clearDraft(id, userId)
        return
      }
      useProcedureDraftStore.getState().upsertDraft({
        id,
        userId,
        titleAr,
        resumePath,
        payload: snapshot,
      })
    }, delay)

    return () => window.clearTimeout(timer)
  }, [delay, enabled, id, isMeaningful, resumePath, snapshot, titleAr, userId])
}
