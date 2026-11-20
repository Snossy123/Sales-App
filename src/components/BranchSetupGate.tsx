import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from '../api/client'

type SetupStatus = {
  mode: 'cloud' | 'branch'
  needs_setup: boolean
}

export function BranchSetupGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const query = useQuery({
    queryKey: ['setup-status'],
    queryFn: async () => (await api.get<SetupStatus>('/setup/status')).data,
    retry: false,
    staleTime: 10_000,
  })

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-on-surface-variant">
        جاري التحميل…
      </div>
    )
  }

  if (query.isError) {
    return children
  }

  const needsSetup = query.data?.needs_setup === true
  const onSetup = location.pathname === '/setup'

  if (needsSetup && !onSetup) {
    return <Navigate to="/setup" replace />
  }

  if (!needsSetup && onSetup) {
    return <Navigate to="/login" replace />
  }

  return children
}
