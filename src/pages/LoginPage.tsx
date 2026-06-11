import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, getErrorMessage, isDemoMode } from '../api/client'
import type { LoginResponse } from '../api/types'
import { useAuthStore } from '../stores/authStore'
import { getDefaultRoute } from '../lib/permissions'
import { Icon } from '../components/Icon'

const demoAccounts = [
  { email: 'superadmin@demo.test', label: 'مدير النظام الأعلى', icon: 'admin_panel_settings' },
  { email: 'deptadmin@demo.test', label: 'مدير إدارة الدلتا', icon: 'corporate_fare' },
  { email: 'sales@demo.test', label: 'قسم المبيعات', icon: 'point_of_sale' },
  { email: 'reviewer@demo.test', label: 'قسم المراجعة', icon: 'fact_check' },
  { email: 'collector@demo.test', label: 'قسم التحصيل', icon: 'payments' },
  { email: 'accountant@demo.test', label: 'قسم المحاسبة', icon: 'account_balance' },
  { email: 'crm@demo.test', label: 'قسم CRM', icon: 'hub' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('sales@demo.test')
  const [password, setPassword] = useState('demo')

  const loginMutation = useMutation({
    mutationFn: async (creds?: { email: string; password: string }) => {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        email: creds?.email ?? email,
        password: creds?.password ?? password,
        device_name: 'web',
      })
      return data
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user)
      navigate(getDefaultRoute(data.user))
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    loginMutation.mutate(undefined)
  }

  const handleReset = async () => {
    try {
      await api.post('/demo/reset')
      loginMutation.reset()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full min-w-[320px] max-w-[480px] rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-lg">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
            <Icon name="gps_fixed" filled size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-primary">نظام GPS</h1>
            <p className="text-sm text-on-surface-variant">
              بيع وتقسيط أجهزة التتبع — نسخة العرض
            </p>
          </div>
        </div>

        {isDemoMode && (
          <div className="mb-6 rounded-lg border border-secondary/30 bg-secondary/5 p-4">
            <p className="mb-3 text-sm font-semibold text-on-surface">دخول سريع للديمو</p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() =>
                    loginMutation.mutate({ email: acc.email, password: 'demo' })
                  }
                  disabled={loginMutation.isPending}
                  className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm transition-colors hover:bg-surface-container-high disabled:opacity-60"
                >
                  <Icon name={acc.icon} size={18} className="text-primary" />
                  {acc.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">
              كلمة المرور: <span dir="ltr">demo</span>
            </p>
          </div>
        )}

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

        {isDemoMode && (
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 w-full text-center text-xs text-on-surface-variant underline hover:text-primary"
          >
            إعادة ضبط بيانات الديمو
          </button>
        )}
      </div>
    </div>
  )
}
