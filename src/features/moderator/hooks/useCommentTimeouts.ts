// src/features/moderator/hooks/useCommentTimeouts.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'

export interface ActiveTimeout {
  id: string
  userId: string
  displayName: string
  reason: string
  expiresAt: string
  issuedAt: string
}

interface RawTimeout {
  id: string
  user_id: string
  reason: string
  expires_at: string
  created_at: string
  target: { display_name: string } | null
}

export function useCommentTimeouts(): {
  timeouts: ActiveTimeout[]
  loading: boolean
  error: string | null
  issueTimeout: (userId: string, durationHours: number, reason: string) => Promise<void>
  revokeTimeout: (timeoutId: string) => Promise<void>
} {
  const { user } = useAuth()
  const [timeouts, setTimeouts] = useState<ActiveTimeout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error: fetchError } = await supabase
          .from('comment_timeouts')
          .select('id, user_id, reason, expires_at, created_at, target:users!user_id(display_name)')
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: true })

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        const rows = (data ?? []) as unknown as RawTimeout[]
        setTimeouts(
          rows.map(r => ({
            id: r.id,
            userId: r.user_id,
            displayName: r.target?.display_name ?? 'Unknown',
            reason: r.reason,
            expiresAt: r.expires_at,
            issuedAt: r.created_at,
          }))
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const issueTimeout = useCallback(
    async (userId: string, durationHours: number, reason: string) => {
      if (!user) return
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
      const { data, error: insertError } = await supabase
        .from('comment_timeouts')
        .insert({ user_id: userId, issued_by: user.id, expires_at: expiresAt, reason })
        .select('id, user_id, reason, expires_at, created_at, target:users!user_id(display_name)')
        .single()

      if (!insertError && data) {
        const raw = data as unknown as RawTimeout
        setTimeouts(prev => [
          ...prev,
          {
            id: raw.id,
            userId: raw.user_id,
            displayName: raw.target?.display_name ?? 'Unknown',
            reason: raw.reason,
            expiresAt: raw.expires_at,
            issuedAt: raw.created_at,
          },
        ])
      }
    },
    [user]
  )

  const revokeTimeout = useCallback(async (timeoutId: string) => {
    const { error: updateError } = await supabase
      .from('comment_timeouts')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', timeoutId)
    if (!updateError) setTimeouts(prev => prev.filter(t => t.id !== timeoutId))
  }, [])

  return { timeouts, loading, error, issueTimeout, revokeTimeout }
}
