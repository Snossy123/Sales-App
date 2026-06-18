import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Icon } from '../Icon'

export function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<{ role: 'user' | 'bot'; text: string }[]>([])

  const chatMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post<{
        answer?: string | null
        question?: string | null
        suggestions?: string[]
      }>('/faq/chat', { message: text })
      return data
    },
    onSuccess: (data, text) => {
      setHistory((h) => [
        ...h,
        { role: 'user', text },
        {
          role: 'bot',
          text: data.answer ?? 'لم أجد إجابة مطابقة. جرّب صياغة أخرى أو راجع صفحة الأسئلة الشائعة.',
        },
      ])
      setMessage('')
    },
  })

  const send = () => {
    const text = message.trim()
    if (!text || chatMutation.isPending) return
    chatMutation.mutate(text)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg"
        aria-label="مساعدة"
      >
        <Icon name="support_agent" size={28} />
      </button>

      {open && (
        <div className="fixed bottom-24 left-6 z-40 flex h-[420px] w-[min(100vw-2rem,360px)] flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xl">
          <div className="flex items-center justify-between border-b border-outline-variant px-md py-sm">
            <span className="font-bold text-on-surface">مساعد الأسئلة الشائعة</span>
            <button type="button" onClick={() => setOpen(false)} className="text-on-surface-variant">
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="flex-1 space-y-sm overflow-y-auto p-md text-sm">
            {history.length === 0 && (
              <p className="text-on-surface-variant">اسأل عن التحصيل، الأقساط، العقود، أو أي إجراء في النظام.</p>
            )}
            {history.map((entry, i) => (
              <div
                key={i}
                className={`rounded-lg px-sm py-xs ${
                  entry.role === 'user'
                    ? 'ml-8 bg-primary/10 text-on-surface'
                    : 'mr-8 bg-surface-container-low text-on-surface-variant'
                }`}
              >
                {entry.text}
              </div>
            ))}
          </div>
          <div className="flex gap-1 border-t border-outline-variant p-sm">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="اكتب سؤالك..."
              className="min-w-0 flex-1 rounded-lg border border-outline-variant px-sm py-2 text-sm"
            />
            <button
              type="button"
              onClick={send}
              disabled={chatMutation.isPending}
              className="rounded-lg bg-primary px-sm text-on-primary disabled:opacity-60"
            >
              <Icon name="send" size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
