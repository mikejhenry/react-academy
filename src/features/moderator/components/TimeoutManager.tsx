// src/features/moderator/components/TimeoutManager.tsx
import { useState } from 'react'
import { useCommentTimeouts } from '../hooks/useCommentTimeouts'
import { formatTimeoutExpiry } from '../utils/formatTimeoutExpiry'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

const DURATION_OPTIONS = [
  { label: '1 hour', hours: 1 },
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
  { label: '7 days', hours: 168 },
]

export function TimeoutManager() {
  const { timeouts, loading, error, issueTimeout, revokeTimeout } = useCommentTimeouts()
  const [userId, setUserId] = useState('')
  const [duration, setDuration] = useState(24)
  const [reason, setReason] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [issueError, setIssueError] = useState<string | null>(null)

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId.trim() || !reason.trim()) return
    setIssuing(true)
    setIssueError(null)
    try {
      await issueTimeout(userId.trim(), duration, reason.trim())
      setUserId('')
      setReason('')
    } catch {
      setIssueError('Failed to issue timeout. Check that the user ID is valid.')
    } finally {
      setIssuing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Issue new timeout form */}
      <div className="border border-border rounded-theme p-4 bg-bg-secondary">
        <h3 className="text-sm font-semibold text-text-base mb-3">Issue New Timeout</h3>
        <form onSubmit={handleIssue} className="flex flex-col gap-3">
          <div>
            <label htmlFor="timeout-user-id" className="block text-xs text-text-muted mb-1">
              User ID
            </label>
            <input
              id="timeout-user-id"
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="Paste user UUID (visible in comment feeds above)"
              className="w-full px-3 py-2 text-sm rounded-theme border border-border bg-bg text-text-base focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="timeout-duration" className="block text-xs text-text-muted mb-1">
              Duration
            </label>
            <select
              id="timeout-duration"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-theme border border-border bg-bg text-text-base focus:outline-none focus:border-primary"
            >
              {DURATION_OPTIONS.map(opt => (
                <option key={opt.hours} value={opt.hours}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="timeout-reason" className="block text-xs text-text-muted mb-1">
              Reason
            </label>
            <input
              id="timeout-reason"
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Repeated spam"
              className="w-full px-3 py-2 text-sm rounded-theme border border-border bg-bg text-text-base focus:outline-none focus:border-primary"
            />
          </div>
          {issueError && <p className="text-error text-xs">{issueError}</p>}
          <button
            type="submit"
            disabled={issuing || !userId.trim() || !reason.trim()}
            className="px-4 py-2 text-sm rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
          >
            {issuing ? 'Issuing...' : 'Issue Timeout'}
          </button>
        </form>
      </div>

      {/* Active timeouts list */}
      <div>
        <h3 className="text-sm font-semibold text-text-base mb-3">
          Active Timeouts
        </h3>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-error text-sm">{error}</p>
        ) : timeouts.length === 0 ? (
          <p className="text-text-muted text-sm">No active timeouts.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {timeouts.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 border border-border rounded-theme px-3 py-2.5 bg-bg-secondary"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-base">{t.displayName}</p>
                  <p className="text-xs text-text-muted truncate">{t.reason}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-text-muted">{formatTimeoutExpiry(t.expiresAt)}</p>
                  <button
                    type="button"
                    onClick={() => revokeTimeout(t.id)}
                    className="text-xs text-error hover:underline mt-0.5"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
