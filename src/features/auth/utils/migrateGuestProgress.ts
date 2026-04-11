import { supabase } from '@/lib/supabase'
import type { GuestProgress } from '@/lib/types'

export async function migrateGuestProgress(userId: string): Promise<void> {
  try {
    const rawProgress = localStorage.getItem('guest_progress')
    const rawXP = localStorage.getItem('guest_xp')

    if (!rawProgress && !rawXP) return

    if (rawProgress) {
      const parsed = JSON.parse(rawProgress) as GuestProgress
      if (!Array.isArray(parsed?.lessons)) return
      const { lessons } = parsed
      if (lessons.length > 0) {
        const { error: progressError } = await supabase.from('progress').upsert(
          lessons.map(l => ({
            user_id: userId,
            lesson_id: l.lesson_id,
            module_id: l.module_id,
            completed_at: l.completed_at,
            xp_earned: l.xp_earned,
          })),
          { onConflict: 'user_id,lesson_id', ignoreDuplicates: true }
        )
        if (progressError) throw new Error(progressError.message)
      }
    }

    const guestXP = rawXP ? parseInt(rawXP, 10) : 0
    if (guestXP > 0) {
      const { data: existing } = await supabase
        .from('leaderboard_cache')
        .select('xp')
        .eq('user_id', userId)
        .maybeSingle()
      const currentXP = (existing?.xp as number | null) ?? 0
      const { error: cacheError } = await supabase.from('leaderboard_cache').upsert({ user_id: userId, xp: currentXP + guestXP })
      if (cacheError) throw new Error(cacheError.message)
    }
  } catch (err) {
    console.error('migrateGuestProgress: migration failed', err)
  } finally {
    localStorage.removeItem('guest_progress')
    localStorage.removeItem('guest_xp')
  }
}
