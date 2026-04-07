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
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [timeoutExpiry, setTimeoutExpiry] = useState<string | null>(null)

  // Check for active comment timeout on mount
  useEffect(() => {
    if (!user) return
    async function checkTimeout() {
      const { data } = await supabase
        .from('comment_timeouts')
        .select('expires_at')
        .eq('user_id', user!.id)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle()
      if (data) {
        setIsTimedOut(true)
        setTimeoutExpiry((data as { expires_at: string }).expires_at)
      }
    }
    checkTimeout()
  }, [user?.id])

  const loadComments = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('id, user_id, lesson_id, content, is_hidden, created_at, users!user_id(display_name, avatar_url)')
      .eq('lesson_id', lessonId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50)
    setComments((data ?? []) as unknown as Comment[])
    setLoading(false)
  }, [lessonId])

  const addComment = async (content: string): Promise<boolean> => {
    if (!user) return false
    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      lesson_id: lessonId,
      content,
    })
    if (!error) await loadComments()
    return !error
  }

  const deleteComment = async (commentId: string): Promise<void> => {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const reportComment = async (commentId: string, reason: string): Promise<boolean> => {
    if (!user) return false
    const { error } = await supabase.from('comment_reports').insert({
      comment_id: commentId,
      reported_by: user.id,
      reason,
    })
    return !error
  }

  return {
    comments,
    loading,
    loadComments,
    addComment,
    deleteComment,
    reportComment,
    isTimedOut,
    timeoutExpiry,
  }
}
