// src/features/moderator/hooks/useModeratorInbox.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'

export interface ModeratorMessage {
  id: string
  fromUserId: string
  fromDisplayName: string
  subject: string
  message: string
  moderatorReply: string | null
  resolved: boolean
  createdAt: string
}

interface RawMessage {
  id: string
  from_user_id: string
  subject: string
  message: string
  moderator_reply: string | null
  resolved: boolean
  created_at: string
  sender: { display_name: string } | null
}

export function useModeratorInbox(): {
  messages: ModeratorMessage[]
  loading: boolean
  error: string | null
  replyToMessage: (messageId: string, reply: string) => Promise<void>
  markResolved: (messageId: string) => Promise<void>
} {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ModeratorMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error: fetchError } = await supabase
          .from('moderator_messages')
          .select(
            'id, from_user_id, subject, message, moderator_reply, resolved, created_at, sender:users!from_user_id(display_name)'
          )
          .order('resolved', { ascending: true })
          .order('created_at', { ascending: false })

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        const rows = (data ?? []) as unknown as RawMessage[]
        setMessages(
          rows.map(r => ({
            id: r.id,
            fromUserId: r.from_user_id,
            fromDisplayName: r.sender?.display_name ?? 'Unknown',
            subject: r.subject,
            message: r.message,
            moderatorReply: r.moderator_reply,
            resolved: r.resolved,
            createdAt: r.created_at,
          }))
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const replyToMessage = useCallback(
    async (messageId: string, reply: string) => {
      if (!user) return
      const { error: updateError } = await supabase
        .from('moderator_messages')
        .update({ moderator_reply: reply, replied_by: user.id, resolved: true })
        .eq('id', messageId)
      if (!updateError) {
        setMessages(prev =>
          prev.map(m =>
            m.id === messageId ? { ...m, moderatorReply: reply, resolved: true } : m
          )
        )
      }
    },
    [user]
  )

  const markResolved = useCallback(async (messageId: string) => {
    const { error: updateError } = await supabase
      .from('moderator_messages')
      .update({ resolved: true })
      .eq('id', messageId)
    if (!updateError) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, resolved: true } : m))
    }
  }, [])

  return { messages, loading, error, replyToMessage, markResolved }
}
