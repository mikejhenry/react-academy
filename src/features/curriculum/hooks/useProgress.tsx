import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { MODULES } from '@/data/curriculum'

// ── Pure utility (exported for tests) ────────────────────────────────────────

export function isModuleUnlocked(moduleId: string, completedLessons: string[]): boolean {
  if (moduleId === '1') return true
  const idx = MODULES.findIndex(m => m.id === moduleId)
  if (idx <= 0) return false
  const prev = MODULES[idx - 1]
  return prev.lessons.every(l => completedLessons.includes(l.id))
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
  const { user } = useAuth()
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [quizScores, setQuizScores] = useState<Record<string, number>>({})
  const [projectsPassed, setProjectsPassed] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setCompletedLessons([])
      setQuizScores({})
      setProjectsPassed([])
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

      // Best score per lesson
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
  }, [user?.id])

  // completedModules is derived — no separate DB table needed
  const completedModules = MODULES
    .filter(m => m.lessons.every(l => completedLessons.includes(l.id)))
    .map(m => m.id)

  const completeLesson = useCallback(
    async (lessonId: string, moduleId: string, xpEarned: number): Promise<{ wasNew: boolean }> => {
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
    [user, completedLessons]
  )

  const saveQuizAttempt = useCallback(
    async (lessonId: string, score: number, answers: string[]): Promise<void> => {
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
    [user]
  )

  const completeProject = useCallback(
    async (projectId: string): Promise<{ wasNew: boolean }> => {
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
    [user, projectsPassed]
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
