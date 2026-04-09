import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function ContactModeratorForm() {
  const { user } = useAuth()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const { error: insertError } = await supabase.from('moderator_messages').insert({
      from_user_id: user.id,
      subject,
      message,
    })
    if (insertError) {
      setError(insertError.message)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <p className="text-success text-sm">
        Message sent! A moderator will reply to your inbox.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        required
        placeholder="Subject"
        className="px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary"
      />
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        required
        rows={4}
        placeholder="Your message..."
        className="w-full px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary resize-y"
      />
      {error && <p className="text-error text-sm">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!subject.trim() || !message.trim()}
          className="px-4 py-2 rounded-theme bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          Send Message
        </button>
      </div>
    </form>
  )
}
