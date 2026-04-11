import { supabase } from '@/lib/supabase'
import type { GuestProgress } from '@/lib/types'

export async function migrateGuestProgress(userId: string): Promise<void> {
  try {
    const rawProgress = localStorage.getItem('guest_progress')
    const rawXP = localStorage.getItem('guest_xp')

    if (!rawProgress && !rawXP) return

    if (rawProgress) {
      const { lessons } = JSON.parse(rawProgress) as GuestProgress
      if (lessons.length > 0) {
        await supabase.from('progress').upsert(
          lessons.map(l => ({
            user_id: userId,
            lesson_id: l.lesson_id,
            module_id: l.module_id,
            completed_at: l.completed_at,
            xp_earned: l.xp_earned,
          })),
          { onConflict: 'user_id,lesson_id', ignoreDuplicates: true }
        )
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
      await supabase.from('leaderboard_cache').upsert({ user_id: userId, xp: currentXP + guestXP })
    }
  } catch (err) {
    console.error('migrateGuestProgress: migration failed', err)
  } finally {
    localStorage.removeItem('guest_progress')
    localStorage.removeItem('guest_xp')
  }
}
