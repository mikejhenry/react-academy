// src/features/admin/hooks/useAdminAnalytics.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MODULES } from '@/data/curriculum'
import { bucketXP, groupByLesson, groupByStatus } from '../utils/adminAnalytics'

export interface AdminAnalyticsData {
  userCount: number
  lessonCompletions: number
  quizAttempts: number
  projectsPassed: number
  xpBuckets: { label: string; count: number }[]
  topLessons: { lessonId: string; lessonTitle: string; count: number }[]
  bugStatusCounts: { status: string; count: number }[]
  loading: boolean
  error: string | null
}

// Build a lookup map from lessonId -> lesson title from static MODULES data
const LESSON_TITLE_MAP: Record<string, string> = {}
for (const mod of MODULES) {
  for (const lesson of mod.lessons) {
    LESSON_TITLE_MAP[lesson.id] = lesson.title
  }
}

export function useAdminAnalytics(): AdminAnalyticsData {
  const [data, setData] = useState<Omit<AdminAnalyticsData, 'loading' | 'error'>>({
    userCount: 0,
    lessonCompletions: 0,
    quizAttempts: 0,
    projectsPassed: 0,
    xpBuckets: [],
    topLessons: [],
    bugStatusCounts: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      try {
        const [
          userCountRes,
          lessonCountRes,
          quizCountRes,
          projectCountRes,
          xpRes,
          progressLessonsRes,
          bugStatusRes,
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('progress').select('*', { count: 'exact', head: true }),
          supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }),
          supabase.from('project_submissions').select('*', { count: 'exact', head: true }).eq('passed', true),
          supabase.from('leaderboard_cache').select('xp'),
          supabase.from('progress').select('lesson_id'),
          supabase.from('bug_reports').select('status'),
        ])

        const fetchError =
          userCountRes.error ?? lessonCountRes.error ?? quizCountRes.error ??
          projectCountRes.error ?? xpRes.error ?? progressLessonsRes.error ?? bugStatusRes.error

        if (cancelled) return

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        const xpValues = (xpRes.data ?? []).map((r: { xp: number }) => r.xp ?? 0)
        const lessonRows = (progressLessonsRes.data ?? []) as { lesson_id: string }[]
        const bugRows = (bugStatusRes.data ?? []) as { status: string }[]

        const rawTopLessons = groupByLesson(lessonRows, 10)

        setData({
          userCount: userCountRes.count ?? 0,
          lessonCompletions: lessonCountRes.count ?? 0,
          quizAttempts: quizCountRes.count ?? 0,
          projectsPassed: projectCountRes.count ?? 0,
          xpBuckets: bucketXP(xpValues),
          topLessons: rawTopLessons.map(l => ({
            lessonId: l.lessonId,
            lessonTitle: LESSON_TITLE_MAP[l.lessonId] ?? l.lessonId,
            count: l.count,
          })),
          bugStatusCounts: groupByStatus(bugRows),
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { ...data, loading, error }
}
