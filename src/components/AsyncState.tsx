import type { ReactNode } from 'react'
import { getErrorMessage } from '../api/client'

interface AsyncStateProps {
  isLoading: boolean
  isError: boolean
  error: unknown
  children: ReactNode
}

export function AsyncState({ isLoading, isError, error, children }: AsyncStateProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-xl text-on-surface-variant">
        جاري التحميل...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-error/30 bg-error-container/30 p-md text-error">
        {getErrorMessage(error)}
      </div>
    )
  }

  return <>{children}</>
}
