import { supabase } from '@/lib/supabase'
import { evaluateBadges, getLevel } from '@/data/achievements'
import { MODULES } from '@/data/curriculum'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { UserProgressState } from '@/lib/types'

export function computeNewStreak(
  lastActivityDate: string | null,
  currentDate: string,
  currentStreak: number,
): number {
  if (lastActivityDate === null) return 1

  const last = new Date(lastActivityDate)
  const current = new Date(currentDate)

  // Diff in whole days (both are YYYY-MM-DD so no time component)
  const diffMs = current.getTime() - last.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return currentStreak + 1
  if (diffDays === 0) return currentStreak
  return 1
}

export function buildProgressState(
  progressRows: { lesson_id: string; completed_at: string }[],
  quizRows: { lesson_id: string; score: number }[],
  xp: number,
  streak: number,
  today: string,
): UserProgressState {
  const completedLessons = progressRows.map(r => r.lesson_id)

  // A module is complete when all its lessons appear in completedLessons
  const completedModules = MODULES
    .filter(m => m.lessons.every(l => completedLessons.includes(l.id)))
    .map(m => m.id)

  // Best score per lesson (for quiz badge conditions)
  const quizScores: Record<string, number> = {}
  for (const row of quizRows) {
    quizScores[row.lesson_id] = Math.max(quizScores[row.lesson_id] ?? 0, row.score)
  }

  // Count lessons completed on today's UTC date
  const lessonsToday = progressRows.filter(r => r.completed_at.slice(0, 10) === today).length

  return {
    completedLessons,
    completedModules,
    xp,
    streak,
    quizScores,
    lessonsToday,
    projectsPassed: [],
  }
}

export function useXP(): { awardXP: (amount: number, reason: string) => Promise<void> } {
  const { user, isGuest } = useAuth()

  async function awardXP(amount: number, _reason: string): Promise<void> {
    if (isGuest) {
      const raw = parseInt(localStorage.getItem('guest_xp') ?? '0', 10)
      const current = Number.isNaN(raw) ? 0 : raw
      localStorage.setItem('guest_xp', String(current + amount))
      return
    }

    if (!user) return

    try {
      // Read current leaderboard cache row
      const { data: cacheRow, error: cacheReadError } = await supabase
        .from('leaderboard_cache')
        .select('xp, streak, last_activity_date')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cacheReadError) {
        console.error('useXP: failed to read leaderboard_cache', cacheReadError)
        return
      }

      // TODO: remove casts once supabase types are generated (`supabase gen types typescript`)
      const currentXP: number = (cacheRow?.xp as number | null) ?? 0
      const currentStreak: number = (cacheRow?.streak as number | null) ?? 0
      const lastActivityDate: string | null = (cacheRow?.last_activity_date as string | null) ?? null

      const today = new Date().toISOString().slice(0, 10)
      const newXP = currentXP + amount
      const newStreak = computeNewStreak(lastActivityDate, today, currentStreak)
      const newLevel = getLevel(newXP)

      // Upsert leaderboard cache
      const { error: upsertError } = await supabase
        .from('leaderboard_cache')
        .upsert({
          user_id: user.id,
          xp: newXP,
          streak: newStreak,
          last_activity_date: today,
          level: newLevel,
        })

      if (upsertError) {
        console.error('useXP: failed to upsert leaderboard_cache', upsertError)
        return
      }

      // Fetch progress and quiz data in parallel for badge evaluation
      const [progressRes, quizRes, profileRes] = await Promise.all([
        supabase
          .from('progress')
          .select('lesson_id, completed_at')
          .eq('user_id', user.id),
        supabase
          .from('quiz_attempts')
          .select('lesson_id, score')
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('earned_badge_ids')
          .eq('id', user.id)
          .maybeSingle(),
      ])

      if (profileRes.error) {
        console.error('useXP: failed to read profiles', profileRes.error)
        return
      }

      // Log but continue with degraded data if progress/quiz fetches fail (XP is already awarded)
      if (progressRes.error) {
        console.error('useXP: failed to read progress, badge evaluation may be incomplete', progressRes.error)
      }
      if (quizRes.error) {
        console.error('useXP: failed to read quiz_attempts, badge evaluation may be incomplete', quizRes.error)
      }
      // TODO: remove casts once supabase types are generated (`supabase gen types typescript`)
      const progressRows = (progressRes.data ?? []) as { lesson_id: string; completed_at: string }[]
      const quizRows = (quizRes.data ?? []) as { lesson_id: string; score: number }[]

      const existingBadgeIds: string[] =
        Array.isArray(profileRes.data?.earned_badge_ids)
          ? (profileRes.data.earned_badge_ids as string[])
          : []

      const progressState = buildProgressState(progressRows, quizRows, newXP, newStreak, today)

      const earnedBadges = evaluateBadges(progressState)
      const earnedBadgeIds = earnedBadges.map((b) => b.id)
      const newBadgeIds = earnedBadgeIds.filter((id) => !existingBadgeIds.includes(id))

      if (newBadgeIds.length > 0) {
        const badgeEvents = newBadgeIds.map((badgeId) => ({
          user_id: user.id,
          badge_id: badgeId,
        }))

        const { error: badgeEventError } = await supabase
          .from('badge_events')
          .insert(badgeEvents)

        if (badgeEventError) {
          console.error('useXP: failed to insert badge_events', badgeEventError)
        }

        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ earned_badge_ids: [...existingBadgeIds, ...newBadgeIds] })
          .eq('id', user.id)

        if (profileUpdateError) {
          console.error('useXP: failed to update profiles earned_badge_ids', profileUpdateError)
        }
      }
    } catch (err) {
      console.error('useXP: unexpected error in awardXP', err)
    }
  }

  return { awardXP }
}
