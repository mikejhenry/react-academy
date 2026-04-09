import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function BugReportPage() {
  const { user } = useAuth()
  const location = useLocation()
  const pageUrl = (location.state as { from?: string } | null)?.from ?? window.location.href

  const [description, setDescription] = useState('')
  const [expected, setExpected] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError(null)
    try {
      const { error: insertError } = await supabase.from('bug_reports').insert({
        reported_by: user.id,
        page_url: pageUrl,
        description,
        expected_behavior: expected,
      })
      if (insertError) {
        setError(insertError.message)
      } else {
        setSubmitted(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-5xl">✅</p>
        <h2 className="text-xl font-semibold text-text-base">Bug report submitted</h2>
        <p className="text-text-muted text-sm text-center">
          Thank you! Our team will investigate and update the status.
        </p>
        <Link to="/" className="mt-2 text-primary hover:underline text-sm">
          ← Back to modules
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3 text-sm">
          <Link to="/" className="text-text-muted hover:text-primary transition-colors">← Back</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text-base mb-1">Report a Bug</h1>
        <p className="text-text-muted text-sm mb-6">Found something broken? Let us know.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="bug-url" className="block text-sm font-semibold text-text-base mb-1">Page URL</label>
            <input
              id="bug-url"
              type="text"
              readOnly
              value={pageUrl}
              className="w-full px-3 py-2 rounded-theme border border-border bg-bg-secondary text-text-muted text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-base mb-1" htmlFor="bug-description">
              What went wrong?
            </label>
            <textarea
              id="bug-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Describe what happened..."
              className="w-full px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary resize-y"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-base mb-1" htmlFor="bug-expected">
              What did you expect to happen?
            </label>
            <textarea
              id="bug-expected"
              value={expected}
              onChange={e => setExpected(e.target.value)}
              rows={3}
              placeholder="Describe the expected behavior..."
              className="w-full px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary resize-y"
            />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!description.trim() || submitting}
            className="px-6 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Bug Report'}
          </button>
        </form>
      </main>
    </div>
  )
}
