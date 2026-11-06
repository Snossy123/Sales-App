import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { refreshCollectionData } from './collectionRefresh'

function client() { return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 } } }) }

describe('collection refresh after a successful action', () => {
  it('refreshes counters and the active filtered list without changing their scope', async () => {
    const queryClient = client()
    const filters = { branch: 4, collector: 8, status: 'postponed', search: 'اسم العميل' }
    let postponed = 0
    let rows: number[] = []
    const stats = new QueryObserver(queryClient, { queryKey: ['collection-daily-stats', filters.branch, filters.collector], queryFn: async () => ({ postponed }) })
    const list = new QueryObserver(queryClient, { queryKey: ['installments', 'pages', filters], queryFn: async () => [...rows] })
    const history = new QueryObserver(queryClient, { queryKey: ['collection-follow-ups', 12], queryFn: async () => [...rows] })
    const unsubscribes = [stats.subscribe(() => {}), list.subscribe(() => {}), history.subscribe(() => {})]
    try {
      await Promise.all([stats.refetch(), list.refetch(), history.refetch()])
      postponed = 1
      rows = [12]
      await refreshCollectionData(queryClient)
      expect(stats.getCurrentResult().data).toEqual({ postponed: 1 })
      expect(list.getCurrentResult().data).toEqual([12])
      expect(history.getCurrentResult().data).toEqual([12])
      expect(queryClient.getQueryData(['installments', 'pages', filters])).toEqual([12])
    } finally { unsubscribes.forEach((unsubscribe) => unsubscribe()); queryClient.clear() }
  })

  it('reports a failed counter refresh without turning a completed payment into a mutation error', async () => {
    const queryClient = client()
    let fail = false
    const stats = new QueryObserver(queryClient, { queryKey: ['collection-daily-stats', 4], queryFn: async () => { if (fail) throw new Error('offline'); return { paid: 7 } } })
    const unsubscribe = stats.subscribe(() => {})
    try {
      await stats.refetch()
      fail = true
      await expect(refreshCollectionData(queryClient)).resolves.toBeUndefined()
      expect(stats.getCurrentResult().isError).toBe(true)
      expect(stats.getCurrentResult().data).toEqual({ paid: 7 })
      fail = false
      await refreshCollectionData(queryClient)
      expect(stats.getCurrentResult().isError).toBe(false)
    } finally { unsubscribe(); queryClient.clear() }
  })
})
