// src/features/moderator/components/RecentCommentsFeed.tsx
import { useRecentComments } from '../hooks/useRecentComments'
import { formatRelativeTime } from '@/features/comments/utils/formatRelativeTime'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

export function RecentCommentsFeed() {
  const { comments, loading, error, deleteComment } = useRecentComments()

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-error text-sm">{error}</p>
  if (comments.length === 0) {
    return <p className="text-text-muted text-sm">No recent comments.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {comments.map(comment => (
        <div
          key={comment.id}
          className="border border-border rounded-theme p-3 bg-bg-secondary flex gap-3 items-start"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-text-base">{comment.authorName}</span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">Lesson {comment.lessonId}</span>
              <span className="text-xs text-text-muted ml-auto shrink-0">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm text-text-base line-clamp-2">{comment.content}</p>
          </div>
          <button
            type="button"
            onClick={() => deleteComment(comment.id)}
            aria-label={`Delete comment by ${comment.authorName}`}
            className="text-xs text-error hover:underline shrink-0 mt-0.5"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
