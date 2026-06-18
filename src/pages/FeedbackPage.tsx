import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import { SalesPageShell } from '../components/SalesPageShell'

export function FeedbackPage() {
  const location = useLocation()
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/feedback', {
        page_context: location.pathname,
        rating: rating || undefined,
        message,
      })
      return data
    },
    onSuccess: () => {
      setSubmitted(true)
      setMessage('')
      setRating(0)
    },
  })

  return (
    <SalesPageShell title="ملاحظاتك تهمنا" subtitle="ساعدنا في تحسين النظام">
      {submitted ? (
        <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-md text-center">
          <p className="font-semibold text-secondary">شكراً لملاحظتك!</p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-sm text-sm text-primary hover:underline"
          >
            إرسال ملاحظة أخرى
          </button>
        </div>
      ) : (
        <form
          className="mx-auto max-w-lg space-y-md"
          onSubmit={(e) => {
            e.preventDefault()
            submitMutation.mutate()
          }}
        >
          <div>
            <p className="mb-sm text-sm text-on-surface-variant">التقييم (اختياري)</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`h-10 w-10 rounded-full border text-sm font-bold ${
                    rating >= n
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant text-on-surface-variant'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-xs block text-sm text-on-surface-variant">رسالتك *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              className="w-full rounded-lg border border-outline-variant px-sm py-2"
              placeholder="ما الذي يمكننا تحسينه؟"
            />
          </div>
          <p className="text-xs text-on-surface-variant">السياق: {location.pathname}</p>
          {submitMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(submitMutation.error)}</p>
          )}
          <button
            type="submit"
            disabled={submitMutation.isPending || !message.trim()}
            className="w-full rounded-lg bg-primary py-3 font-bold text-on-primary disabled:opacity-60"
          >
            {submitMutation.isPending ? 'جاري الإرسال...' : 'إرسال الملاحظة'}
          </button>
        </form>
      )}
    </SalesPageShell>
  )
}
