import { useState } from 'react'
import type { Comment } from '../hooks/useComments'
import { ReportModal } from './ReportModal'
import { formatRelativeTime } from '../utils/formatRelativeTime'

interface CommentItemProps {
  comment: Comment
  currentUserId: string | null
  onDelete: (id: string) => void
  onReport: (id: string, reason: string) => void
}

export function CommentItem({ comment, currentUserId, onDelete, onReport }: CommentItemProps) {
  const [showReportModal, setShowReportModal] = useState(false)
  const initial = comment.users.display_name.charAt(0).toUpperCase()

  return (
    <>
      <div className="flex gap-3 py-3 border-b border-border last:border-0">
        <div className="w-8 h-8 rounded-full bg-border overflow-hidden shrink-0">
          {comment.users.avatar_url ? (
            <img src={comment.users.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-text-muted">
              {initial}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-text-base text-sm font-medium">{comment.users.display_name}</span>
            <span className="text-text-muted text-xs">{formatRelativeTime(comment.created_at)}</span>
          </div>
          <p className="text-text-base text-sm mt-1 break-words">{comment.content}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {comment.user_id === currentUserId ? (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-text-muted hover:text-error text-xs px-1 transition-colors"
              aria-label="Delete comment"
            >
              ✕
            </button>
          ) : (
            <button
              onClick={() => setShowReportModal(true)}
              className="text-text-muted hover:text-warning text-xs px-1 transition-colors"
              aria-label="Report comment"
            >
              ⚑
            </button>
          )}
        </div>
      </div>
      {showReportModal && (
        <ReportModal
          onReport={reason => { onReport(comment.id, reason); setShowReportModal(false) }}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  )
}
