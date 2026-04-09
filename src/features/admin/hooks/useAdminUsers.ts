// src/features/admin/hooks/useAdminUsers.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getLevelTitle, getLevel } from '@/data/achievements'
import type { Role } from '@/lib/types'

export interface AdminUser {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  role: Role
  createdAt: string
}

export interface AdminUserDetail {
  xp: number
  streak: number
  level: number
  levelTitle: string
  badgeCount: number
  lessonCount: number
  loading: boolean
}

interface RawUser {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  role: string
  created_at: string
}

export function useAdminUsers(search: string): {
  users: AdminUser[]
  loading: boolean
  error: string | null
  changeRole: (userId: string, role: Role) => Promise<void>
  resetProgress: (userId: string) => Promise<void>
} {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('users')
          .select('id, email, display_name, avatar_url, role, created_at')
          .order('created_at', { ascending: false })
          .limit(100)

        if (search.trim()) {
          query = query.or(
            `display_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`
          )
        }

        const { data, error: fetchError } = await query
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
          return
        }
        setUsers(
          (data ?? []).map((r: RawUser) => ({
            id: r.id,
            email: r.email,
            displayName: r.display_name,
            avatarUrl: r.avatar_url,
            role: r.role as Role,
            createdAt: r.created_at,
          }))
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [search])

  const changeRole = useCallback(async (userId: string, role: Role) => {
    const { error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
    if (updateError) throw new Error(updateError.message)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
  }, [])

  const resetProgress = useCallback(async (userId: string) => {
    const results = await Promise.all([
      supabase.from('progress').delete().eq('user_id', userId),
      supabase.from('quiz_attempts').delete().eq('user_id', userId),
      supabase.from('project_submissions').delete().eq('user_id', userId),
      supabase.from('leaderboard_cache').delete().eq('user_id', userId),
      supabase.from('profiles').update({ earned_badge_ids: [] }).eq('id', userId),
      supabase.from('badge_events').delete().eq('user_id', userId),
    ])
    const failed = results.find(r => r.error)
    if (failed) throw new Error(failed.error!.message)
  }, [])

  return { users, loading, error, changeRole, resetProgress }
}

export function useAdminUserDetail(userId: string | null): AdminUserDetail {
  const [detail, setDetail] = useState<Omit<AdminUserDetail, 'loading'>>({
    xp: 0, streak: 0, level: 1, levelTitle: 'Apprentice', badgeCount: 0, lessonCount: 0,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    const uid = userId  // string, not string | null
    setLoading(true)

    async function load() {
      try {
        const [cacheRes, profileRes, progressRes] = await Promise.all([
          supabase
            .from('leaderboard_cache')
            .select('xp, streak')
            .eq('user_id', uid)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('earned_badge_ids')
            .eq('id', uid)
            .maybeSingle(),
          supabase
            .from('progress')
            .select('lesson_id', { count: 'exact', head: true })
            .eq('user_id', uid),
        ])
        const rawXP = (cacheRes.data?.xp as number | null) ?? 0
        const level = getLevel(rawXP)
        setDetail({
          xp: rawXP,
          streak: (cacheRes.data?.streak as number | null) ?? 0,
          level,
          levelTitle: getLevelTitle(level),
          badgeCount: Array.isArray(profileRes.data?.earned_badge_ids)
            ? (profileRes.data.earned_badge_ids as string[]).length
            : 0,
          lessonCount: progressRes.count ?? 0,
        })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userId])

  return { ...detail, loading }
}
