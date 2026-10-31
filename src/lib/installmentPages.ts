import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { InstallmentItem } from '../api/types'

export const INSTALLMENT_PAGE_SIZE = 10

export type InstallmentPagePayload = {
  data: InstallmentItem[]
  meta?: { current_page: number; last_page: number }
  current_page?: number
  last_page?: number
}

export function installmentNextPage(lastPage: InstallmentPagePayload): number | undefined {
  const current = lastPage.meta?.current_page ?? lastPage.current_page ?? 1
  const last = lastPage.meta?.last_page ?? lastPage.last_page ?? 1
  return current < last ? current + 1 : undefined
}

export function useInstallmentPages(
  params: Record<string, string | number | undefined>,
  enabled = true,
) {
  const stable = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  )

  return useInfiniteQuery({
    queryKey: ['installments', 'pages', stable],
    initialPageParam: 1,
    enabled,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<InstallmentPagePayload>('/installments', {
        params: {
          ...stable,
          page: pageParam,
          per_page: INSTALLMENT_PAGE_SIZE,
          include: 'salesInvoice.customer',
        },
      })
      return data
    },
    getNextPageParam: installmentNextPage,
  })
}
