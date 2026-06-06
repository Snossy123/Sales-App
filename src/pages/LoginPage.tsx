import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { LoginResponse } from '../api/types'
import { useAuthStore } from '../stores/authStore'
import { Icon } from '../components/Icon'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('admin@stitch-smart.test')
  const [password, setPassword] = useState('password')

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
        device_name: 'web',
      })
      return data
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user)
      navigate('/')
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full min-w-[320px] max-w-[420px] rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-lg">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
            <Icon name="devices" filled size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-primary">ستيتش سمارت</h1>
            <p className="text-sm text-on-surface-variant">تسجيل الدخول إلى نظام التقسيط الذكي</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
          <div className="w-full">
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-on-surface-variant"
            >
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="box-border w-full min-w-0 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              dir="ltr"
            />
          </div>
          <div className="w-full">
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-on-surface-variant"
            >
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="box-border w-full min-w-0 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              dir="ltr"
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
            className="w-full rounded-lg bg-primary py-3 text-base font-bold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loginMutation.isPending ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}
