// src/features/moderator/components/ModerationQueueItem.tsx
import { useState } from 'react'
import type { ModerationReport } from '../hooks/useModerationQueue'
import { formatRelativeTime } from '@/features/comments/utils/formatRelativeTime'

const REASON_LABELS: Record<ModerationReport['reason'], string> = {
  spam: 'Spam',
  inappropriate: 'Inappropriate',
  gives_away_answer: 'Gives away answer',
  other: 'Other',
}

interface ModerationQueueItemProps {
  report: ModerationReport
  onResolve: (reportId: string, commentId: string, deleteComment: boolean) => Promise<void>
}

export function ModerationQueueItem({ report, onResolve }: ModerationQueueItemProps) {
  const [resolving, setResolving] = useState(false)

  const handleAction = async (deleteComment: boolean) => {
    setResolving(true)
    await onResolve(report.id, report.comment.id, deleteComment)
    setResolving(false)
  }

  return (
    <div className="border border-border rounded-theme p-4 bg-bg-secondary flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
            {REASON_LABELS[report.reason]}
          </span>
          <p className="text-xs text-text-muted mt-0.5">
            Reported by {report.reporterName} · {formatRelativeTime(report.createdAt)}
          </p>
        </div>
        <span className="text-xs text-text-muted shrink-0">Lesson: {report.comment.lessonId}</span>
      </div>

      <div className="bg-bg border border-border rounded-theme px-3 py-2">
        <p className="text-xs text-text-muted mb-1">{report.comment.authorName}</p>
        <p className="text-sm text-text-base">{report.comment.content}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleAction(false)}
          disabled={resolving}
          className="px-3 py-1.5 text-xs rounded-theme border border-border text-text-muted hover:text-text-base transition-colors disabled:opacity-50"
        >
          Keep Comment
        </button>
        <button
          type="button"
          onClick={() => handleAction(true)}
          disabled={resolving}
          className="px-3 py-1.5 text-xs rounded-theme border border-error text-error hover:bg-bg transition-colors disabled:opacity-50"
        >
          Remove Comment
        </button>
      </div>
    </div>
  )
}
