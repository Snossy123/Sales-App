import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../api/client'
import { canAccessRoute } from '../../lib/permissions'
import { useAuthStore } from '../../stores/authStore'
import { Icon } from '../Icon'

const SUGGESTIONS = [
  'أين أضيف قسم؟',
  'أين أضيف فرع؟',
  'كيف أعمل تعاقد جديد؟',
  'كيف أحصّل قسطاً؟',
]

interface ChatResponse {
  answer?: string | null
  question?: string | null
  route?: string | null
  route_label?: string | null
  breadcrumb?: string | null
  suggestions?: string[]
}

interface BotMessage {
  text: string
  breadcrumb?: string | null
  route?: string | null
  routeLabel?: string | null
  suggestions?: string[]
}

interface HistoryEntry {
  role: 'user' | 'bot'
  text: string
  bot?: BotMessage
}

export function ChatbotWidget() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const chatMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post<ChatResponse>('/faq/chat', { message: text })
      return data
    },
    onSuccess: (data) => {
      const route = data.route && canAccessRoute(data.route, user) ? data.route : null
      setHistory((h) => [
        ...h,
        {
          role: 'bot',
          text:
            data.answer ??
            'لم أجد إجابة مطابقة. جرّب صياغة أخرى أو راجع صفحة الأسئلة الشائعة.',
          bot: {
            text: data.answer ?? '',
            breadcrumb: data.breadcrumb,
            route,
            routeLabel: data.route_label,
            suggestions: data.suggestions ?? [],
          },
        },
      ])
    },
    onError: () => {
      setHistory((h) => [
        ...h,
        { role: 'bot', text: 'حدث خطأ أثناء البحث. حاول مرة أخرى.' },
      ])
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, chatMutation.isPending])

  const send = (text?: string) => {
    const trimmed = (text ?? message).trim()
    if (!trimmed || chatMutation.isPending) return
    setHistory((h) => [...h, { role: 'user', text: trimmed }])
    setMessage('')
    chatMutation.mutate(trimmed)
  }

  const renderBotExtras = (entry: HistoryEntry) => {
    const bot = entry.bot
    if (!bot) return null

    return (
      <div className="mt-2 space-y-2">
        {bot.breadcrumb && (
          <p className="text-xs text-on-surface-variant">{bot.breadcrumb}</p>
        )}
        {bot.route && bot.routeLabel && (
          <button
            type="button"
            onClick={() => {
              navigate(bot.route!)
              setOpen(false)
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-sm py-1.5 text-xs font-bold text-on-primary transition hover:bg-primary/90"
          >
            <Icon name="open_in_new" size={14} />
            انتقل إلى {bot.routeLabel}
          </button>
        )}
        {bot.suggestions && bot.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {bot.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="rounded-full border border-outline-variant bg-surface-container-low px-2 py-0.5 text-[11px] text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-3">
      {open && (
        <div
          role="dialog"
          aria-label="مساعد الأسئلة الشائعة"
          className="flex h-[min(70vh,480px)] w-[min(calc(100vw-3rem),380px)] flex-col overflow-hidden rounded-2xl border border-outline-variant/80 bg-surface-container-lowest shadow-2xl"
        >
          <div className="flex items-center gap-sm border-b border-outline-variant bg-primary px-md py-3 text-on-primary">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-on-primary/15">
              <Icon name="support_agent" size={22} className="text-on-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">مساعد الأسئلة الشائعة</p>
              <p className="truncate text-xs text-on-primary/80">متاح للإجابة على استفساراتك</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-primary transition hover:bg-on-primary/15"
              aria-label="إغلاق"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <div className="flex-1 space-y-md overflow-y-auto bg-surface-container-low/40 p-md">
            {history.length === 0 && (
              <div className="space-y-md pt-1">
                <div className="flex gap-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name="smart_toy" size={18} />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-surface-container-lowest px-sm py-2 text-sm leading-relaxed text-on-surface shadow-sm ring-1 ring-outline-variant/40">
                    مرحباً! اسأل «أين أضيف قسم؟» أو عن التحصيل والعقود وأي إجراء في النظام.
                  </div>
                </div>
                <div className="flex flex-wrap gap-xs pe-10">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="rounded-full border border-outline-variant bg-surface-container-lowest px-sm py-1 text-xs text-on-surface-variant transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.map((entry, i) => (
              <div
                key={i}
                className={`flex max-w-full gap-sm ${
                  entry.role === 'user'
                    ? 'ms-auto flex-row-reverse'
                    : 'me-auto flex-row'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    entry.role === 'user'
                      ? 'bg-secondary/15 text-secondary'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Icon
                    name={entry.role === 'user' ? 'person' : 'smart_toy'}
                    size={18}
                  />
                </div>
                <div
                  className={`max-w-[80%] px-sm py-2 text-sm leading-relaxed ${
                    entry.role === 'user'
                      ? 'rounded-2xl rounded-tl-sm bg-primary text-on-primary shadow-sm'
                      : 'rounded-2xl rounded-tr-sm bg-surface-container-lowest text-on-surface shadow-sm ring-1 ring-outline-variant/40'
                  }`}
                >
                  {entry.text}
                  {entry.role === 'bot' && renderBotExtras(entry)}
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex gap-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name="smart_toy" size={18} />
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-tr-sm bg-surface-container-lowest px-sm py-3 shadow-sm ring-1 ring-outline-variant/40">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant/50 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant/50 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant/50 [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="border-t border-outline-variant bg-surface-container-lowest p-sm"
          >
            <div className="flex items-center gap-sm rounded-xl border border-outline-variant bg-surface-container-low px-sm py-1 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب سؤالك..."
                disabled={chatMutation.isPending}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/70 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!message.trim() || chatMutation.isPending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="إرسال"
              >
                <Icon name="send" size={18} className="-scale-x-100" />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition hover:bg-primary/90 hover:shadow-xl ${
          open ? 'ring-2 ring-primary/30 ring-offset-2 ring-offset-surface-container-lowest' : ''
        }`}
        aria-label={open ? 'إغلاق المساعد' : 'فتح المساعد'}
        aria-expanded={open}
      >
        <Icon name={open ? 'close' : 'support_agent'} size={open ? 24 : 28} />
      </button>
    </div>
  )
}
