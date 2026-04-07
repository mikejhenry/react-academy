import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'

export interface CommentUser {
  display_name: string
  avatar_url: string | null
}

export interface Comment {
  id: string
  user_id: string
  lesson_id: string
  content: string
  is_hidden: boolean
  created_at: string
  users: CommentUser
}

export function useComments(lessonId: string) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [timeoutExpiry, setTimeoutExpiry] = useState<string | null>(null)

  // Check for active comment timeout on mount
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    async function checkTimeout() {
      const { data } = await supabase
        .from('comment_timeouts')
        .select('expires_at')
        .eq('user_id', userId!)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle()
      if (data) {
        setIsTimedOut(true)
        setTimeoutExpiry((data as { expires_at: string }).expires_at)
      }
    }
    checkTimeout()
  }, [userId])

  const loadComments = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('comments')
      .select('id, user_id, lesson_id, content, is_hidden, created_at, users!user_id(display_name, avatar_url)')
      .eq('lesson_id', lessonId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50)
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setError(null)
      setComments((data ?? []) as unknown as Comment[])
    }
    setLoading(false)
  }, [lessonId])

  // Auto-load comments on mount (and when lessonId changes)
  useEffect(() => {
    loadComments()
  }, [loadComments])

  const addComment = async (content: string): Promise<boolean> => {
    if (!user) return false
    if (isTimedOut) return false
    const { error: insertError } = await supabase.from('comments').insert({
      user_id: user.id,
      lesson_id: lessonId,
      content,
    })
    if (!insertError) await loadComments()
    return !insertError
  }

  const deleteComment = async (commentId: string): Promise<void> => {
    const { error: deleteError } = await supabase.from('comments').delete().eq('id', commentId)
    if (!deleteError) {
      setComments(prev => prev.filter(c => c.id !== commentId))
    }
  }

  const reportComment = async (commentId: string, reason: string): Promise<boolean> => {
    if (!user) return false
    const { error: reportError } = await supabase.from('comment_reports').insert({
      comment_id: commentId,
      reported_by: user.id,
      reason,
    })
    return !reportError
  }

  return {
    comments,
    loading,
    error,
    loadComments,
    addComment,
    deleteComment,
    reportComment,
    isTimedOut,
    timeoutExpiry,
  }
}
