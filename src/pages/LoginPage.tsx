import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { LoginResponse } from '../api/types'
import { useAuthStore } from '../stores/authStore'
import { getDefaultRoute } from '../lib/permissions'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
      navigate(getDefaultRoute(data.user))
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-[#eef3fb] px-4 py-8 sm:px-6 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -start-24 h-72 w-72 rounded-full bg-[#d6e6ff]/80 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -end-16 h-80 w-80 rounded-full bg-[#dbe7ff]/70 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-10 end-[12%] h-40 w-64 rounded-full bg-white/70 blur-2xl"
      />

      <div className="relative z-10 flex w-full min-w-0 max-w-[960px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_rgba(15,40,80,0.12)] md:min-h-[560px] md:flex-row">
        <section className="relative hidden min-h-[560px] w-[46%] shrink-0 overflow-hidden bg-[#0b4fd4] text-white md:order-2 md:block">
          <img
            src="/login/gps-car-illustration.png"
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover object-bottom"
          />
          <div className="relative z-10 flex flex-row-reverse items-center justify-center gap-3 px-8 pt-10">
            <img
              src="/login/gps-logo.png"
              alt=""
              className="h-14 w-14 object-contain brightness-0 invert"
            />
            <div className="text-start">
              <h1 className="text-[1.65rem] font-bold leading-tight drop-shadow-sm">نظام GPS</h1>
              <p className="mt-1 whitespace-nowrap text-sm text-white/90">بيع وتقسيط أجهزة التتبع</p>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10 md:order-1 md:px-12">
          <div className="w-full max-w-[380px]">
            <div className="mb-6 flex justify-center">
              <img src="/login/gps-logo.png" alt="نظام GPS" className="h-16 w-16 object-contain" />
            </div>
            <h2 className="text-center text-[1.7rem] font-bold text-[#12315c]">تسجيل الدخول</h2>
            <p className="mb-8 mt-2 text-center text-sm text-[#7b8798]">الدخول إلى نظام GPS</p>

            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4" noValidate={false}>
              <div className="w-full">
                <label htmlFor="email" className="sr-only">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <img
                    src="/login/email.png"
                    alt=""
                    className="pointer-events-none absolute top-1/2 end-4 h-5 w-5 -translate-y-1/2 object-contain"
                  />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="البريد الإلكتروني"
                    dir="ltr"
                    className="box-border w-full min-w-0 rounded-xl border border-[#e4e9f2] bg-white py-3.5 pe-12 ps-4 text-end text-base text-[#12315c] outline-none placeholder:text-[#9aa6b8] focus:border-[#1a6dff] focus:ring-2 focus:ring-[#1a6dff]/20"
                  />
                </div>
              </div>

              <div className="w-full">
                <label htmlFor="password" className="sr-only">
                  كلمة المرور
                </label>
                <div className="relative">
                  <img
                    src="/login/lock.png"
                    alt=""
                    className="pointer-events-none absolute top-1/2 end-4 h-5 w-5 -translate-y-1/2 object-contain"
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="كلمة المرور"
                    dir="ltr"
                    aria-invalid={loginMutation.isError || undefined}
                    className="box-border w-full min-w-0 rounded-xl border border-[#e4e9f2] bg-white py-3.5 pe-12 ps-12 text-end text-base text-[#12315c] outline-none placeholder:text-[#9aa6b8] focus:border-[#1a6dff] focus:ring-2 focus:ring-[#1a6dff]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    className="absolute top-1/2 start-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md hover:bg-[#f3f6fb] focus:outline-none focus:ring-2 focus:ring-[#1a6dff]/30"
                  >
                    <img
                      src={showPassword ? '/login/hide-password.png' : '/login/show-password.png'}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                  </button>
                </div>
              </div>

              {loginMutation.isError && (
                <p role="alert" className="rounded-lg bg-error-container/40 px-3 py-2 text-sm text-error">
                  {getErrorMessage(loginMutation.error)}
                </p>
              )}

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a6dff] py-3.5 text-base font-bold text-white transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#1a6dff]/40 disabled:opacity-60"
              >
                <span>{loginMutation.isPending ? 'جاري الدخول...' : 'دخول'}</span>
                {!loginMutation.isPending && (
                  <span
                    aria-hidden
                    className="inline-block h-7 w-7 shrink-0 bg-white"
                    style={{
                      WebkitMaskImage:
                        "linear-gradient(#fff,#fff), url('/login/login-arrow.png')",
                      maskImage: "linear-gradient(#fff,#fff), url('/login/login-arrow.png')",
                      WebkitMaskSize: '100% 100%, 138% 138%',
                      maskSize: '100% 100%, 138% 138%',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      WebkitMaskComposite: 'destination-out',
                      maskComposite: 'exclude',
                    }}
                  />
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
