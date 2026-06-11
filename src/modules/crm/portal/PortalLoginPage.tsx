import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { portalApi } from '../../../api/portalClient'
import { getErrorMessage } from '../../../api/client'
import type { PortalLoginResponse } from '../../../api/types'
import { Icon } from '../../../components/Icon'
import { usePortalAuthStore } from '../../../stores/portalAuthStore'

export function PortalLoginPage() {
  const navigate = useNavigate()
  const setAuth = usePortalAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data } = await portalApi.post<PortalLoginResponse>('/portal/auth/login', {
        email,
        password,
      })
      return data
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user)
      navigate('/portal')
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-lg">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-on-secondary">
            <Icon name="person" filled size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-on-surface">بوابة العميل</h1>
            <p className="text-sm text-on-surface-variant">تتبع الفواتير والمدفوعات</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="portal-email"
              className="mb-1.5 block text-sm font-medium text-on-surface-variant"
            >
              البريد الإلكتروني
            </label>
            <input
              id="portal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              dir="ltr"
              className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="portal-password"
              className="mb-1.5 block text-sm font-medium text-on-surface-variant"
            >
              كلمة المرور
            </label>
            <input
              id="portal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              dir="ltr"
              className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {loginMutation.isError && (
            <p className="rounded-lg bg-error-container/40 px-3 py-2 text-sm text-error">
              {getErrorMessage(loginMutation.error)}
            </p>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="rounded-lg bg-secondary py-3 text-sm font-bold text-on-secondary disabled:opacity-60"
          >
            {loginMutation.isPending ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}
