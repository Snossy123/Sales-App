import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AuthUser } from '../api/types'
import { useAuthStore } from '../stores/authStore'

export function useAuthRefresh() {
  const token = useAuthStore((s) => s.token)
  const userId = useAuthStore((s) => s.user?.id)
  const updateUser = useAuthStore((s) => s.updateUser)

  const query = useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: async () => {
      const { data } = await api.get<AuthUser>('/auth/me')
      return data
    },
    enabled: Boolean(token),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!query.data) return
    if (userId != null && query.data.id !== userId) return
    updateUser(query.data)
  }, [query.data, updateUser, userId])

  return query
}
