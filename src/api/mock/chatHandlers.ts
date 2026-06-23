import type { ChatConversationSummary, ChatMessage } from '../types'
import { loadState, mutateState } from './store'
import type { DemoState } from './seed'

type ChatMethod = string
type ChatData = Record<string, unknown> | undefined

interface MockChatConversation {
  id: number
  type: string
  participant_ids: number[]
  last_read_at: Record<number, string | null>
}

function mockError(status: number, message: string): Error {
  const err = new Error(message) as Error & { response?: { status: number; data: { message: string } } }
  err.response = { status, data: { message } }
  return err
}

function ensureChatState(s: DemoState): void {
  if (!s.chatConversations) s.chatConversations = []
  if (!s.chatMessages) s.chatMessages = []
}

function findDirectConversation(state: DemoState, userA: number, userB: number): MockChatConversation | undefined {
  return state.chatConversations?.find(
    (c) =>
      c.type === 'direct' &&
      c.participant_ids.includes(userA) &&
      c.participant_ids.includes(userB),
  )
}

function unreadCount(
  state: DemoState,
  conversation: MockChatConversation,
  userId: number,
): number {
  const lastRead = conversation.last_read_at[userId]
  return (state.chatMessages ?? []).filter(
    (m) =>
      m.conversation_id === conversation.id &&
      m.sender_id !== userId &&
      (!lastRead || (m.created_at ?? '') > lastRead),
  ).length
}

function summarizeConversation(
  state: DemoState,
  conversation: MockChatConversation,
  userId: number,
): ChatConversationSummary {
  const otherId = conversation.participant_ids.find((id) => id !== userId) ?? userId
  const otherUser = state.users.find((u) => u.id === otherId)
  const messages = (state.chatMessages ?? [])
    .filter((m) => m.conversation_id === conversation.id)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  const lastMessage = messages[messages.length - 1]

  return {
    id: conversation.id,
    type: conversation.type,
    other_user: otherUser ? { id: otherUser.id, name: otherUser.name, email: otherUser.email } : undefined,
    last_message: lastMessage,
    unread_count: unreadCount(state, conversation, userId),
    updated_at: lastMessage?.created_at,
  }
}

export function tryHandleChatRequest(
  method: ChatMethod,
  path: string,
  data: ChatData,
  userId?: number,
): unknown | null {
  if (!userId) return null

  const m = method.toUpperCase()
  const state = loadState()

  if (m === 'GET' && path === 'chat/contacts') {
    const contacts = state.users
      .filter((u) => u.id !== userId)
      .map((u) => ({ id: u.id, name: u.name, email: u.email }))
    return { data: contacts }
  }

  if (m === 'GET' && path === 'chat/conversations') {
    ensureChatState(state)
    const rows = (state.chatConversations ?? [])
      .filter((c) => c.participant_ids.includes(userId))
      .map((c) => summarizeConversation(state, c, userId))
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))

    return {
      data: rows,
      unread_count: rows.reduce((sum, row) => sum + row.unread_count, 0),
    }
  }

  if (m === 'POST' && path === 'chat/conversations') {
    const body = data as { recipient_user_id?: number }
    const recipientId = Number(body.recipient_user_id)
    if (!recipientId || recipientId === userId) throw mockError(422, 'مستخدم غير صالح')

    let conversation: MockChatConversation | undefined
    mutateState((s) => {
      ensureChatState(s)
      conversation = findDirectConversation(s, userId, recipientId)
      if (!conversation) {
        const id = (s.chatConversations!.reduce((max, c) => Math.max(max, c.id), 0) || 0) + 1
        conversation = {
          id,
          type: 'direct',
          participant_ids: [userId, recipientId],
          last_read_at: { [userId]: null, [recipientId]: null },
        }
        s.chatConversations!.push(conversation)
      }
    })

    return conversation
  }

  const readMatch = path.match(/^chat\/conversations\/(\d+)\/read$/)
  if (m === 'POST' && readMatch) {
    const conversationId = Number(readMatch[1])
    mutateState((s) => {
      ensureChatState(s)
      const conv = s.chatConversations!.find((c) => c.id === conversationId)
      if (!conv || !conv.participant_ids.includes(userId)) throw mockError(403, 'غير مسموح')
      conv.last_read_at[userId] = new Date().toISOString()
    })
    return { message: 'ok' }
  }

  const messagesMatch = path.match(/^chat\/conversations\/(\d+)\/messages$/)
  if (messagesMatch) {
    const conversationId = Number(messagesMatch[1])
    const conv = state.chatConversations?.find((c) => c.id === conversationId)
    if (!conv || !conv.participant_ids.includes(userId)) throw mockError(403, 'غير مسموح')

    if (m === 'GET') {
      const messages = (state.chatMessages ?? [])
        .filter((m) => m.conversation_id === conversationId)
        .map((msg) => ({
          ...msg,
          sender: state.users.find((u) => u.id === msg.sender_id),
        }))
      return { data: messages, meta: { total: messages.length, per_page: 100, current_page: 1 } }
    }

    if (m === 'POST') {
      const body = data as { body?: string }
      let created: ChatMessage | undefined
      mutateState((s) => {
        ensureChatState(s)
        const id = (s.chatMessages!.reduce((max, msg) => Math.max(max, msg.id), 0) || 0) + 1
        created = {
          id,
          conversation_id: conversationId,
          sender_id: userId,
          body: String(body.body ?? '').trim(),
          created_at: new Date().toISOString(),
        }
        s.chatMessages!.push(created)
      })
      return {
        ...created!,
        sender: state.users.find((u) => u.id === userId),
      }
    }
  }

  return null
}
