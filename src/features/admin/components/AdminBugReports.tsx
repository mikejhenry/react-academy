import { useState } from 'react'
import { useAdminBugReports } from '../hooks/useAdminBugReports'
import type { BugStatus } from '../hooks/useAdminBugReports'
import { formatRelativeTime } from '@/features/comments/utils/formatRelativeTime'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

const STATUS_STYLES: Record<BugStatus, string> = {
  new: 'bg-bg border-primary/60 text-primary',
  in_progress: 'bg-bg border-warning text-warning',
  resolved: 'bg-bg border-success text-success',
}

const STATUS_LABELS: Record<BugStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

const ALL_STATUSES: (BugStatus | 'all')[] = ['all', 'new', 'in_progress', 'resolved']

export function AdminBugReports() {
  const { reports, loading, error, updateStatus } = useAdminBugReports()
  const [filter, setFilter] = useState<BugStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter)

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-error text-sm">{error}</p>

  return (
    <div className="flex flex-col gap-4">
      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {ALL_STATUSES.map(s => {
          const count = s === 'all' ? reports.length : reports.filter(r => r.status === s).length
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                filter === s ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-base'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-muted text-sm">No bug reports.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(report => (
            <div key={report.id} className="border border-border rounded-theme bg-bg-secondary overflow-hidden">
              {/* Header row */}
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-muted truncate">{report.pageUrl}</p>
                  <p className="text-sm text-text-base mt-0.5 line-clamp-2">{report.description}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {report.reporterName} · {formatRelativeTime(report.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-theme border font-semibold ${STATUS_STYLES[report.status]}`}>
                    {STATUS_LABELS[report.status]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                    className="text-xs text-text-muted hover:text-primary transition-colors"
                    aria-label={expandedId === report.id ? 'Collapse report details' : 'Expand report details'}
                  >
                    {expandedId === report.id ? 'Less ▲' : 'More ▼'}
                  </button>
                </div>
              </div>

              {/* Expanded: expected behavior + status change */}
              {expandedId === report.id && (
                <div className="px-4 pb-4 border-t border-border pt-3 flex flex-col gap-3">
                  {report.expectedBehavior && (
                    <div>
                      <p className="text-xs font-semibold text-text-muted mb-1">Expected behavior</p>
                      <p className="text-sm text-text-base">{report.expectedBehavior}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {(['new', 'in_progress', 'resolved'] as BugStatus[])
                      .filter(s => s !== report.status)
                      .map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={async () => {
                            try {
                              await updateStatus(report.id, s)
                            } catch (err) {
                              console.error('Failed to update status', err)
                            }
                          }}
                          className="px-3 py-1.5 text-xs rounded-theme border border-border text-text-muted hover:text-text-base transition-colors"
                        >
                          Mark {STATUS_LABELS[s]}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
