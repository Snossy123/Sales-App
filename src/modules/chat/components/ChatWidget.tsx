import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { ChatConversationSummary } from '../../../api/types'
import { Icon } from '../../../components/Icon'

export function ChatWidget() {
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

  const unread = conversationsQuery.data?.unread_count ?? 0

  return (
    <Link
      to="/messages"
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container"
      title="الرسائل"
    >
      <Icon name="chat" size={20} />
      {unread > 0 && (
        <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
