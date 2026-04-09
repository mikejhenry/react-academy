// src/features/moderator/hooks/useRecentComments.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface RecentComment {
  id: string
  userId: string
  lessonId: string
  content: string
  authorName: string
  authorAvatar: string | null
  createdAt: string
}

interface RawComment {
  id: string
  user_id: string
  lesson_id: string
  content: string
  created_at: string
  author: { display_name: string; avatar_url: string | null } | null
}

export function useRecentComments(): {
  comments: RecentComment[]
  loading: boolean
  error: string | null
  deleteComment: (commentId: string) => Promise<void>
} {
  const [comments, setComments] = useState<RecentComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error: fetchError } = await supabase
          .from('comments')
          .select('id, user_id, lesson_id, content, created_at, author:users!user_id(display_name, avatar_url)')
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(50)

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        const rows = (data ?? []) as unknown as RawComment[]
        setComments(
          rows.map(r => ({
            id: r.id,
            userId: r.user_id,
            lessonId: r.lesson_id,
            content: r.content,
            authorName: r.author?.display_name ?? 'Unknown',
            authorAvatar: r.author?.avatar_url ?? null,
            createdAt: r.created_at,
          }))
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const deleteComment = useCallback(async (commentId: string) => {
    const { error: deleteError } = await supabase
      .from('comments')
      .update({ is_hidden: true })
      .eq('id', commentId)
    if (!deleteError) setComments(prev => prev.filter(c => c.id !== commentId))
  }, [])

  return { comments, loading, error, deleteComment }
}
