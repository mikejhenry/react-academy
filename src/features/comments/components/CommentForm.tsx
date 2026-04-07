import { useState } from 'react'

interface CommentFormProps {
  onSubmit: (content: string) => Promise<boolean>
  isTimedOut: boolean
  timeoutExpiry: string | null
}

export function CommentForm({ onSubmit, isTimedOut, timeoutExpiry }: CommentFormProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isTimedOut) {
    return (
      <div className="p-3 rounded-theme bg-bg-secondary border border-error text-sm text-error">
        You are temporarily restricted from commenting
        {timeoutExpiry && ` until ${new Date(timeoutExpiry).toLocaleString()}`}.
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    const ok = await onSubmit(content.trim())
    if (ok) setContent('')
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Share your thoughts or ask a question..."
        rows={3}
        className="w-full px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary resize-y"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-4 py-2 rounded-theme bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
    </form>
  )
}
