// src/features/moderator/hooks/useModerationQueue.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface ModerationReport {
  id: string
  reason: 'spam' | 'inappropriate' | 'gives_away_answer' | 'other'
  createdAt: string
  comment: {
    id: string
    content: string
    lessonId: string
    userId: string
    authorName: string
    authorAvatar: string | null
    isHidden: boolean
  }
  reporterName: string
}

interface RawReport {
  id: string
  reason: string
  created_at: string
  comment: {
    id: string
    content: string
    lesson_id: string
    user_id: string
    is_hidden: boolean
    author: { display_name: string; avatar_url: string | null } | null
  } | null
  reporter: { display_name: string } | null
}

export function useModerationQueue(): {
  reports: ModerationReport[]
  loading: boolean
  error: string | null
  resolveReport: (reportId: string, commentId: string, deleteComment: boolean) => Promise<void>
} {
  const [reports, setReports] = useState<ModerationReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error: fetchError } = await supabase
          .from('comment_reports')
          .select(`
            id, reason, created_at,
            comment:comments!comment_id (
              id, content, lesson_id, user_id, is_hidden,
              author:users!user_id (display_name, avatar_url)
            ),
            reporter:users!reported_by (display_name)
          `)
          .eq('resolved', false)
          .order('created_at', { ascending: false })

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        const rows = (data ?? []) as unknown as RawReport[]
        setReports(
          rows
            .filter(r => r.comment !== null)
            .map(r => ({
              id: r.id,
              reason: r.reason as ModerationReport['reason'],
              createdAt: r.created_at,
              comment: {
                id: r.comment!.id,
                content: r.comment!.content,
                lessonId: r.comment!.lesson_id,
                userId: r.comment!.user_id,
                authorName: r.comment!.author?.display_name ?? 'Unknown',
                authorAvatar: r.comment!.author?.avatar_url ?? null,
                isHidden: r.comment!.is_hidden,
              },
              reporterName: r.reporter?.display_name ?? 'Unknown',
            }))
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const resolveReport = useCallback(
    async (reportId: string, commentId: string, deleteComment: boolean) => {
      const ops: [Promise<{ error: unknown }>, ...Promise<{ error: unknown }>[]] = [
        supabase.from('comment_reports').update({ resolved: true }).eq('id', reportId),
      ]
      if (deleteComment) {
        ops.push(supabase.from('comments').update({ is_hidden: true }).eq('id', commentId))
      }
      const results = await Promise.all(ops)
      const anyError = results.some(r => (r as { error: unknown }).error)
      if (!anyError) {
        setReports(prev => prev.filter(r => r.id !== reportId))
      }
    },
    []
  )

  return { reports, loading, error, resolveReport }
}
