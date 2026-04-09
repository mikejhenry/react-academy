import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getLevelTitle } from '@/data/achievements'

export type BoardType = 'xp' | 'streak' | 'quiz' | 'active'
export type ActivePeriod = 'all' | 'week'

export interface LeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  levelTitle: string
  value: number
  rank: number
}

interface UseLeaderboardResult {
  entries: LeaderboardEntry[]
  currentUserRank: number | null
  loading: boolean
}

// Supabase join row shapes
interface CacheRow {
  user_id: string
  xp: number
  streak: number
  level: number
  users: { display_name: string; avatar_url: string | null }
}

interface QuizAttemptRow {
  user_id: string
  score: number
  users: { display_name: string; avatar_url: string | null }
}

interface ProgressRow {
  user_id: string
  lesson_id: string
  completed_at: string
  users: { display_name: string; avatar_url: string | null }
}

export function useLeaderboard(
  board: BoardType,
  activePeriod: ActivePeriod = 'all'
): UseLeaderboardResult {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      try {
      if (board === 'xp' || board === 'streak') {
        const sortField = board === 'xp' ? 'xp' : 'streak'
        const { data } = await supabase
          .from('leaderboard_cache')
          .select('user_id, xp, streak, level, users!user_id(display_name, avatar_url)')
          .order(sortField, { ascending: false })
          .limit(100)

        const rows = (data ?? []) as unknown as CacheRow[]
        setEntries(
          rows.map((row, i) => ({
            userId: row.user_id,
            displayName: row.users?.display_name ?? 'Unknown',
            avatarUrl: row.users?.avatar_url ?? null,
            levelTitle: getLevelTitle(row.level ?? 1),
            value: board === 'xp' ? (row.xp ?? 0) : (row.streak ?? 0),
            rank: i + 1,
          }))
        )
      }

      if (board === 'quiz') {
        const [{ data: quizData }, { data: cacheData }] = await Promise.all([
          supabase
            .from('quiz_attempts')
            .select('user_id, score, users!user_id(display_name, avatar_url)'),
          supabase
            .from('leaderboard_cache')
            .select('user_id, level'),
        ])

        const levelMap = new Map(
          (cacheData ?? []).map(r => [r.user_id as string, (r.level as number) ?? 1])
        )

        const byUser = new Map<string, { scores: number[]; displayName: string; avatarUrl: string | null }>()
        for (const row of (quizData ?? []) as unknown as QuizAttemptRow[]) {
          if (!byUser.has(row.user_id)) {
            byUser.set(row.user_id, {
              scores: [],
              displayName: row.users?.display_name ?? 'Unknown',
              avatarUrl: row.users?.avatar_url ?? null,
            })
          }
          byUser.get(row.user_id)!.scores.push(row.score)
        }

        const ranked = [...byUser.entries()]
          .filter(([, v]) => v.scores.length >= 10)
          .map(([userId, v]) => ({
            userId,
            displayName: v.displayName,
            avatarUrl: v.avatarUrl,
            levelTitle: getLevelTitle(levelMap.get(userId) ?? 1),
            value: Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length),
            rank: 0,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 100)
          .map((e, i) => ({ ...e, rank: i + 1 }))

        setEntries(ranked)
      }

      if (board === 'active') {
        let query = supabase
          .from('progress')
          .select('user_id, lesson_id, completed_at, users!user_id(display_name, avatar_url)')

        if (activePeriod === 'week') {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          query = query.gte('completed_at', weekAgo)
        }

        const [{ data: progressData }, { data: cacheData }] = await Promise.all([
          query,
          supabase.from('leaderboard_cache').select('user_id, level'),
        ])

        const levelMap = new Map(
          (cacheData ?? []).map(r => [r.user_id as string, (r.level as number) ?? 1])
        )

        const byUser = new Map<string, { count: number; displayName: string; avatarUrl: string | null }>()
        for (const row of (progressData ?? []) as unknown as ProgressRow[]) {
          if (!byUser.has(row.user_id)) {
            byUser.set(row.user_id, {
              count: 0,
              displayName: row.users?.display_name ?? 'Unknown',
              avatarUrl: row.users?.avatar_url ?? null,
            })
          }
          byUser.get(row.user_id)!.count++
        }

        const ranked = [...byUser.entries()]
          .map(([userId, v]) => ({
            userId,
            displayName: v.displayName,
            avatarUrl: v.avatarUrl,
            levelTitle: getLevelTitle(levelMap.get(userId) ?? 1),
            value: v.count,
            rank: 0,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 100)
          .map((e, i) => ({ ...e, rank: i + 1 }))

        setEntries(ranked)
      }
      } catch (err) {
        console.error('useLeaderboard: unexpected error', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [board, activePeriod])

  const currentUserRank = user
    ? (entries.find(e => e.userId === user.id)?.rank ?? null)
    : null

  return { entries, currentUserRank, loading }
}
