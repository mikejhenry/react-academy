// src/features/moderator/components/ModeratorInbox.tsx
import { useState } from 'react'
import { useModeratorInbox } from '../hooks/useModeratorInbox'
import { formatRelativeTime } from '@/features/comments/utils/formatRelativeTime'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

export function ModeratorInbox() {
  const { messages, loading, error, replyToMessage, markResolved } = useModeratorInbox()
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)

  const handleReply = async (messageId: string) => {
    const text = replyText[messageId]?.trim()
    if (!text) return
    setSending(messageId)
    try {
      await replyToMessage(messageId, text)
      setReplyText(prev => ({ ...prev, [messageId]: '' }))
    } finally {
      setSending(null)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-error text-sm">{error}</p>
  if (messages.length === 0) {
    return <p className="text-text-muted text-sm">No messages.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`border rounded-theme p-4 bg-bg-secondary ${
            msg.resolved ? 'border-border opacity-60' : 'border-primary/40'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-sm font-semibold text-text-base">{msg.subject}</p>
              <p className="text-xs text-text-muted">
                From {msg.fromDisplayName} · {formatRelativeTime(msg.createdAt)}
              </p>
            </div>
            {msg.resolved && (
              <span className="text-xs text-success shrink-0 font-semibold">Resolved</span>
            )}
          </div>

          <p className="text-sm text-text-base mb-3">{msg.message}</p>

          {msg.moderatorReply ? (
            <div className="pl-3 border-l-2 border-primary">
              <p className="text-xs text-primary font-semibold">Your reply:</p>
              <p className="text-sm text-text-base mt-0.5">{msg.moderatorReply}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                value={replyText[msg.id] ?? ''}
                onChange={e => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                rows={2}
                placeholder="Write a reply..."
                className="w-full px-3 py-2 text-sm rounded-theme border border-border bg-bg text-text-base focus:outline-none focus:border-primary resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleReply(msg.id)}
                  disabled={sending === msg.id || !replyText[msg.id]?.trim()}
                  className="px-3 py-1.5 text-xs rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {sending === msg.id ? 'Sending...' : 'Send Reply'}
                </button>
                <button
                  type="button"
                  onClick={() => markResolved(msg.id)}
                  className="px-3 py-1.5 text-xs rounded-theme border border-border text-text-muted hover:text-text-base transition-colors"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
