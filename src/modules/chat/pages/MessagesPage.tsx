import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type {
  AdminUser,
  ChatConversationSummary,
  ChatMessage,
  PaginatedResponse,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { useAuthStore } from '../../../stores/authStore'

export function MessagesPage() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [recipientId, setRecipientId] = useState<number | ''>('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const conversationsQuery = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ChatConversationSummary[]; unread_count: number }>(
        '/chat/conversations',
      )
      return data
    },
    refetchInterval: 10000,
  })

  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', selectedId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ChatMessage>>(
        `/chat/conversations/${selectedId}/messages`,
        { params: { per_page: 100 } },
      )
      return data.data ?? []
    },
    enabled: Boolean(selectedId),
    refetchInterval: selectedId ? 10000 : false,
  })

  const usersQuery = useQuery({
    queryKey: ['chat', 'contacts'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminUser[] }>('/chat/contacts')
      return data.data ?? []
    },
    enabled: newChatOpen,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQuery.data])

  useEffect(() => {
    if (selectedId) {
      api.post(`/chat/conversations/${selectedId}/read`).then(() => {
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
      })
    }
  }, [selectedId, queryClient])

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const { data } = await api.post<ChatMessage>(`/chat/conversations/${selectedId}/messages`, {
        body,
      })
      return data
    },
    onSuccess: () => {
      setDraft('')
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', selectedId] })
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
  })

  const startChatMutation = useMutation({
    mutationFn: async (recipient_user_id: number) => {
      const { data } = await api.post<{ id: number }>('/chat/conversations', { recipient_user_id })
      return data
    },
    onSuccess: (conversation) => {
      setSelectedId(conversation.id)
      setNewChatOpen(false)
      setRecipientId('')
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
  })

  const conversations = conversationsQuery.data?.data ?? []
  const selected = conversations.find((c) => c.id === selectedId)

  return (
    <SalesPageShell
      title="الرسائل"
      subtitle="محادثات داخلية بين الموظفين"
      actions={
        <button
          type="button"
          onClick={() => setNewChatOpen(true)}
          className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary"
        >
          محادثة جديدة
        </button>
      }
    >
      <div className="grid min-h-[28rem] grid-cols-1 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest md:grid-cols-[280px_1fr]">
        <aside className="border-b border-outline-variant md:border-b-0 md:border-l">
          <AsyncState
            isLoading={conversationsQuery.isLoading}
            isError={conversationsQuery.isError}
            error={conversationsQuery.error}
          >
            <ul className="max-h-[28rem] overflow-y-auto">
              {conversations.length === 0 ? (
                <li className="p-md text-center text-sm text-on-surface-variant">لا محادثات</li>
              ) : (
                conversations.map((conv) => (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(conv.id)}
                      className={`flex w-full items-start gap-sm border-b border-outline-variant/50 px-md py-sm text-right hover:bg-surface-container ${
                        selectedId === conv.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{conv.other_user?.name ?? 'مستخدم'}</p>
                        <p className="truncate text-xs text-on-surface-variant">
                          {conv.last_message?.body ?? '—'}
                        </p>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-on-primary">
                          {conv.unread_count}
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </AsyncState>
        </aside>

        <section className="flex flex-col">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center p-lg text-sm text-on-surface-variant">
              اختر محادثة أو ابدأ محادثة جديدة
            </div>
          ) : (
            <>
              <header className="border-b border-outline-variant px-md py-sm font-medium">
                {selected?.other_user?.name ?? 'محادثة'}
              </header>
              <div className="flex-1 space-y-sm overflow-y-auto p-md">
                <AsyncState
                  isLoading={messagesQuery.isLoading}
                  isError={messagesQuery.isError}
                  error={messagesQuery.error}
                >
                  {(messagesQuery.data ?? []).map((msg) => {
                    const mine = msg.sender_id === user?.id
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${mine ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-md py-sm text-sm ${
                            mine
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container text-on-surface'
                          }`}
                        >
                          {!mine && (
                            <p className="mb-xs text-xs opacity-80">{msg.sender?.name}</p>
                          )}
                          <p>{msg.body}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </AsyncState>
              </div>
              <form
                className="flex gap-sm border-t border-outline-variant p-md"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!draft.trim() || sendMutation.isPending) return
                  sendMutation.mutate(draft.trim())
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="اكتب رسالة..."
                  className="flex-1 rounded-lg border border-outline-variant px-sm py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={sendMutation.isPending || !draft.trim()}
                  className="rounded-lg bg-primary px-md py-sm text-on-primary disabled:opacity-60"
                >
                  <Icon name="send" size={20} />
                </button>
              </form>
              {sendMutation.isError && (
                <p className="px-md pb-sm text-sm text-error">{getErrorMessage(sendMutation.error)}</p>
              )}
            </>
          )}
        </section>
      </div>

      <Modal open={newChatOpen} onClose={() => setNewChatOpen(false)} title="محادثة جديدة">
        <select
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value ? Number(e.target.value) : '')}
          className="mb-sm w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
        >
          <option value="">اختر مستخدم</option>
          {(usersQuery.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!recipientId || startChatMutation.isPending}
          onClick={() => startChatMutation.mutate(Number(recipientId))}
          className="rounded-lg bg-primary px-md py-sm text-sm text-on-primary disabled:opacity-60"
        >
          بدء المحادثة
        </button>
      </Modal>
    </SalesPageShell>
  )
}
