import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getLevelTitle, getLevel, getXPForNextLevel } from '@/data/achievements'

export interface ProfileStats {
  xp: number
  streak: number
  level: number
  levelTitle: string
  xpForNextLevel: number
  earnedBadgeIds: string[]
  loading: boolean
}

export function useProfileStats(): ProfileStats {
  const { user } = useAuth()
  const userId = user?.id
  const [xp, setXP] = useState(0)
  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)

      try {
      const [cacheRes, profileRes] = await Promise.all([
        supabase
          .from('leaderboard_cache')
          .select('xp, streak')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('earned_badge_ids')
          .eq('id', userId)
          .maybeSingle(),
      ])

      const rawXP = (cacheRes.data?.xp as number | null) ?? 0
      setXP(rawXP)
      setStreak((cacheRes.data?.streak as number | null) ?? 0)
      setLevel(getLevel(rawXP))
      setEarnedBadgeIds(
        Array.isArray(profileRes.data?.earned_badge_ids)
          ? (profileRes.data.earned_badge_ids as string[])
          : []
      )

      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userId])

  return {
    xp,
    streak,
    level,
    levelTitle: getLevelTitle(level),
    xpForNextLevel: getXPForNextLevel(xp),
    earnedBadgeIds,
    loading,
  }
}
