import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'

interface UseSoftDeleteOptions {
  resource: string
  queryKeys?: string[][]
  onSuccess?: () => void
  onError?: (message: string) => void
}

export function useSoftDelete({
  resource,
  queryKeys = [[resource]],
  onSuccess,
  onError,
}: UseSoftDeleteOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<{ message?: string; trashed?: boolean }>(`/${resource}/${id}`)
      return data
    },
    onSuccess: () => {
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      onSuccess?.()
    },
    onError: (error) => {
      onError?.(getErrorMessage(error))
    },
  })
}
