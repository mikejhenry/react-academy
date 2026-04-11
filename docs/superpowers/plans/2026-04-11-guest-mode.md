# Guest Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow unauthenticated users to browse and complete all learning content as a guest, with localStorage persistence and progress migration on sign-up.

**Architecture:** Extend `AuthContext` with an `isGuest` boolean backed by `localStorage`. `ProtectedRoute` passes guests through for content routes. `useProgress` and `useXP` read/write `localStorage` when `isGuest` is true instead of calling Supabase. On sign-up, a `migrateGuestProgress` utility upserts the guest's data into Supabase before clearing the guest session.

**Tech Stack:** React 18, TypeScript strict, Vite 5, Supabase JS v2, Tailwind CSS v3, Vitest (happy-dom environment)

**Spec:** `docs/superpowers/specs/2026-04-11-guest-mode-design.md`

---

### Task 1: GuestProgress type + migrateGuestProgress utility

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/features/auth/utils/migrateGuestProgress.ts`
- Create: `src/features/auth/utils/migrateGuestProgress.test.ts`

- [ ] **Step 1: Add GuestProgress type to src/lib/types.ts**

Append to the end of `src/lib/types.ts`:

```typescript
export interface GuestProgress {
  lessons: { lesson_id: string; module_id: string; completed_at: string; xp_earned: number }[]
  quizScores: Record<string, number>
  projectsPassed: string[]
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/features/auth/utils/migrateGuestProgress.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { migrateGuestProgress } from './migrateGuestProgress'

const { mockProgressUpsert, mockCacheMaybySingle, mockCacheUpsert } = vi.hoisted(() => ({
  mockProgressUpsert: vi.fn(),
  mockCacheMaybySingle: vi.fn(),
  mockCacheUpsert: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'progress') return { upsert: mockProgressUpsert }
      return {
        select: () => ({ eq: () => ({ maybeSingle: mockCacheMaybySingle }) }),
        upsert: mockCacheUpsert,
      }
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockProgressUpsert.mockResolvedValue({ error: null })
  mockCacheMaybySingle.mockResolvedValue({ data: null, error: null })
  mockCacheUpsert.mockResolvedValue({ error: null })
})

describe('migrateGuestProgress', () => {
  it('returns early without calling supabase when no guest data exists', async () => {
    await migrateGuestProgress('user-123')
    expect(mockProgressUpsert).not.toHaveBeenCalled()
    expect(mockCacheUpsert).not.toHaveBeenCalled()
  })

  it('upserts progress rows with correct shape and conflict config', async () => {
    localStorage.setItem('guest_progress', JSON.stringify({
      lessons: [
        { lesson_id: '1.1', module_id: '1', completed_at: '2024-03-15T10:00:00Z', xp_earned: 100 },
      ],
      quizScores: {},
      projectsPassed: [],
    }))

    await migrateGuestProgress('user-123')

    expect(mockProgressUpsert).toHaveBeenCalledWith(
      [{ user_id: 'user-123', lesson_id: '1.1', module_id: '1', completed_at: '2024-03-15T10:00:00Z', xp_earned: 100 }],
      { onConflict: 'user_id,lesson_id', ignoreDuplicates: true }
    )
  })

  it('adds guest_xp on top of existing leaderboard_cache xp', async () => {
    localStorage.setItem('guest_xp', '200')
    mockCacheMaybySingle.mockResolvedValue({ data: { xp: 100 }, error: null })

    await migrateGuestProgress('user-123')

    expect(mockCacheUpsert).toHaveBeenCalledWith({ user_id: 'user-123', xp: 300 })
  })

  it('uses 0 as base xp when no existing leaderboard_cache row', async () => {
    localStorage.setItem('guest_xp', '150')
    mockCacheMaybySingle.mockResolvedValue({ data: null, error: null })

    await migrateGuestProgress('user-123')

    expect(mockCacheUpsert).toHaveBeenCalledWith({ user_id: 'user-123', xp: 150 })
  })

  it('skips xp upsert when guest_xp is 0', async () => {
    localStorage.setItem('guest_xp', '0')

    await migrateGuestProgress('user-123')

    expect(mockCacheUpsert).not.toHaveBeenCalled()
  })

  it('clears guest_progress and guest_xp from localStorage after success', async () => {
    localStorage.setItem('guest_progress', JSON.stringify({ lessons: [], quizScores: {}, projectsPassed: [] }))
    localStorage.setItem('guest_xp', '100')

    await migrateGuestProgress('user-123')

    expect(localStorage.getItem('guest_progress')).toBeNull()
    expect(localStorage.getItem('guest_xp')).toBeNull()
  })

  it('clears localStorage even when supabase throws', async () => {
    mockProgressUpsert.mockRejectedValueOnce(new Error('network error'))
    localStorage.setItem('guest_progress', JSON.stringify({
      lessons: [{ lesson_id: '1.1', module_id: '1', completed_at: '2024-03-15T10:00:00Z', xp_earned: 100 }],
      quizScores: {},
      projectsPassed: [],
    }))

    await migrateGuestProgress('user-123')

    expect(localStorage.getItem('guest_progress')).toBeNull()
  })

  it('skips progress upsert when lessons array is empty', async () => {
    localStorage.setItem('guest_progress', JSON.stringify({ lessons: [], quizScores: {}, projectsPassed: [] }))

    await migrateGuestProgress('user-123')

    expect(mockProgressUpsert).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run src/features/auth/utils/migrateGuestProgress.test.ts
```

Expected: FAIL — `Cannot find module './migrateGuestProgress'`

- [ ] **Step 4: Create src/features/auth/utils/migrateGuestProgress.ts**

```typescript
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
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run src/features/auth/utils/migrateGuestProgress.test.ts
```

Expected: PASS — 7 tests passing

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/features/auth/utils/migrateGuestProgress.ts src/features/auth/utils/migrateGuestProgress.test.ts
git commit -m "feat: add GuestProgress type and migrateGuestProgress utility"
```

---

### Task 2: Extend useAuth with guest support

**Files:**
- Modify: `src/features/auth/hooks/useAuth.tsx`

- [ ] **Step 1: Replace src/features/auth/hooks/useAuth.tsx with the following**

```typescript
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
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

```bash
npx vitest run
```

Expected: all existing tests pass

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/hooks/useAuth.tsx
git commit -m "feat: add isGuest, continueAsGuest, clearGuest to useAuth"
```

---

### Task 3: Update ProtectedRoute to allow guests through content routes

**Files:**
- Modify: `src/shared/components/ProtectedRoute.tsx`

- [ ] **Step 1: Replace src/shared/components/ProtectedRoute.tsx with the following**

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LoadingSpinner } from './LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'student' | 'moderator' | 'admin'
  redirectTo?: string
}

export function ProtectedRoute({ children, requiredRole, redirectTo = '/auth' }: ProtectedRouteProps) {
  const { user, loading, isGuest } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user && !isGuest) return <Navigate to={redirectTo} replace />
  if (isGuest && requiredRole) return <Navigate to={redirectTo} replace />

  if (requiredRole && user) {
    const roleHierarchy: Record<string, number> = { student: 0, moderator: 1, admin: 2 }
    const userLevel = roleHierarchy[user.role] ?? -1
    const requiredLevel = roleHierarchy[requiredRole] ?? 0
    if (userLevel < requiredLevel) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/components/ProtectedRoute.tsx
git commit -m "feat: allow guest sessions through ProtectedRoute content routes"
```

---

### Task 4: Add "Continue as Guest" to AuthPage

**Files:**
- Modify: `src/features/auth/pages/AuthPage.tsx`

- [ ] **Step 1: Replace src/features/auth/pages/AuthPage.tsx with the following**

```typescript
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { SignUpForm } from '../components/SignUpForm'
import { LoginForm } from '../components/LoginForm'
import { OAuthButtons } from '../components/OAuthButtons'

type AuthMode = 'signup' | 'login'

export function AuthPage() {
  const { user, loading, isGuest, continueAsGuest } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signup')

  if (loading) return null
  if (user) {
    return <Navigate to={user.onboarding_completed ? '/' : '/onboarding'} replace />
  }
  if (isGuest) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-theme p-8 flex flex-col gap-6 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-base">React Academy</h1>
          <p className="text-text-muted mt-1 text-sm">
            {mode === 'signup' ? 'Create your free account' : 'Welcome back'}
          </p>
        </div>

        <OAuthButtons />

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-muted text-xs uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {mode === 'signup'
          ? <SignUpForm onSuccess={() => {}} onSwitchToLogin={() => setMode('login')} />
          : <LoginForm onSuccess={() => {}} onSwitchToSignUp={() => setMode('signup')} />
        }

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-muted text-xs uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={continueAsGuest}
            className="w-full px-4 py-2 rounded-theme border border-border text-text-muted hover:border-primary hover:text-primary transition-colors text-sm font-medium"
          >
            Continue as Guest
          </button>
          <p className="text-xs text-text-muted text-center">
            Your progress will be saved in this browser. Sign up any time to keep it permanently.
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/auth/pages/AuthPage.tsx
git commit -m "feat: add Continue as Guest button to AuthPage"
```

---

### Task 5: Update useProgress with guest localStorage path

**Files:**
- Modify: `src/features/curriculum/hooks/useProgress.tsx`

- [ ] **Step 1: Replace src/features/curriculum/hooks/useProgress.tsx with the following**

```typescript
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { MODULES } from '@/data/curriculum'
import type { GuestProgress } from '@/lib/types'

// ── Pure utility (exported for tests) ────────────────────────────────────────

export function isModuleUnlocked(moduleId: string, completedLessons: string[]): boolean {
  if (moduleId === '1') return true
  const idx = MODULES.findIndex(m => m.id === moduleId)
  if (idx <= 0) return false
  const prev = MODULES[idx - 1]
  return prev.lessons.every(l => completedLessons.includes(l.id))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readGuestProgress(): GuestProgress {
  try {
    const raw = localStorage.getItem('guest_progress')
    if (raw) return JSON.parse(raw) as GuestProgress
  } catch {
    // malformed — start fresh
  }
  return { lessons: [], quizScores: {}, projectsPassed: [] }
}

function writeGuestProgress(data: GuestProgress): void {
  localStorage.setItem('guest_progress', JSON.stringify(data))
}

// ── Context types ─────────────────────────────────────────────────────────────

interface ProgressContextValue {
  completedLessons: string[]
  completedModules: string[]
  quizScores: Record<string, number>
  projectsPassed: string[]
  loading: boolean
  completeLesson: (lessonId: string, moduleId: string, xpEarned: number) => Promise<{ wasNew: boolean }>
  saveQuizAttempt: (lessonId: string, score: number, answers: string[]) => Promise<void>
  completeProject: (projectId: string) => Promise<{ wasNew: boolean }>
  isModuleUnlockedForUser: (moduleId: string) => boolean
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, isGuest } = useAuth()
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [quizScores, setQuizScores] = useState<Record<string, number>>({})
  const [projectsPassed, setProjectsPassed] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      if (isGuest) {
        const { lessons, quizScores: scores, projectsPassed: projects } = readGuestProgress()
        setCompletedLessons(lessons.map(l => l.lesson_id))
        setQuizScores(scores)
        setProjectsPassed(projects)
      } else {
        setCompletedLessons([])
        setQuizScores({})
        setProjectsPassed([])
      }
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)

      const [progressRes, quizRes, projectRes] = await Promise.all([
        supabase
          .from('progress')
          .select('lesson_id')
          .eq('user_id', user!.id),
        supabase
          .from('quiz_attempts')
          .select('lesson_id, score')
          .eq('user_id', user!.id)
          .order('score', { ascending: false }),
        supabase
          .from('project_submissions')
          .select('project_id')
          .eq('user_id', user!.id)
          .eq('passed', true),
      ])

      const lessons = (progressRes.data ?? []).map((r: { lesson_id: string }) => r.lesson_id)
      setCompletedLessons(lessons)

      const scores: Record<string, number> = {}
      for (const row of (quizRes.data ?? []) as { lesson_id: string; score: number }[]) {
        if (scores[row.lesson_id] === undefined || row.score > scores[row.lesson_id]) {
          scores[row.lesson_id] = row.score
        }
      }
      setQuizScores(scores)

      setProjectsPassed(
        (projectRes.data ?? []).map((r: { project_id: string }) => r.project_id)
      )
      setLoading(false)
    }

    load()
  }, [user?.id, isGuest])

  const completedModules = MODULES
    .filter(m => m.lessons.every(l => completedLessons.includes(l.id)))
    .map(m => m.id)

  const completeLesson = useCallback(
    async (lessonId: string, moduleId: string, xpEarned: number): Promise<{ wasNew: boolean }> => {
      if (isGuest) {
        if (completedLessons.includes(lessonId)) return { wasNew: false }
        const data = readGuestProgress()
        data.lessons.push({ lesson_id: lessonId, module_id: moduleId, completed_at: new Date().toISOString(), xp_earned: xpEarned })
        writeGuestProgress(data)
        setCompletedLessons(prev => [...prev, lessonId])
        return { wasNew: true }
      }
      if (!user || completedLessons.includes(lessonId)) return { wasNew: false }
      const { error } = await supabase.from('progress').insert({
        user_id: user.id,
        module_id: moduleId,
        lesson_id: lessonId,
        xp_earned: xpEarned,
      })
      if (!error) setCompletedLessons(prev => [...prev, lessonId])
      return { wasNew: !error }
    },
    [user, isGuest, completedLessons]
  )

  const saveQuizAttempt = useCallback(
    async (lessonId: string, score: number, answers: string[]): Promise<void> => {
      if (isGuest) {
        const data = readGuestProgress()
        data.quizScores[lessonId] = Math.max(data.quizScores[lessonId] ?? 0, score)
        writeGuestProgress(data)
        setQuizScores(prev => ({ ...prev, [lessonId]: Math.max(prev[lessonId] ?? 0, score) }))
        return
      }
      if (!user) return
      await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        lesson_id: lessonId,
        score,
        max_score: 100,
        answers,
      })
      setQuizScores(prev => ({
        ...prev,
        [lessonId]: Math.max(prev[lessonId] ?? 0, score),
      }))
    },
    [user, isGuest]
  )

  const completeProject = useCallback(
    async (projectId: string): Promise<{ wasNew: boolean }> => {
      if (isGuest) {
        if (projectsPassed.includes(projectId)) return { wasNew: false }
        const data = readGuestProgress()
        data.projectsPassed.push(projectId)
        writeGuestProgress(data)
        setProjectsPassed(prev => [...prev, projectId])
        return { wasNew: true }
      }
      if (!user || projectsPassed.includes(projectId)) return { wasNew: false }
      const { error } = await supabase.from('project_submissions').insert({
        user_id: user.id,
        project_id: projectId,
        passed: true,
        validator_results: {},
      })
      if (!error) setProjectsPassed(prev => [...prev, projectId])
      return { wasNew: !error }
    },
    [user, isGuest, projectsPassed]
  )

  const isModuleUnlockedForUser = useCallback(
    (moduleId: string) => isModuleUnlocked(moduleId, completedLessons),
    [completedLessons]
  )

  return (
    <ProgressContext.Provider
      value={{
        completedLessons,
        completedModules,
        quizScores,
        projectsPassed,
        loading,
        completeLesson,
        saveQuizAttempt,
        completeProject,
        isModuleUnlockedForUser,
      }}
    >
      {children}
    </ProgressContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider')
  return ctx
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/features/curriculum/hooks/useProgress.tsx
git commit -m "feat: add guest localStorage path to useProgress"
```

---

### Task 6: Update useXP with guest localStorage path

**Files:**
- Modify: `src/features/gamification/hooks/useXP.ts`

- [ ] **Step 1: Update the awardXP function in src/features/gamification/hooks/useXP.ts**

Replace the `useXP` function (lines 60–180):

```typescript
export function useXP(): { awardXP: (amount: number, reason: string) => Promise<void> } {
  const { user, isGuest } = useAuth()

  async function awardXP(amount: number, _reason: string): Promise<void> {
    if (isGuest) {
      const current = parseInt(localStorage.getItem('guest_xp') ?? '0', 10)
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
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/features/gamification/hooks/useXP.ts
git commit -m "feat: add guest localStorage path to useXP"
```

---

### Task 7: Update ModuleMapPage for guest UI

**Files:**
- Modify: `src/features/curriculum/pages/ModuleMapPage.tsx`

- [ ] **Step 1: Replace src/features/curriculum/pages/ModuleMapPage.tsx with the following**

```typescript
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/theme/ThemeContext'
import { ModuleMap } from '../components/ModuleMap'

export function ModuleMapPage() {
  const { user, isGuest, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-bg">
      {isGuest && (
        <div className="bg-primary/10 border-b border-primary/20 text-center py-2 px-4 text-sm text-text-muted">
          Browsing as guest —{' '}
          <Link to="/auth" className="text-primary hover:underline font-medium">Sign up</Link>
          {' '}to save permanently.
        </div>
      )}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-text-base">React Academy</h1>
          <div className="flex items-center gap-3">
            <nav className="hidden sm:flex gap-3 text-sm items-center">
              {isGuest ? (
                <>
                  <div className="relative group">
                    <span className="text-text-muted/50 cursor-not-allowed line-through">Leaderboard</span>
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-secondary text-text-muted text-xs px-2 py-1 rounded border border-border whitespace-nowrap z-20">
                      Sign in to access
                    </div>
                  </div>
                  <div className="relative group">
                    <span className="text-text-muted/50 cursor-not-allowed line-through">Profile</span>
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-secondary text-text-muted text-xs px-2 py-1 rounded border border-border whitespace-nowrap z-20">
                      Sign in to access
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/leaderboard" className="text-text-muted hover:text-primary transition-colors">Leaderboard</Link>
                  <Link to="/profile" className="text-text-muted hover:text-primary transition-colors">{user?.display_name}</Link>
                  {(user?.role === 'moderator' || user?.role === 'admin') && (
                    <Link to="/moderator" className="text-text-muted hover:text-primary transition-colors">Moderation</Link>
                  )}
                  {user?.role === 'admin' && (
                    <Link to="/admin" className="text-text-muted hover:text-primary transition-colors">Admin</Link>
                  )}
                </>
              )}
            </nav>
            <select
              value={theme}
              onChange={e => setTheme(e.target.value as typeof theme)}
              className="text-sm border border-border rounded-theme px-2 py-1 bg-bg text-text-base"
              aria-label="Select theme"
            >
              <option value="fun">🎮 Fun</option>
              <option value="pro">💼 Pro</option>
              <option value="dev">💻 Dev</option>
            </select>
            {isGuest ? (
              <Link
                to="/auth"
                className="text-sm px-3 py-1.5 rounded-theme bg-primary hover:bg-primary-hover text-white font-medium transition-colors"
              >
                Sign Up
              </Link>
            ) : (
              <button
                onClick={signOut}
                className="text-sm text-text-muted hover:text-error transition-colors"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-text-base">Your Curriculum</h2>
          <p className="text-text-muted mt-1">Complete modules in order to unlock the full stack.</p>
        </div>
        <ModuleMap />
      </main>
      <footer className="border-t border-border mt-16 py-4">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-xs text-text-muted">
          <span>React Academy</span>
          <Link to="/report-bug" className="hover:text-primary transition-colors">Report a Bug</Link>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/curriculum/pages/ModuleMapPage.tsx
git commit -m "feat: add guest banner, grayed nav links, and Sign Up CTA to ModuleMapPage"
```

---

### Task 8: Update LessonPage for guest UI

**Files:**
- Modify: `src/features/curriculum/pages/LessonPage.tsx`

- [ ] **Step 1: Add isGuest to the useAuth import at the top of LessonPage.tsx**

Add the following import at line 1 (before the existing imports):

The file currently has no `useAuth` import. Add it after the existing imports:

```typescript
import { useAuth } from '@/features/auth/hooks/useAuth'
```

Then destructure `isGuest` from `useAuth()` at the top of the component:

```typescript
const { isGuest } = useAuth()
```

- [ ] **Step 2: Replace the `step === 'complete'` block and CommentSection in LessonPage.tsx**

Find and replace this section (currently lines 168–182):

```typescript
        {/* Step: complete (no celebration shown — handled by overlay) */}
        {step === 'complete' && !showCelebration && (
          <div className="text-center py-12">
            <p className="text-text-base text-lg mb-4">Lesson complete!</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors"
            >
              Back to modules
            </Link>
          </div>
        )}

        {/* Discussion — always visible when lesson is loaded */}
        <CommentSection lessonId={lesson.id} />
```

Replace with:

```typescript
        {/* Step: complete (no celebration shown — handled by overlay) */}
        {step === 'complete' && !showCelebration && (
          <div className="py-12 flex flex-col gap-6">
            <p className="text-text-base text-lg text-center">Lesson complete!</p>
            {isGuest && (
              <div className="bg-primary/10 border border-primary/20 rounded-theme p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-semibold text-text-base text-sm">💾 Don't lose your progress</p>
                  <p className="text-text-muted text-xs mt-0.5">Create a free account to save permanently across all devices.</p>
                </div>
                <Link
                  to="/auth"
                  className="shrink-0 px-4 py-2 rounded-theme bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors"
                >
                  Sign Up Free
                </Link>
              </div>
            )}
            <div className="text-center">
              <Link
                to="/"
                className="inline-block px-6 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors"
              >
                {isGuest ? 'Continue Learning →' : 'Back to modules'}
              </Link>
            </div>
          </div>
        )}

        {/* Discussion */}
        {isGuest ? (
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-text-muted text-sm">
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to join the discussion.
            </p>
          </div>
        ) : (
          <CommentSection lessonId={lesson.id} />
        )}
```

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/features/curriculum/pages/LessonPage.tsx
git commit -m "feat: add post-lesson sign-up prompt and hide CommentSection for guests"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|---|---|
| "Continue as Guest" button on auth page | Task 4 |
| Guest progress in localStorage | Tasks 5, 6 |
| Full interactive experience (quiz, project) | Tasks 5, 6 — hooks branch transparently |
| Post-lesson sign-up prompt (non-blocking) | Task 8 |
| "Continue Learning →" always available | Task 8 |
| Leaderboard/Profile grayed with tooltip | Task 7 |
| "Sign Up" button in nav for guests | Task 7 |
| Guest banner on module map | Task 7 |
| No avatar for guests | Task 7 — avatar was `{user?.display_name}` link; guest nav omits it |
| Blocked routes redirect to /auth | Task 3 — `isGuest && requiredRole` redirects |
| localStorage persists across refreshes | Tasks 5, 6 — written on every action |
| Migration on sign-up | Tasks 1, 2 |
| Migration clears localStorage | Task 1 — `finally` block |
| CommentSection hidden for guests | Task 8 |
| isGuest backed by useState (not derived each render) | Task 2 — `useState(() => ...)` lazy init |
