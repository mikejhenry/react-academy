# Phase 2: Core Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full learning loop — Module Map, Lesson Renderer, Quiz Engine, Project Validator, XP/badge/streak awards, and theme-aware celebration — so a student can take a lesson, pass a quiz, submit a project, earn XP and badges, and see the result celebrated.

**Architecture:** Each subsystem is a separate feature folder (`curriculum`, `quiz`, `projects`, `gamification`). Progress state lives in a `ProgressProvider` context (one Supabase load on login, local mutations after). XP awards, badge evaluation, and streak tracking are handled by a stateless `useXP` hook that writes to `leaderboard_cache`, `badges`, and `streaks` tables. The `LessonPage` orchestrates the flow: content → quiz → (optional) project → celebration. Celebration is theme-aware via `ThemeTokens.celebration.type`.

**Tech Stack:** React 18, React Router v6, TypeScript, Tailwind CSS, Supabase JS v2, Vitest, @testing-library/react, canvas-confetti (fun theme)

---

## Phase Deliverable

At the end of this phase:
- `npm run dev` loads the Module Map (19 cards, sequential lock)
- Clicking a module opens a lesson; content renders with all 6 block types
- Quiz runs (MC, true/false, fill-blank), scores, requires 60% to pass, awards bonus XP for 100%
- Lessons with practice projects show the ProjectValidator after a passing quiz
- XP is awarded and written to `leaderboard_cache`; new badges written to `badges` table; streak updated in `streaks`
- A theme-appropriate celebration fires (confetti / toast / terminal) then returns to Module Map
- All tests pass; production build is clean

---

## File Map

```
NEW — src/features/curriculum/hooks/useProgress.tsx
NEW — src/features/curriculum/hooks/useProgress.test.ts
NEW — src/features/curriculum/components/ContentRenderer.tsx
NEW — src/features/curriculum/components/ContentRenderer.test.tsx
NEW — src/features/curriculum/components/ModuleCard.tsx
NEW — src/features/curriculum/components/ModuleMap.tsx
NEW — src/features/curriculum/components/ModuleMap.test.tsx
NEW — src/features/curriculum/pages/ModuleMapPage.tsx
NEW — src/features/curriculum/pages/LessonPage.tsx

NEW — src/features/quiz/utils/scoreQuiz.ts
NEW — src/features/quiz/utils/scoreQuiz.test.ts
NEW — src/features/quiz/components/QuizQuestion.tsx
NEW — src/features/quiz/components/QuizEngine.tsx

NEW — src/features/projects/utils/runValidators.ts
NEW — src/features/projects/utils/runValidators.test.ts
NEW — src/features/projects/components/ProjectValidator.tsx

NEW — src/features/gamification/hooks/useXP.ts
NEW — src/features/gamification/hooks/useXP.test.ts
NEW — src/features/gamification/components/CelebrationOverlay.tsx

MODIFY — src/main.tsx          (add ProgressProvider inside AuthProvider)
MODIFY — src/App.tsx           (swap stub → ModuleMapPage, add lesson route)
DELETE — src/pages/ModuleMapStub.tsx
```

---

## Cross-Phase Notes

- Quiz scores stored as integers 0–100 (percentage). Perfect = 100. Passing threshold = 60.
- XP rewards: lesson complete = `lesson.xpReward` (100 XP), perfect quiz = +50 bonus, project required validators = +150 XP base, each bonus validator = +50 XP.
- `leaderboard_cache` is the authoritative XP total. It is upserted by `useXP.awardXP` after every lesson/quiz/project completion.
- `completedModules` is derived client-side (all lessons in module complete) — not stored in DB separately.
- The `progress` table stores one row per lesson completion; `quiz_attempts` stores one row per passing quiz submission; `project_submissions` stores one row per passing project.

---

## Task 1: Install canvas-confetti + ProgressProvider

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/features/curriculum/hooks/useProgress.tsx`
- Create: `src/features/curriculum/hooks/useProgress.test.ts`

- [ ] **Step 1: Install canvas-confetti**

```bash
cd "C:\Users\johns\Full Stack AI Assisted Projects\React learning App"
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

Expected: `node_modules/canvas-confetti` present, no errors.

- [ ] **Step 2: Write failing tests for `isModuleUnlocked`**

Create `src/features/curriculum/hooks/useProgress.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { isModuleUnlocked } from './useProgress'
import { MODULES } from '@/data/curriculum'

const module1LessonIds = MODULES.find(m => m.id === '1')!.lessons.map(l => l.id)

describe('isModuleUnlocked', () => {
  it('module 1 is always unlocked with no lessons complete', () => {
    expect(isModuleUnlocked('1', [])).toBe(true)
  })

  it('module 2 is locked when no lessons complete', () => {
    expect(isModuleUnlocked('2', [])).toBe(false)
  })

  it('module 2 is locked when only some module 1 lessons complete', () => {
    expect(isModuleUnlocked('2', [module1LessonIds[0]])).toBe(false)
  })

  it('module 2 unlocks when all module 1 lessons are complete', () => {
    expect(isModuleUnlocked('2', module1LessonIds)).toBe(true)
  })

  it('unknown module id returns false', () => {
    expect(isModuleUnlocked('99', module1LessonIds)).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npm test -- --run
```

Expected: FAIL — `isModuleUnlocked` is not defined.

- [ ] **Step 4: Create `src/features/curriculum/hooks/useProgress.tsx`**

```typescript
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
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- --run
```

Expected: All tests pass (new `isModuleUnlocked` tests + existing 13 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/curriculum/hooks/ package.json package-lock.json
git commit -m "feat: add ProgressProvider context with isModuleUnlocked utility"
```

---

## Task 2: ContentRenderer

**Files:**
- Create: `src/features/curriculum/components/ContentRenderer.tsx`
- Create: `src/features/curriculum/components/ContentRenderer.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/features/curriculum/components/ContentRenderer.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContentRenderer } from './ContentRenderer'

describe('ContentRenderer', () => {
  it('renders text block', () => {
    render(<ContentRenderer blocks={[{ type: 'text', content: 'Hello world' }]} />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders heading block as h3', () => {
    render(<ContentRenderer blocks={[{ type: 'heading', content: 'Chapter 1' }]} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Chapter 1' })).toBeInTheDocument()
  })

  it('renders code block content', () => {
    render(<ContentRenderer blocks={[{ type: 'code', language: 'js', content: 'const x = 1' }]} />)
    expect(screen.getByText('const x = 1')).toBeInTheDocument()
  })

  it('renders all list items', () => {
    render(<ContentRenderer blocks={[{ type: 'list', items: ['item a', 'item b', 'item c'] }]} />)
    expect(screen.getByText('item a')).toBeInTheDocument()
    expect(screen.getByText('item b')).toBeInTheDocument()
    expect(screen.getByText('item c')).toBeInTheDocument()
  })

  it('renders tip block content', () => {
    render(<ContentRenderer blocks={[{ type: 'tip', content: 'Remember to save' }]} />)
    expect(screen.getByText('Remember to save')).toBeInTheDocument()
  })

  it('renders warning block content', () => {
    render(<ContentRenderer blocks={[{ type: 'warning', content: 'This will break' }]} />)
    expect(screen.getByText('This will break')).toBeInTheDocument()
  })

  it('renders multiple blocks in order', () => {
    render(
      <ContentRenderer
        blocks={[
          { type: 'heading', content: 'Section A' },
          { type: 'text', content: 'Body text here.' },
        ]}
      />
    )
    expect(screen.getByRole('heading', { name: 'Section A' })).toBeInTheDocument()
    expect(screen.getByText('Body text here.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run
```

Expected: FAIL — `ContentRenderer` not defined.

- [ ] **Step 3: Create `src/features/curriculum/components/ContentRenderer.tsx`**

```typescript
import type { ContentBlock } from '@/lib/types'

interface ContentRendererProps {
  blocks: ContentBlock[]
}

export function ContentRenderer({ blocks }: ContentRendererProps) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  )
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'text':
      return <p className="text-text-base leading-relaxed">{block.content}</p>

    case 'heading':
      return <h3 className="text-xl font-bold text-text-base mt-2">{block.content}</h3>

    case 'code':
      return (
        <div>
          <div className="flex items-center justify-between bg-bg-secondary border border-border rounded-t-theme px-3 py-1">
            <span className="text-xs text-text-muted font-mono">{block.language}</span>
          </div>
          <pre className="bg-bg-secondary border border-t-0 border-border rounded-b-theme p-4 overflow-x-auto text-sm font-mono text-text-base">
            <code>{block.content}</code>
          </pre>
        </div>
      )

    case 'list':
      return (
        <ul className="list-disc list-inside flex flex-col gap-1.5 pl-2">
          {block.items.map((item, i) => (
            <li key={i} className="text-text-base leading-relaxed">{item}</li>
          ))}
        </ul>
      )

    case 'tip':
      return (
        <div className="border-l-4 border-primary bg-bg-secondary px-4 py-3 rounded-r-theme">
          <p className="text-text-base text-sm">
            <span className="font-semibold text-primary">Tip: </span>
            {block.content}
          </p>
        </div>
      )

    case 'warning':
      return (
        <div className="border-l-4 border-warning bg-bg-secondary px-4 py-3 rounded-r-theme">
          <p className="text-text-base text-sm">
            <span className="font-semibold text-warning">⚠ Warning: </span>
            {block.content}
          </p>
        </div>
      )

    default:
      return null
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/curriculum/components/ContentRenderer.tsx src/features/curriculum/components/ContentRenderer.test.tsx
git commit -m "feat: add ContentRenderer for all 6 content block types"
```

---

## Task 3: ModuleCard + ModuleMap

**Files:**
- Create: `src/features/curriculum/components/ModuleCard.tsx`
- Create: `src/features/curriculum/components/ModuleMap.tsx`
- Create: `src/features/curriculum/components/ModuleMap.test.tsx`

- [ ] **Step 1: Write failing test for ModuleMap**

Create `src/features/curriculum/components/ModuleMap.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ModuleMap } from './ModuleMap'

// Mock useProgress
vi.mock('@/features/curriculum/hooks/useProgress', () => ({
  useProgress: () => ({
    completedLessons: [],
    completedModules: [],
    loading: false,
    isModuleUnlockedForUser: (id: string) => id === '1',
  }),
}))

describe('ModuleMap', () => {
  it('renders all 19 module cards', () => {
    render(
      <MemoryRouter>
        <ModuleMap />
      </MemoryRouter>
    )
    expect(screen.getByText('HTML Fundamentals')).toBeInTheDocument()
    expect(screen.getByText('Capstone Project')).toBeInTheDocument()
    // Count locked indicators for modules 2-19
    const lockIcons = screen.getAllByText('🔒')
    expect(lockIcons.length).toBe(18)
  })

  it('shows module 1 as a link (unlocked)', () => {
    render(
      <MemoryRouter>
        <ModuleMap />
      </MemoryRouter>
    )
    // Module 1 card should be a link element
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run
```

Expected: FAIL — `ModuleMap` not defined.

- [ ] **Step 3: Create `src/features/curriculum/components/ModuleCard.tsx`**

```typescript
import { Link } from 'react-router-dom'
import type { Module } from '@/lib/types'

interface ModuleCardProps {
  module: Module
  isUnlocked: boolean
  completedLessonCount: number
  isComplete: boolean
  nextLessonId: string
}

export function ModuleCard({
  module,
  isUnlocked,
  completedLessonCount,
  isComplete,
  nextLessonId,
}: ModuleCardProps) {
  const totalLessons = module.lessons.length
  const progress = totalLessons > 0
    ? Math.round((completedLessonCount / totalLessons) * 100)
    : 0

  if (!isUnlocked) {
    return (
      <div className="bg-card border border-border rounded-theme p-5 opacity-50 cursor-not-allowed select-none">
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{module.icon}</span>
          <span className="text-text-muted text-sm" aria-label="Locked">🔒</span>
        </div>
        <h3 className="font-semibold text-text-base text-sm leading-snug">{module.title}</h3>
        <p className="text-text-muted text-xs mt-1 line-clamp-2">{module.description}</p>
        <p className="text-text-muted text-xs mt-3">Complete previous module to unlock</p>
      </div>
    )
  }

  return (
    <Link
      to={`/module/${module.id}/lesson/${nextLessonId}`}
      className={`block bg-card rounded-theme p-5 border-2 transition-all hover:border-primary hover:shadow-sm ${
        isComplete ? 'border-success' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{module.icon}</span>
        {isComplete && (
          <span className="text-success text-sm font-semibold" aria-label="Complete">✓</span>
        )}
      </div>
      <h3 className="font-semibold text-text-base text-sm leading-snug">{module.title}</h3>
      <p className="text-text-muted text-xs mt-1 line-clamp-2">{module.description}</p>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>{completedLessonCount}/{totalLessons} lessons</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Create `src/features/curriculum/components/ModuleMap.tsx`**

```typescript
import { MODULES } from '@/data/curriculum'
import { ModuleCard } from './ModuleCard'
import { useProgress } from '../hooks/useProgress'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

export function ModuleMap() {
  const { completedLessons, completedModules, isModuleUnlockedForUser, loading } = useProgress()

  if (loading) return <LoadingSpinner />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {MODULES.map(module => {
        const completedInModule = module.lessons.filter(l =>
          completedLessons.includes(l.id)
        ).length
        const isComplete = completedModules.includes(module.id)
        const isUnlocked = isModuleUnlockedForUser(module.id)
        const nextLesson =
          module.lessons.find(l => !completedLessons.includes(l.id)) ??
          module.lessons[0]

        return (
          <ModuleCard
            key={module.id}
            module={module}
            isUnlocked={isUnlocked}
            completedLessonCount={completedInModule}
            isComplete={isComplete}
            nextLessonId={nextLesson.id}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/curriculum/components/
git commit -m "feat: add ModuleCard and ModuleMap with sequential lock logic"
```

---

## Task 4: scoreQuiz utility (TDD)

**Files:**
- Create: `src/features/quiz/utils/scoreQuiz.ts`
- Create: `src/features/quiz/utils/scoreQuiz.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/features/quiz/utils/scoreQuiz.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { scoreQuiz } from './scoreQuiz'
import type { QuizQuestion } from '@/lib/types'

const mcQuestions: QuizQuestion[] = [
  { question: 'Q1', options: ['a', 'b', 'c', 'd'], correct: 0 },
  { question: 'Q2', options: ['a', 'b', 'c', 'd'], correct: 2 },
  { question: 'Q3', options: ['a', 'b', 'c', 'd'], correct: 1 },
]

describe('scoreQuiz — multiple choice', () => {
  it('returns 100 when all answers correct', () => {
    const result = scoreQuiz(mcQuestions, ['0', '2', '1'])
    expect(result.score).toBe(100)
    expect(result.correctCount).toBe(3)
    expect(result.total).toBe(3)
    expect(result.isPerfect).toBe(true)
  })

  it('returns 0 when all answers wrong', () => {
    const result = scoreQuiz(mcQuestions, ['1', '0', '0'])
    expect(result.score).toBe(0)
    expect(result.correctCount).toBe(0)
    expect(result.isPerfect).toBe(false)
  })

  it('returns 67 when 2 of 3 correct (rounds)', () => {
    const result = scoreQuiz(mcQuestions, ['0', '2', '0'])
    expect(result.score).toBe(67)
    expect(result.correctCount).toBe(2)
  })

  it('treats missing answer as wrong', () => {
    const result = scoreQuiz(mcQuestions, ['0'])
    expect(result.correctCount).toBe(1)
    expect(result.score).toBe(33)
  })
})

describe('scoreQuiz — true/false', () => {
  const tfQuestions: QuizQuestion[] = [
    { question: 'Is this true?', options: ['True', 'False'], correct: 0, type: 'true-false' },
    { question: 'Is that false?', options: ['True', 'False'], correct: 1, type: 'true-false' },
  ]

  it('scores true/false by index like multiple choice', () => {
    const result = scoreQuiz(tfQuestions, ['0', '1'])
    expect(result.score).toBe(100)
  })

  it('marks wrong answer for true/false', () => {
    const result = scoreQuiz(tfQuestions, ['1', '0'])
    expect(result.score).toBe(0)
  })
})

describe('scoreQuiz — fill-blank', () => {
  const fillQ: QuizQuestion = {
    question: 'Fill: git ___ to check status',
    options: ['status', 'commit', 'add', 'push'],
    correct: 0,
    type: 'fill-blank',
  }

  it('matches correct answer case-insensitively', () => {
    const result = scoreQuiz([fillQ], ['STATUS'])
    expect(result.score).toBe(100)
  })

  it('matches exact correct answer', () => {
    const result = scoreQuiz([fillQ], ['status'])
    expect(result.score).toBe(100)
  })

  it('rejects wrong answer', () => {
    const result = scoreQuiz([fillQ], ['commit'])
    expect(result.score).toBe(0)
  })

  it('uses regex pattern when provided', () => {
    const regexQ: QuizQuestion = {
      question: 'Type any hex color',
      options: [],
      correct: 0,
      type: 'fill-blank',
      pattern: '^#[0-9a-fA-F]{6}$',
    }
    expect(scoreQuiz([regexQ], ['#ff0000']).score).toBe(100)
    expect(scoreQuiz([regexQ], ['red']).score).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run
```

Expected: FAIL — `scoreQuiz` not defined.

- [ ] **Step 3: Create `src/features/quiz/utils/scoreQuiz.ts`**

```typescript
import type { QuizQuestion } from '@/lib/types'

export interface QuizResult {
  score: number        // 0–100 percentage
  correctCount: number
  total: number
  isPerfect: boolean
}

export function scoreQuiz(questions: QuizQuestion[], answers: string[]): QuizResult {
  let correctCount = 0
  for (let i = 0; i < questions.length; i++) {
    if (isCorrect(questions[i], answers[i] ?? '')) correctCount++
  }
  const score = Math.round((correctCount / questions.length) * 100)
  return { score, correctCount, total: questions.length, isPerfect: score === 100 }
}

function isCorrect(q: QuizQuestion, answer: string): boolean {
  if (q.type === 'fill-blank') {
    const trimmed = answer.trim()
    if (q.pattern) {
      try {
        return new RegExp(q.pattern).test(trimmed)
      } catch {
        return false
      }
    }
    return trimmed.toLowerCase() === (q.options[q.correct] ?? '').toLowerCase()
  }
  // multiple-choice and true-false: answer is a string index
  return parseInt(answer, 10) === q.correct
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/quiz/utils/
git commit -m "feat: add scoreQuiz utility with MC, true/false, and fill-blank support"
```

---

## Task 5: QuizQuestion + QuizEngine

**Files:**
- Create: `src/features/quiz/components/QuizQuestion.tsx`
- Create: `src/features/quiz/components/QuizEngine.tsx`

The passing threshold is 60. Quiz shows results after submit; if score ≥ 60, "Continue" appears. If score < 60, "Try Again" resets the quiz.

- [ ] **Step 1: Create `src/features/quiz/components/QuizQuestion.tsx`**

```typescript
import type { QuizQuestion as TQuizQuestion } from '@/lib/types'

interface QuizQuestionProps {
  question: TQuizQuestion
  index: number
  answer: string
  onChange: (value: string) => void
  showResult?: boolean
}

export function QuizQuestion({ question, index, answer, onChange, showResult }: QuizQuestionProps) {
  const isFillBlank = question.type === 'fill-blank'
  const isCorrectAnswer = showResult
    ? isFillBlank
      ? answer.trim().toLowerCase() === (question.options[question.correct] ?? '').toLowerCase()
      : parseInt(answer, 10) === question.correct
    : false

  return (
    <div className="flex flex-col gap-3">
      <p className="font-semibold text-text-base">
        <span className="text-text-muted text-sm mr-2">{index + 1}.</span>
        {question.question}
      </p>

      {isFillBlank ? (
        <input
          type="text"
          value={answer}
          onChange={e => onChange(e.target.value)}
          disabled={showResult}
          placeholder="Type your answer..."
          className="px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary disabled:opacity-70"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {question.options.map((opt, i) => {
            let optClass = 'px-4 py-3 rounded-theme border text-sm text-left transition-colors '
            if (!showResult) {
              optClass += answer === String(i)
                ? 'border-primary bg-bg-secondary text-text-base'
                : 'border-border bg-card text-text-base hover:border-primary cursor-pointer'
            } else {
              if (i === question.correct) {
                optClass += 'border-success bg-bg-secondary text-success font-semibold'
              } else if (answer === String(i) && i !== question.correct) {
                optClass += 'border-error bg-bg-secondary text-error'
              } else {
                optClass += 'border-border bg-card text-text-muted opacity-60'
              }
            }

            return (
              <button
                key={i}
                type="button"
                disabled={showResult}
                onClick={() => onChange(String(i))}
                className={optClass}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {showResult && (
        <p className={`text-xs font-semibold ${isCorrectAnswer ? 'text-success' : 'text-error'}`}>
          {isCorrectAnswer ? '✓ Correct' : `✗ Correct answer: ${question.options[question.correct]}`}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/features/quiz/components/QuizEngine.tsx`**

```typescript
import { useState } from 'react'
import type { QuizQuestion as TQuizQuestion } from '@/lib/types'
import { QuizQuestion } from './QuizQuestion'
import { scoreQuiz } from '../utils/scoreQuiz'

const PASSING_SCORE = 60

interface QuizEngineProps {
  questions: TQuizQuestion[]
  onComplete: (score: number, answers: string[]) => void
}

export function QuizEngine({ questions, onComplete }: QuizEngineProps) {
  const [answers, setAnswers] = useState<string[]>(() => new Array(questions.length).fill(''))
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof scoreQuiz> | null>(null)

  const allAnswered = answers.every(a => a.trim() !== '')

  const handleSubmit = () => {
    const r = scoreQuiz(questions, answers)
    setResult(r)
    setSubmitted(true)
  }

  const handleRetry = () => {
    setAnswers(new Array(questions.length).fill(''))
    setSubmitted(false)
    setResult(null)
  }

  const setAnswer = (i: number, value: string) => {
    setAnswers(prev => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-text-base">Quiz</h2>
        <p className="text-text-muted text-sm">{questions.length} questions · 60% to pass · 100% = +50 bonus XP</p>
      </div>

      <div className="flex flex-col gap-6">
        {questions.map((q, i) => (
          <QuizQuestion
            key={i}
            question={q}
            index={i}
            answer={answers[i]}
            onChange={value => setAnswer(i, value)}
            showResult={submitted}
          />
        ))}
      </div>

      {!submitted ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="px-6 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50 self-start"
        >
          Submit Quiz
        </button>
      ) : (
        <div className="flex flex-col gap-4 border-t border-border pt-6">
          <div className={`text-center p-4 rounded-theme ${
            result!.score >= PASSING_SCORE ? 'bg-bg-secondary border border-success' : 'bg-bg-secondary border border-error'
          }`}>
            <p className="text-3xl font-black text-text-base">{result!.score}%</p>
            <p className="text-text-muted text-sm mt-1">
              {result!.correctCount} / {result!.total} correct
            </p>
            {result!.isPerfect && (
              <p className="text-success text-sm font-semibold mt-1">+50 bonus XP for a perfect score!</p>
            )}
            {result!.score < PASSING_SCORE && (
              <p className="text-error text-sm mt-1">You need 60% to continue. Try again!</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRetry}
              className="px-5 py-2.5 rounded-theme border border-border text-text-muted hover:border-primary hover:text-primary transition-colors text-sm"
            >
              Try Again
            </button>
            {result!.score >= PASSING_SCORE && (
              <button
                type="button"
                onClick={() => onComplete(result!.score, answers)}
                className="px-5 py-2.5 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors text-sm"
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run tests + build**

```bash
npm test -- --run && npm run build
```

Expected: All tests pass, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/features/quiz/components/
git commit -m "feat: add QuizQuestion and QuizEngine with 60% pass threshold"
```

---

## Task 6: runValidators utility (TDD)

**Files:**
- Create: `src/features/projects/utils/runValidators.ts`
- Create: `src/features/projects/utils/runValidators.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/features/projects/utils/runValidators.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { runValidators } from './runValidators'
import type { Validator } from '@/lib/types'

describe('runValidators — contains', () => {
  const v: Validator = {
    id: 'v1', description: 'Uses display flex', type: 'contains',
    value: 'display: flex', required: true, bonusXP: 0,
  }

  it('passes when code contains value', () => {
    const r = runValidators('body { display: flex; }', [v])
    expect(r.results[0].passed).toBe(true)
    expect(r.allRequiredPassed).toBe(true)
  })

  it('fails when code does not contain value', () => {
    const r = runValidators('body { color: red; }', [v])
    expect(r.results[0].passed).toBe(false)
    expect(r.allRequiredPassed).toBe(false)
  })
})

describe('runValidators — regex', () => {
  const v: Validator = {
    id: 'v2', description: 'Has media query', type: 'regex',
    value: '@media\\s*\\(', required: false, bonusXP: 50,
  }

  it('passes and earns bonus XP when regex matches', () => {
    const r = runValidators('@media (max-width: 768px) {}', [v])
    expect(r.results[0].passed).toBe(true)
    expect(r.bonusXPEarned).toBe(50)
  })

  it('earns 0 bonus when optional validator fails', () => {
    const r = runValidators('div { color: red; }', [v])
    expect(r.results[0].passed).toBe(false)
    expect(r.bonusXPEarned).toBe(0)
  })
})

describe('runValidators — element', () => {
  const v: Validator = {
    id: 'v3', description: 'Includes <nav>', type: 'element',
    value: 'nav', required: true, bonusXP: 0,
  }

  it('passes for self-closing <nav />', () => {
    expect(runValidators('<nav />', [v]).results[0].passed).toBe(true)
  })

  it('passes for <nav> with content', () => {
    expect(runValidators('<nav><a href="/">Home</a></nav>', [v]).results[0].passed).toBe(true)
  })

  it('fails when element missing', () => {
    expect(runValidators('<header>No nav here</header>', [v]).results[0].passed).toBe(false)
  })
})

describe('runValidators — property', () => {
  const v: Validator = {
    id: 'v4', description: 'Uses display property', type: 'property',
    value: 'display', required: true, bonusXP: 0,
  }

  it('passes when CSS property present', () => {
    expect(runValidators('div { display: grid; }', [v]).results[0].passed).toBe(true)
  })

  it('fails when property absent', () => {
    expect(runValidators('div { color: red; }', [v]).results[0].passed).toBe(false)
  })
})

describe('runValidators — summary', () => {
  it('allRequiredPassed is false when any required validator fails', () => {
    const validators: Validator[] = [
      { id: 'r1', description: 'Required', type: 'contains', value: 'must-have', required: true, bonusXP: 0 },
      { id: 'b1', description: 'Bonus', type: 'contains', value: 'bonus-thing', required: false, bonusXP: 25 },
    ]
    const r = runValidators('bonus-thing here', validators)
    expect(r.allRequiredPassed).toBe(false)
    expect(r.bonusXPEarned).toBe(25)
  })

  it('allRequiredPassed is true when all required validators pass', () => {
    const validators: Validator[] = [
      { id: 'r1', description: 'A', type: 'contains', value: 'hello', required: true, bonusXP: 0 },
      { id: 'r2', description: 'B', type: 'contains', value: 'world', required: true, bonusXP: 0 },
    ]
    expect(runValidators('hello world', validators).allRequiredPassed).toBe(true)
  })

  it('bonusXPEarned sums multiple passing bonus validators', () => {
    const validators: Validator[] = [
      { id: 'b1', description: 'B1', type: 'contains', value: 'alpha', required: false, bonusXP: 30 },
      { id: 'b2', description: 'B2', type: 'contains', value: 'beta', required: false, bonusXP: 50 },
    ]
    const r = runValidators('alpha beta', validators)
    expect(r.bonusXPEarned).toBe(80)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run
```

Expected: FAIL — `runValidators` not defined.

- [ ] **Step 3: Create `src/features/projects/utils/runValidators.ts`**

```typescript
import type { Validator } from '@/lib/types'

export interface ValidatorResult {
  id: string
  description: string
  passed: boolean
  required: boolean
  bonusXP: number
}

export interface ValidationSummary {
  results: ValidatorResult[]
  allRequiredPassed: boolean
  bonusXPEarned: number
}

export function runValidators(code: string, validators: Validator[]): ValidationSummary {
  const results: ValidatorResult[] = validators.map(v => ({
    id: v.id,
    description: v.description,
    passed: check(code, v),
    required: v.required,
    bonusXP: v.bonusXP,
  }))

  const allRequiredPassed = results.every(r => !r.required || r.passed)
  const bonusXPEarned = results
    .filter(r => !r.required && r.passed)
    .reduce((sum, r) => sum + r.bonusXP, 0)

  return { results, allRequiredPassed, bonusXPEarned }
}

function check(code: string, v: Validator): boolean {
  switch (v.type) {
    case 'contains':
      return code.includes(v.value)
    case 'regex':
      try {
        return new RegExp(v.value, 'i').test(code)
      } catch {
        return false
      }
    case 'element':
      // matches <tagname>, <tagname >, or <tagname/>
      return new RegExp(`<${v.value}[\\s/>]`, 'i').test(code)
    case 'property':
      // matches  propertyName:  or  propertyName :
      return new RegExp(`${v.value}\\s*:`, 'i').test(code)
    default:
      return false
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/projects/utils/
git commit -m "feat: add runValidators utility for contains/regex/element/property checks"
```

---

## Task 7: ProjectValidator component

**Files:**
- Create: `src/features/projects/components/ProjectValidator.tsx`

The user pastes their code into a textarea. Clicking "Check My Code" runs validators and shows pass/fail per rule. If all required validators pass, a "Submit Project" button appears and calls `onComplete(bonusXP)`.

- [ ] **Step 1: Create `src/features/projects/components/ProjectValidator.tsx`**

```typescript
import { useState } from 'react'
import type { Project } from '@/lib/types'
import { runValidators } from '../utils/runValidators'
import type { ValidationSummary } from '../utils/runValidators'

interface ProjectValidatorProps {
  project: Project
  onComplete: (bonusXP: number) => void
}

export function ProjectValidator({ project, onComplete }: ProjectValidatorProps) {
  const [code, setCode] = useState('')
  const [summary, setSummary] = useState<ValidationSummary | null>(null)

  const handleCheck = () => {
    setSummary(runValidators(code, project.validators))
  }

  const handleSubmit = () => {
    onComplete(summary!.bonusXPEarned)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-text-base">{project.title}</h2>
        <p className="text-text-muted mt-1">{project.description}</p>
        <p className="text-text-muted text-sm mt-1">
          Reward: {project.xpReward} XP
          {project.validators.some(v => v.bonusXP > 0) && (
            <span> + up to {project.validators.reduce((s, v) => s + v.bonusXP, 0)} bonus XP</span>
          )}
        </p>
      </div>

      {/* Requirements checklist */}
      <div className="bg-bg-secondary border border-border rounded-theme p-4">
        <p className="text-sm font-semibold text-text-base mb-3">Requirements</p>
        <ul className="flex flex-col gap-2">
          {project.validators.map(v => {
            const result = summary?.results.find(r => r.id === v.id)
            return (
              <li key={v.id} className="flex items-start gap-2 text-sm">
                <span className={
                  result === undefined ? 'text-text-muted' :
                  result.passed ? 'text-success' : 'text-error'
                }>
                  {result === undefined ? '○' : result.passed ? '✓' : '✗'}
                </span>
                <span className="text-text-base">{v.description}</span>
                {!v.required && (
                  <span className="ml-auto text-xs text-text-muted shrink-0">+{v.bonusXP} XP bonus</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Code paste area */}
      <div>
        <label className="block text-sm font-semibold text-text-base mb-2" htmlFor="project-code">
          Paste your code here
        </label>
        <textarea
          id="project-code"
          value={code}
          onChange={e => setCode(e.target.value)}
          rows={12}
          placeholder="Paste your HTML, CSS, or JavaScript here..."
          className="w-full px-4 py-3 rounded-theme border border-border bg-bg-secondary text-text-base font-mono text-sm focus:outline-none focus:border-primary resize-y"
        />
      </div>

      {/* Validation result summary */}
      {summary !== null && (
        <div className={`p-4 rounded-theme border text-sm font-semibold ${
          summary.allRequiredPassed
            ? 'border-success text-success bg-bg-secondary'
            : 'border-error text-error bg-bg-secondary'
        }`}>
          {summary.allRequiredPassed
            ? `✓ All required checks passed!${summary.bonusXPEarned > 0 ? ` +${summary.bonusXPEarned} bonus XP earned.` : ''}`
            : '✗ Some required checks failed. Fix your code and try again.'}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCheck}
          disabled={code.trim() === ''}
          className="px-5 py-2.5 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50 text-sm"
        >
          Check My Code
        </button>
        {summary?.allRequiredPassed && (
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-theme border-2 border-success text-success hover:bg-bg-secondary font-semibold transition-colors text-sm"
          >
            Submit Project →
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run tests + build**

```bash
npm test -- --run && npm run build
```

Expected: All tests pass, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/features/projects/components/
git commit -m "feat: add ProjectValidator with paste-to-verify UI"
```

---

## Task 8: useXP hook

**Files:**
- Create: `src/features/gamification/hooks/useXP.ts`
- Create: `src/features/gamification/hooks/useXP.test.ts`

- [ ] **Step 1: Write failing tests for `computeNewStreak`**

Create `src/features/gamification/hooks/useXP.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeNewStreak } from './useXP'

describe('computeNewStreak', () => {
  it('starts at 1 when there is no previous activity', () => {
    const r = computeNewStreak(0, 0, null, '2026-04-02')
    expect(r.current).toBe(1)
    expect(r.longest).toBe(1)
  })

  it('increments streak when previous day had activity', () => {
    const r = computeNewStreak(3, 5, '2026-04-01', '2026-04-02')
    expect(r.current).toBe(4)
    expect(r.longest).toBe(5)
  })

  it('updates longest streak when new streak surpasses it', () => {
    const r = computeNewStreak(5, 5, '2026-04-01', '2026-04-02')
    expect(r.current).toBe(6)
    expect(r.longest).toBe(6)
  })

  it('does not change streak when already active today', () => {
    const r = computeNewStreak(3, 5, '2026-04-02', '2026-04-02')
    expect(r.current).toBe(3)
    expect(r.longest).toBe(5)
  })

  it('resets streak to 1 when there is a gap in activity', () => {
    const r = computeNewStreak(7, 10, '2026-03-29', '2026-04-02')
    expect(r.current).toBe(1)
    expect(r.longest).toBe(10)
  })

  it('does not reduce longest streak on reset', () => {
    const r = computeNewStreak(1, 30, '2026-01-01', '2026-04-02')
    expect(r.current).toBe(1)
    expect(r.longest).toBe(30)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run
```

Expected: FAIL — `computeNewStreak` not defined.

- [ ] **Step 3: Create `src/features/gamification/hooks/useXP.ts`**

```typescript
import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { evaluateBadges, getLevel } from '@/data/achievements'
import type { UserProgressState, Badge } from '@/lib/types'

// ── Pure utility (exported for tests) ────────────────────────────────────────

export function computeNewStreak(
  currentStreak: number,
  longestStreak: number,
  lastActivityDate: string | null,
  today: string
): { current: number; longest: number } {
  if (lastActivityDate === today) {
    return { current: currentStreak, longest: longestStreak }
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const newCurrent = lastActivityDate === yesterdayStr ? currentStreak + 1 : 1
  const newLongest = Math.max(longestStreak, newCurrent)
  return { current: newCurrent, longest: newLongest }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface AwardXPResult {
  newBadges: Badge[]
  leveledUp: boolean
  newLevel: number
  totalXP: number
}

export function useXP() {
  const { user } = useAuth()

  const awardXP = useCallback(
    async (amount: number, progress: UserProgressState): Promise<AwardXPResult> => {
      if (!user) return { newBadges: [], leveledUp: false, newLevel: 1, totalXP: 0 }

      // 1. Fetch current totals
      const { data: cacheRow } = await supabase
        .from('leaderboard_cache')
        .select('total_xp')
        .eq('user_id', user.id)
        .single()

      const currentXP = (cacheRow as { total_xp: number } | null)?.total_xp ?? 0
      const totalXP = currentXP + amount
      const oldLevel = getLevel(currentXP)
      const newLevel = getLevel(totalXP)
      const leveledUp = newLevel > oldLevel

      // 2. Upsert leaderboard_cache
      await supabase.from('leaderboard_cache').upsert(
        {
          user_id: user.id,
          total_xp: totalXP,
          lessons_completed: progress.completedLessons.length,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

      // 3. Evaluate new badges
      const { data: existingRows } = await supabase
        .from('badges')
        .select('badge_id')
        .eq('user_id', user.id)

      const existingIds = new Set(
        ((existingRows ?? []) as { badge_id: string }[]).map(r => r.badge_id)
      )

      const progressWithXP: UserProgressState = { ...progress, xp: totalXP }
      const earned = evaluateBadges(progressWithXP)
      const newBadges = earned.filter(b => !existingIds.has(b.id))

      if (newBadges.length > 0) {
        await supabase.from('badges').insert(
          newBadges.map(b => ({ user_id: user.id, badge_id: b.id }))
        )
      }

      // 4. Update streak
      const today = new Date().toISOString().split('T')[0]
      const { data: streakRow } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', user.id)
        .single()

      const existingStreak = streakRow as {
        current_streak: number
        longest_streak: number
        last_activity_date: string | null
      } | null

      const newStreak = computeNewStreak(
        existingStreak?.current_streak ?? 0,
        existingStreak?.longest_streak ?? 0,
        existingStreak?.last_activity_date ?? null,
        today
      )

      await supabase.from('streaks').upsert(
        {
          user_id: user.id,
          current_streak: newStreak.current,
          longest_streak: newStreak.longest,
          last_activity_date: today,
        },
        { onConflict: 'user_id' }
      )

      // Update streak in leaderboard_cache
      await supabase.from('leaderboard_cache').upsert(
        {
          user_id: user.id,
          current_streak: newStreak.current,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

      return { newBadges, leveledUp, newLevel, totalXP }
    },
    [user]
  )

  return { awardXP }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/gamification/hooks/
git commit -m "feat: add useXP hook with XP awards, badge evaluation, and streak tracking"
```

---

## Task 9: CelebrationOverlay

**Files:**
- Create: `src/features/gamification/components/CelebrationOverlay.tsx`

The overlay is portal-rendered over the full screen. Behavior per theme:
- `fun` (confetti): fires `canvas-confetti`, shows XP earned + message, auto-dismisses after 4 seconds
- `pro` (toast): slide-in bar at top, shows message + XP, auto-dismisses after 3 seconds
- `dev` (terminal): full-screen terminal output with typed lines, auto-dismisses after 3 seconds

All types call `onDismiss` when dismissed.

- [ ] **Step 1: Create `src/features/gamification/components/CelebrationOverlay.tsx`**

```typescript
import { useEffect, useRef } from 'react'
import { useTheme } from '@/theme/ThemeContext'
import { getLevelTitle } from '@/data/achievements'

interface CelebrationOverlayProps {
  type: 'lesson' | 'badge' | 'levelup'
  xpEarned: number
  newLevel?: number
  badgeName?: string
  onDismiss: () => void
}

export function CelebrationOverlay(props: CelebrationOverlayProps) {
  const { tokens } = useTheme()

  if (tokens.celebration.type === 'confetti') {
    return <ConfettiCelebration {...props} tokens={tokens} />
  }
  if (tokens.celebration.type === 'toast') {
    return <ToastCelebration {...props} tokens={tokens} />
  }
  return <TerminalCelebration {...props} tokens={tokens} />
}

// ── Fun: confetti ──────────────────────────────────────────────────────────────

function ConfettiCelebration({
  type, xpEarned, newLevel, badgeName, onDismiss, tokens,
}: CelebrationOverlayProps & { tokens: ReturnType<typeof useTheme>['tokens'] }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
    })
    timerRef.current = setTimeout(onDismiss, 4000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDismiss])

  const headline =
    type === 'levelup'
      ? `${tokens.celebration.levelUpMessage} Level ${newLevel} — ${getLevelTitle(newLevel ?? 1)}`
      : type === 'badge'
      ? `${tokens.celebration.badgeMessage} ${badgeName}`
      : tokens.celebration.successMessage

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div className="bg-card border border-border rounded-theme p-8 text-center max-w-sm shadow-xl">
        <p className="text-5xl mb-4">{type === 'levelup' ? '🚀' : type === 'badge' ? '🏆' : '🎉'}</p>
        <h2 className="text-xl font-black text-text-base">{headline}</h2>
        <p className="text-primary font-bold text-lg mt-2">+{xpEarned} XP</p>
        <p className="text-text-muted text-xs mt-4">Tap anywhere to continue</p>
      </div>
    </div>
  )
}

// ── Pro: toast ────────────────────────────────────────────────────────────────

function ToastCelebration({
  type, xpEarned, newLevel, badgeName, onDismiss, tokens,
}: CelebrationOverlayProps & { tokens: ReturnType<typeof useTheme>['tokens'] }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 3000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDismiss])

  const message =
    type === 'levelup'
      ? `${tokens.celebration.levelUpMessage} — Level ${newLevel}`
      : type === 'badge'
      ? `${tokens.celebration.badgeMessage}: ${badgeName}`
      : tokens.celebration.successMessage

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
      <div
        className="bg-card border border-border rounded-theme px-6 py-4 shadow-lg flex items-center gap-4 pointer-events-auto animate-slide-down"
        onClick={onDismiss}
        style={{ animation: 'slideDown 0.3s ease-out' }}
      >
        <span className="text-success text-lg">✓</span>
        <div>
          <p className="text-text-base font-semibold text-sm">{message}</p>
          <p className="text-text-muted text-xs">+{xpEarned} XP earned</p>
        </div>
      </div>
    </div>
  )
}

// ── Dev: terminal ─────────────────────────────────────────────────────────────

function TerminalCelebration({
  type, xpEarned, newLevel, badgeName, onDismiss,
}: CelebrationOverlayProps & { tokens: ReturnType<typeof useTheme>['tokens'] }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 3500)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDismiss])

  const lines = [
    type === 'levelup'
      ? `✓ level_up() // level ${newLevel} — ${getLevelTitle(newLevel ?? 1)}`
      : type === 'badge'
      ? `✓ badge.earned() // ${badgeName}`
      : '✓ lesson.complete()',
    `✓ xp.award(${xpEarned}) // total XP updated`,
    '✓ streak.increment()',
    '✓ leaderboard.sync()',
    '> press any key to continue...',
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onDismiss}
    >
      <div className="font-mono text-sm text-primary p-8 max-w-lg w-full">
        {lines.map((line, i) => (
          <p key={i} className="leading-loose" style={{ animationDelay: `${i * 0.2}s` }}>
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run tests + build**

```bash
npm test -- --run && npm run build
```

Expected: All tests pass, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/features/gamification/components/
git commit -m "feat: add CelebrationOverlay with confetti/toast/terminal theme variants"
```

---

## Task 10: ModuleMapPage + LessonPage

**Files:**
- Create: `src/features/curriculum/pages/ModuleMapPage.tsx`
- Create: `src/features/curriculum/pages/LessonPage.tsx`

The `LessonPage` orchestrates the full learning flow: content → quiz → (optional) project → XP award → celebration. If the lesson is already completed, it shows the content in read-only mode without re-awarding XP.

- [ ] **Step 1: Create `src/features/curriculum/pages/ModuleMapPage.tsx`**

```typescript
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/theme/ThemeContext'
import { ModuleMap } from '../components/ModuleMap'

export function ModuleMapPage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-text-base">React Academy</h1>
          <div className="flex items-center gap-3">
            <span className="text-text-muted text-sm hidden sm:block">{user?.display_name}</span>
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
            <button
              onClick={signOut}
              className="text-sm text-text-muted hover:text-error transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-text-base">Your Curriculum</h2>
          <p className="text-text-muted mt-1">Complete modules in order to unlock the full stack.</p>
        </div>
        <ModuleMap />
      </main>

      {/* Footer */}
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

- [ ] **Step 2: Create `src/features/curriculum/pages/LessonPage.tsx`**

```typescript
import { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MODULES } from '@/data/curriculum'
import { ContentRenderer } from '../components/ContentRenderer'
import { QuizEngine } from '@/features/quiz/components/QuizEngine'
import { ProjectValidator } from '@/features/projects/components/ProjectValidator'
import { CelebrationOverlay } from '@/features/gamification/components/CelebrationOverlay'
import { useProgress } from '../hooks/useProgress'
import { useXP } from '@/features/gamification/hooks/useXP'
import type { UserProgressState } from '@/lib/types'

type LessonStep = 'content' | 'quiz' | 'project' | 'complete'

interface Celebration {
  type: 'lesson' | 'badge' | 'levelup'
  xpEarned: number
  newLevel?: number
  badgeName?: string
}

export function LessonPage() {
  const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>()
  const navigate = useNavigate()
  const {
    completedLessons, completedModules, quizScores, projectsPassed,
    completeLesson, saveQuizAttempt, completeProject,
  } = useProgress()
  const { awardXP } = useXP()

  const module = MODULES.find(m => m.id === moduleId)
  const lesson = module?.lessons.find(l => l.id === lessonId)

  const [step, setStep] = useState<LessonStep>('content')
  const [celebration, setCelebration] = useState<Celebration | null>(null)

  const handleDismiss = useCallback(() => {
    setCelebration(null)
    navigate('/')
  }, [navigate])

  if (!module || !lesson) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <p className="text-text-muted">Lesson not found.</p>
        <Link to="/" className="text-primary hover:underline">Back to modules</Link>
      </div>
    )
  }

  const alreadyCompleted = completedLessons.includes(lesson.id)

  const finishLesson = async (quizScore: number, bonusXP = 0) => {
    const { wasNew } = await completeLesson(lesson.id, module.id, lesson.xpReward)

    if (wasNew) {
      const totalXP = lesson.xpReward + (quizScore === 100 ? 50 : 0) + bonusXP
      // Build progress state with the newly completed lesson already included
      const newCompletedLessons = [...completedLessons, lesson.id]
      const newCompletedModules = completedModules.includes(module.id)
        ? completedModules
        : MODULES.find(m => m.id === module.id)?.lessons.every(l =>
            newCompletedLessons.includes(l.id)
          )
        ? [...completedModules, module.id]
        : completedModules

      const progress: UserProgressState = {
        completedLessons: newCompletedLessons,
        completedModules: newCompletedModules,
        quizScores: { ...quizScores, [lesson.id]: quizScore },
        projectsPassed,
        xp: 0, // useXP reads actual total from DB
        streak: 0,
        lessonsToday: newCompletedLessons.length,
      }

      const { newBadges, leveledUp, newLevel } = await awardXP(totalXP, progress)

      setCelebration({
        type: leveledUp ? 'levelup' : newBadges.length > 0 ? 'badge' : 'lesson',
        xpEarned: totalXP,
        newLevel: leveledUp ? newLevel : undefined,
        badgeName: newBadges[0]?.name,
      })
    }

    setStep('complete')
  }

  const handleQuizComplete = async (score: number, answers: string[]) => {
    await saveQuizAttempt(lesson.id, score, answers)
    if (lesson.project) {
      setStep('project')
    } else {
      await finishLesson(score)
    }
  }

  const handleProjectComplete = async (bonusXP: number) => {
    await completeProject(lesson.project!.id)
    // Re-use the best quiz score for this lesson (already saved)
    const quizScore = quizScores[lesson.id] ?? 0
    await finishLesson(quizScore, bonusXP + lesson.project!.xpReward)
  }

  return (
    <div className="min-h-screen bg-bg">
      {celebration && (
        <CelebrationOverlay {...celebration} onDismiss={handleDismiss} />
      )}

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3 text-sm">
          <Link to="/" className="text-text-muted hover:text-primary transition-colors">
            ← Modules
          </Link>
          <span className="text-border">/</span>
          <span className="text-text-muted">{module.title}</span>
          <span className="text-border">/</span>
          <span className="text-text-base font-medium truncate">{lesson.title}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Lesson meta */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-base">{lesson.title}</h1>
          <p className="text-text-muted text-sm mt-1">
            {lesson.duration} min · {lesson.xpReward} XP
            {alreadyCompleted && (
              <span className="ml-2 text-success font-semibold">✓ Completed</span>
            )}
          </p>
        </div>

        {/* Step: Content */}
        {step === 'content' && (
          <>
            <ContentRenderer blocks={lesson.content} />
            <div className="mt-10 pt-8 border-t border-border">
              {alreadyCompleted ? (
                <div className="flex gap-3">
                  <Link
                    to="/"
                    className="px-5 py-2.5 rounded-theme border border-border text-text-muted hover:border-primary hover:text-primary transition-colors text-sm"
                  >
                    ← Back to Modules
                  </Link>
                  <button
                    type="button"
                    onClick={() => setStep('quiz')}
                    className="px-5 py-2.5 rounded-theme border border-border text-text-muted hover:border-primary hover:text-primary transition-colors text-sm"
                  >
                    Review Quiz
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep('quiz')}
                  className="px-6 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors"
                >
                  Take the Quiz →
                </button>
              )}
            </div>
          </>
        )}

        {/* Step: Quiz */}
        {step === 'quiz' && (
          <QuizEngine
            questions={lesson.quiz}
            onComplete={alreadyCompleted
              ? (_score, _answers) => navigate('/')
              : handleQuizComplete}
          />
        )}

        {/* Step: Project */}
        {step === 'project' && lesson.project && (
          <ProjectValidator
            project={lesson.project}
            onComplete={handleProjectComplete}
          />
        )}

        {/* Step: Complete (waiting for celebration to dismiss) */}
        {step === 'complete' && !celebration && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">✅</p>
            <h2 className="text-xl font-semibold text-text-base">Lesson Complete!</h2>
            <Link
              to="/"
              className="inline-block mt-6 px-6 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors"
            >
              Back to Modules
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Run tests + build**

```bash
npm test -- --run && npm run build
```

Expected: All tests pass, clean build.

- [ ] **Step 4: Commit**

```bash
git add src/features/curriculum/pages/
git commit -m "feat: add ModuleMapPage and LessonPage with full lesson flow"
```

---

## Task 11: Wire App router + final verification

**Files:**
- Modify: `src/main.tsx` — add `ProgressProvider`
- Modify: `src/App.tsx` — replace stub, add lesson route, add bug-report redirect stub
- Delete: `src/pages/ModuleMapStub.tsx`

- [ ] **Step 1: Update `src/main.tsx`**

Add `ProgressProvider` inside `AuthProvider`. The complete file:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/theme/ThemeContext'
import { AuthProvider } from '@/features/auth/hooks/useAuth'
import { ProgressProvider } from '@/features/curriculum/hooks/useProgress'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ProgressProvider>
            <App />
          </ProgressProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 2: Update `src/App.tsx`**

Replace the entire file:

```typescript
import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { AuthPage } from '@/features/auth/pages/AuthPage'
import { OnboardingPage } from '@/features/auth/pages/OnboardingPage'
import { ModuleMapPage } from '@/features/curriculum/pages/ModuleMapPage'
import { LessonPage } from '@/features/curriculum/pages/LessonPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ModuleMapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/module/:moduleId/lesson/:lessonId"
        element={
          <ProtectedRoute>
            <LessonPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
```

- [ ] **Step 3: Delete `src/pages/ModuleMapStub.tsx`**

```bash
cd "C:\Users\johns\Full Stack AI Assisted Projects\React learning App"
rm src/pages/ModuleMapStub.tsx
```

- [ ] **Step 4: Run the full test suite**

```bash
npm test -- --run
```

Expected: All tests pass. (At this point there should be 30+ tests across 7+ test files.)

- [ ] **Step 5: Run a production build**

```bash
npm run build
```

Expected: `dist/` created with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/main.tsx src/App.tsx
git rm src/pages/ModuleMapStub.tsx
git commit -m "feat: wire Phase 2 router — ModuleMapPage and LessonPage replace stub"
```

- [ ] **Step 7: Push to GitHub**

```bash
git push origin master
```

Expected: All Phase 2 commits pushed to `https://github.com/mikejhenry/react-academy.git`.

---

## Phase 2 Complete

At this point:
- ✅ ProgressProvider loads and syncs all learning state from Supabase
- ✅ 19 module cards displayed with sequential lock logic
- ✅ All 6 content block types rendered in lessons
- ✅ Quiz engine with MC/true-false/fill-blank, 60% pass threshold, perfect-score bonus
- ✅ Project validator with paste-to-verify and multi-rule scoring
- ✅ XP awarded, badges evaluated and written to DB, streak updated after each completion
- ✅ Theme-aware celebration (confetti / toast / terminal)
- ✅ All tests passing, production build clean

**Next: Phase 3 — Leaderboard, Profile Page, Comments, Bug Reporting**
See `docs/superpowers/plans/2026-04-02-phase-3-social-profile.md`

---

## Cross-Phase Notes

- **Quiz scoring:** `scoreQuiz` returns `score` as `Math.round((correct/total)*100)`. Perfect = 100. Passed to `saveQuizAttempt` and used to compute `+50 bonus XP` if `score === 100`.
- **XP formula:** `totalXP = lesson.xpReward + (score === 100 ? 50 : 0) + bonusXP`. `bonusXP` = project bonus validators + `project.xpReward` if project completed.
- **`leaderboard_cache` upsert conflict key:** `user_id`. Ensure Supabase has a unique constraint on `leaderboard_cache.user_id` (created in Phase 1 schema migration).
- **`streaks` upsert conflict key:** `user_id`. Ensure unique constraint exists (created in Phase 1 schema migration).
- **Lessons with projects:** In Phase 2, no lesson in the stub modules 6–19 has a project. Only add projects when full lesson content is added in a future content sprint.
- **`/report-bug` route:** Added as a `<Link>` in `ModuleMapPage` footer but the route is not yet implemented — it will land on `NotFoundPage` until Phase 3 adds the `BugReportPage`.
