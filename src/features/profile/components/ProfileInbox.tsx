import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

interface ModeratorMessage {
  id: string
  subject: string
  message: string
  moderator_reply: string | null
  created_at: string
  resolved: boolean
}

export function ProfileInbox() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ModeratorMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const { data } = await supabase
          .from('moderator_messages')
          .select('id, subject, message, moderator_reply, created_at, resolved')
          .eq('from_user_id', user!.id)
          .order('created_at', { ascending: false })
        setMessages((data ?? []) as ModeratorMessage[])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  if (loading) return <LoadingSpinner />

  if (messages.length === 0) {
    return <p className="text-text-muted text-sm">No messages yet.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map(msg => (
        <div key={msg.id} className="border border-border rounded-theme p-4 bg-bg-secondary">
          <p className="text-text-base font-semibold text-sm">{msg.subject}</p>
          <p className="text-text-muted text-sm mt-1">{msg.message}</p>
          {msg.moderator_reply ? (
            <div className="mt-3 pl-3 border-l-2 border-primary">
              <p className="text-xs text-primary font-semibold">Moderator reply:</p>
              <p className="text-text-base text-sm mt-0.5">{msg.moderator_reply}</p>
            </div>
          ) : (
            <p className="text-text-muted text-xs mt-2 italic">Awaiting reply...</p>
          )}
        </div>
      ))}
    </div>
  )
}
