import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'
import { migrateGuestProgress } from '../utils/migrateGuestProgress'

interface AuthContextValue {
  user: UserProfile | null
  session: Session | null
  loading: boolean
  isGuest: boolean
  continueAsGuest: () => void
  clearGuest: () => void
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signInWithGitHub: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState<boolean>(() => localStorage.getItem('guest_mode') === 'true')

  async function fetchProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) return null
    return data as UserProfile
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setUser(profile)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        // Clear guest mode whenever a real session is established (covers OAuth redirects)
        localStorage.removeItem('guest_mode')
        localStorage.removeItem('guest_progress')
        localStorage.removeItem('guest_xp')
        setIsGuest(false)
        const profile = await fetchProfile(session.user.id)
        setUser(profile)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const continueAsGuest = () => {
    localStorage.setItem('guest_mode', 'true')
    setIsGuest(true)
  }

  const clearGuest = () => {
    localStorage.removeItem('guest_mode')
    localStorage.removeItem('guest_progress')
    localStorage.removeItem('guest_xp')
    setIsGuest(false)
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.user) {
      await migrateGuestProgress(data.user.id)
      clearGuest()
    }
    return { error: error?.message ?? null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    return { error: error?.message ?? null }
  }

  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'github' })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    clearGuest()
    setUser(null)
    setSession(null)
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'Not authenticated' }
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
    if (!error) setUser({ ...user, ...updates })
    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, isGuest, continueAsGuest, clearGuest, signUp, signIn, signInWithGoogle, signInWithGitHub, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
