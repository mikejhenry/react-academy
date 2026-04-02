import { supabase } from '@/lib/supabase'
import { evaluateBadges, getLevel } from '@/data/achievements'
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

export function useXP(): { awardXP: (amount: number, reason: string) => Promise<void> } {
  const { user } = useAuth()

  async function awardXP(amount: number, _reason: string): Promise<void> {
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

      // Read existing earned badge ids from profiles
      const { data: profileRow, error: profileReadError } = await supabase
        .from('profiles')
        .select('earned_badge_ids')
        .eq('id', user.id)
        .maybeSingle()

      if (profileReadError) {
        console.error('useXP: failed to read profiles', profileReadError)
        return
      }

      const existingBadgeIds: string[] =
        Array.isArray(profileRow?.earned_badge_ids)
          ? (profileRow.earned_badge_ids as string[])
          : []

      // Build a minimal UserProgressState to evaluate badges
      const progressState: UserProgressState = {
        completedLessons: [],
        completedModules: [],
        xp: newXP,
        streak: newStreak,
        quizScores: {},
        lessonsToday: 0,
        projectsPassed: [],
      }

      const earnedBadges = evaluateBadges(progressState)
      const earnedBadgeIds = earnedBadges.map((b) => b.id)
      const newBadgeIds = earnedBadgeIds.filter((id) => !existingBadgeIds.includes(id))

      if (newBadgeIds.length > 0) {
        // Insert badge events for newly earned badges
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

        // Update profiles with merged badge ids
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
