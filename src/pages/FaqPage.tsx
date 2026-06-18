import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { SalesPageShell } from '../components/SalesPageShell'

interface FaqItem {
  id: number
  question_ar: string
  answer_ar: string
  category?: { name_ar?: string }
}

export function FaqPage() {
  const [openId, setOpenId] = useState<number | null>(null)

  const faqQuery = useQuery({
    queryKey: ['faq'],
    queryFn: async () => {
      const { data } = await api.get<{ data: FaqItem[] }>('/faq')
      return data.data ?? []
    },
  })

  return (
    <SalesPageShell title="الأسئلة الشائعة" subtitle="إجابات سريعة عن استخدام النظام">
      <AsyncState isLoading={faqQuery.isLoading} isError={faqQuery.isError} error={faqQuery.error}>
        <div className="space-y-sm">
          {(faqQuery.data ?? []).map((item) => (
            <div key={item.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest">
              <button
                type="button"
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
                className="flex w-full items-center justify-between px-md py-sm text-right font-semibold"
              >
                <span>{item.question_ar}</span>
                <span className="text-on-surface-variant">{openId === item.id ? '−' : '+'}</span>
              </button>
              {openId === item.id && (
                <div className="border-t border-outline-variant px-md py-sm text-sm text-on-surface-variant">
                  {item.answer_ar}
                </div>
              )}
            </div>
          ))}
          {(faqQuery.data ?? []).length === 0 && (
            <p className="text-center text-sm text-on-surface-variant">لا توجد أسئلة منشورة بعد.</p>
          )}
        </div>
      </AsyncState>
    </SalesPageShell>
  )
}
