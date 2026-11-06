import type { QueryClient } from '@tanstack/react-query'

/** Await all collection views without treating a refresh failure as a failed payment. */
export async function refreshCollectionData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['collection-daily-stats'] }),
    queryClient.invalidateQueries({ queryKey: ['installments'] }),
    queryClient.invalidateQueries({ queryKey: ['collection-follow-ups'] }),
  ])
}
