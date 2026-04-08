import { useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { useComments } from '../hooks/useComments'
import { CommentForm } from './CommentForm'
import { CommentItem } from './CommentItem'

interface CommentSectionProps {
  lessonId: string
}

export function CommentSection({ lessonId }: CommentSectionProps) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const {
    comments,
    loading,
    addComment,
    deleteComment,
    reportComment,
    isTimedOut,
    timeoutExpiry,
  } = useComments(lessonId)

  return (
    <div className="mt-12 border-t border-border pt-6">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm font-medium"
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>{expanded ? 'Hide Discussion' : 'Show Discussion'}</span>
      </button>

      {expanded && (
        <div className="mt-4 flex flex-col gap-4">
          {user && (
            <CommentForm
              onSubmit={addComment}
              isTimedOut={isTimedOut}
              timeoutExpiry={timeoutExpiry}
            />
          )}

          {loading ? (
            <LoadingSpinner />
          ) : comments.length === 0 ? (
            <p className="text-text-muted text-sm">No comments yet. Be the first!</p>
          ) : (
            <div>
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id ?? null}
                  onDelete={deleteComment}
                  onReport={reportComment}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
