# Lesson Picker / Module Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user clicks a module card on the Module Map, the card expands inline to reveal a scrollable list of all lessons with their completed / current / locked state — clicking again collapses it.

**Architecture:** `expandedIds: Set<string>` is lifted to `ModuleMap`, which passes `isExpanded`, `onToggle`, and `completedLessons` down to each `ModuleCard`. A new pure utility `getLessonStatuses` derives lesson state; a new `LessonRow` component renders each row. Locked module cards are unchanged.

**Tech Stack:** React 18, TypeScript (strict), Tailwind CSS v3, React Router v6, Vitest + @testing-library/react

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/features/curriculum/utils/getLessonStatuses.ts` | Pure function: derives completed / current / locked per lesson |
| Create | `src/features/curriculum/utils/getLessonStatuses.test.ts` | Unit tests for the above |
| Create | `src/features/curriculum/components/LessonRow.tsx` | Renders one lesson row (Link or div depending on status) |
| Create | `src/features/curriculum/components/LessonRow.test.tsx` | Component tests for the above |
| Modify | `src/features/curriculum/components/ModuleCard.tsx` | Add expansion props; toggle button; conditional lesson list vs progress bar |
| Create | `src/features/curriculum/components/ModuleCard.test.tsx` | Component tests for all card states |
| Modify | `src/features/curriculum/components/ModuleMap.tsx` | Add `expandedIds` state + `handleToggle`; pass new props to each `ModuleCard` |
| Modify | `src/features/curriculum/components/ModuleMap.test.tsx` | Update + extend integration tests |

---

## Task 1: `getLessonStatuses` — pure utility

**Files:**
- Create: `src/features/curriculum/utils/getLessonStatuses.ts`
- Create: `src/features/curriculum/utils/getLessonStatuses.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/curriculum/utils/getLessonStatuses.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getLessonStatuses } from './getLessonStatuses'
import type { Lesson } from '@/lib/types'

const makeLessons = (ids: string[]): Lesson[] =>
  ids.map(id => ({
    id,
    title: `Lesson ${id}`,
    duration: 10,
    xpReward: 100,
    content: [],
    quiz: [],
  }))

describe('getLessonStatuses', () => {
  it('marks all as completed when all IDs are in completedLessons', () => {
    const lessons = makeLessons(['1.1', '1.2', '1.3'])
    const result = getLessonStatuses(lessons, ['1.1', '1.2', '1.3'])
    expect(result.map(r => r.status)).toEqual(['completed', 'completed', 'completed'])
  })

  it('makes first lesson current and rest locked when none are completed', () => {
    const lessons = makeLessons(['1.1', '1.2', '1.3'])
    const result = getLessonStatuses(lessons, [])
    expect(result.map(r => r.status)).toEqual(['current', 'locked', 'locked'])
  })

  it('handles partial progress: 2 of 5 completed', () => {
    const lessons = makeLessons(['1.1', '1.2', '1.3', '1.4', '1.5'])
    const result = getLessonStatuses(lessons, ['1.1', '1.2'])
    expect(result.map(r => r.status)).toEqual(['completed', 'completed', 'current', 'locked', 'locked'])
  })

  it('returns single lesson as current when not completed', () => {
    const lessons = makeLessons(['1.1'])
    const result = getLessonStatuses(lessons, [])
    expect(result.map(r => r.status)).toEqual(['current'])
  })

  it('returns single lesson as completed when in completedLessons', () => {
    const lessons = makeLessons(['1.1'])
    const result = getLessonStatuses(lessons, ['1.1'])
    expect(result.map(r => r.status)).toEqual(['completed'])
  })

  it('treats undefined completedLessons as empty array', () => {
    const lessons = makeLessons(['1.1', '1.2'])
    const result = getLessonStatuses(lessons, undefined)
    expect(result.map(r => r.status)).toEqual(['current', 'locked'])
  })

  it('preserves lesson objects in the returned array', () => {
    const lessons = makeLessons(['1.1', '1.2'])
    const result = getLessonStatuses(lessons, ['1.1'])
    expect(result[0].lesson).toBe(lessons[0])
    expect(result[1].lesson).toBe(lessons[1])
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```
npm test -- src/features/curriculum/utils/getLessonStatuses.test.ts
```

Expected: FAIL — `getLessonStatuses` not found.

- [ ] **Step 3: Implement the utility**

Create `src/features/curriculum/utils/getLessonStatuses.ts`:

```ts
import type { Lesson } from '@/lib/types'

export type LessonStatus = 'completed' | 'current' | 'locked'

export interface LessonWithStatus {
  lesson: Lesson
  status: LessonStatus
}

export function getLessonStatuses(
  lessons: Lesson[],
  completedLessons: string[] | undefined,
): LessonWithStatus[] {
  const completed = completedLessons ?? []
  let foundCurrent = false
  return lessons.map(lesson => {
    if (completed.includes(lesson.id)) {
      return { lesson, status: 'completed' }
    }
    if (!foundCurrent) {
      foundCurrent = true
      return { lesson, status: 'current' }
    }
    return { lesson, status: 'locked' }
  })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```
npm test -- src/features/curriculum/utils/getLessonStatuses.test.ts
```

Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```
git add src/features/curriculum/utils/getLessonStatuses.ts src/features/curriculum/utils/getLessonStatuses.test.ts
git commit -m "feat: add getLessonStatuses pure utility with tests"
```

---

## Task 2: `LessonRow` — new component

**Files:**
- Create: `src/features/curriculum/components/LessonRow.tsx`
- Create: `src/features/curriculum/components/LessonRow.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/curriculum/components/LessonRow.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LessonRow } from './LessonRow'
import type { Lesson } from '@/lib/types'

const lesson: Lesson = {
  id: '1.1',
  title: 'What is HTML?',
  duration: 10,
  xpReward: 100,
  content: [],
  quiz: [],
}

describe('LessonRow', () => {
  it('completed row renders as a link', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="completed" />
      </MemoryRouter>
    )
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('completed row links to the correct lesson URL', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="completed" />
      </MemoryRouter>
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/module/1/lesson/1.1')
  })

  it('completed row shows checkmark icon', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="completed" />
      </MemoryRouter>
    )
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('current row renders as a link', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="current" />
      </MemoryRouter>
    )
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('current row shows play icon', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="current" />
      </MemoryRouter>
    )
    expect(screen.getByText('▶')).toBeInTheDocument()
  })

  it('locked row renders as a div (not a link)', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="locked" />
      </MemoryRouter>
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('locked row shows lock icon', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="locked" />
      </MemoryRouter>
    )
    expect(screen.getByText('🔒')).toBeInTheDocument()
  })

  it('shows duration and XP on all rows', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="locked" />
      </MemoryRouter>
    )
    expect(screen.getByText('10m · 100xp')).toBeInTheDocument()
  })

  it('shows the lesson title', () => {
    render(
      <MemoryRouter>
        <LessonRow lesson={lesson} moduleId="1" status="current" />
      </MemoryRouter>
    )
    expect(screen.getByText('What is HTML?')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```
npm test -- src/features/curriculum/components/LessonRow.test.tsx
```

Expected: FAIL — `LessonRow` not found.

- [ ] **Step 3: Implement `LessonRow`**

Create `src/features/curriculum/components/LessonRow.tsx`:

```tsx
import { Link } from 'react-router-dom'
import type { Lesson } from '@/lib/types'
import type { LessonStatus } from '../utils/getLessonStatuses'

interface LessonRowProps {
  lesson: Lesson
  moduleId: string
  status: LessonStatus
}

export function LessonRow({ lesson, moduleId, status }: LessonRowProps) {
  const href = `/module/${moduleId}/lesson/${lesson.id}`

  const icon =
    status === 'completed' ? (
      <span className="text-success text-xs flex-shrink-0">✓</span>
    ) : status === 'current' ? (
      <span className="text-primary text-xs flex-shrink-0">▶</span>
    ) : (
      <span className="text-xs flex-shrink-0">🔒</span>
    )

  const titleClass =
    status === 'current'
      ? 'text-xs flex-1 font-semibold text-text-base'
      : status === 'completed'
        ? 'text-xs flex-1 text-text-base'
        : 'text-xs flex-1 text-text-muted'

  const meta = (
    <span className="text-text-muted text-[9px] flex-shrink-0">
      {lesson.duration}m · {lesson.xpReward}xp
    </span>
  )

  if (status === 'locked') {
    return (
      <div className="flex items-center gap-2 border border-white/[0.06] rounded-md px-2.5 py-2 opacity-40 cursor-not-allowed">
        {icon}
        <span className={titleClass}>{lesson.title}</span>
        {meta}
      </div>
    )
  }

  const rowClass =
    status === 'completed'
      ? 'flex items-center gap-2 bg-success/[0.08] border border-success/25 hover:border-success/50 rounded-md px-2.5 py-2'
      : 'flex items-center gap-2 bg-primary/15 border border-primary/55 rounded-md px-2.5 py-2'

  return (
    <Link to={href} className={rowClass}>
      {icon}
      <span className={titleClass}>{lesson.title}</span>
      {meta}
    </Link>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```
npm test -- src/features/curriculum/components/LessonRow.test.tsx
```

Expected: 9 tests PASS.

- [ ] **Step 5: Commit**

```
git add src/features/curriculum/components/LessonRow.tsx src/features/curriculum/components/LessonRow.test.tsx
git commit -m "feat: add LessonRow component with completed/current/locked states"
```

---

## Task 3: Update `ModuleCard`

**Files:**
- Modify: `src/features/curriculum/components/ModuleCard.tsx`
- Create: `src/features/curriculum/components/ModuleCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/curriculum/components/ModuleCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ModuleCard } from './ModuleCard'
import type { Module } from '@/lib/types'

const module: Module = {
  id: '1',
  title: 'HTML Fundamentals',
  icon: '🌐',
  description: 'Learn the building blocks.',
  lessons: [
    { id: '1.1', title: 'What is HTML?', duration: 10, xpReward: 100, content: [], quiz: [] },
    { id: '1.2', title: 'Document Structure', duration: 12, xpReward: 100, content: [], quiz: [] },
    { id: '1.3', title: 'Semantic Elements', duration: 15, xpReward: 100, content: [], quiz: [] },
  ],
}

const baseProps = {
  module,
  isUnlocked: true,
  completedLessonCount: 1,
  isComplete: false,
  nextLessonId: '1.2',
  isExpanded: false,
  onToggle: vi.fn(),
  completedLessons: ['1.1'],
}

describe('ModuleCard', () => {
  it('collapsed state shows progress bar hint text', () => {
    render(<MemoryRouter><ModuleCard {...baseProps} /></MemoryRouter>)
    expect(screen.getByText('Click to see lessons ▾')).toBeInTheDocument()
  })

  it('collapsed state shows lesson count', () => {
    render(<MemoryRouter><ModuleCard {...baseProps} /></MemoryRouter>)
    expect(screen.getByText('1/3 lessons')).toBeInTheDocument()
  })

  it('expanded state shows lesson list', () => {
    render(<MemoryRouter><ModuleCard {...baseProps} isExpanded={true} /></MemoryRouter>)
    expect(screen.getByText('What is HTML?')).toBeInTheDocument()
    expect(screen.getByText('Document Structure')).toBeInTheDocument()
    expect(screen.getByText('Semantic Elements')).toBeInTheDocument()
  })

  it('expanded state hides progress bar hint', () => {
    render(<MemoryRouter><ModuleCard {...baseProps} isExpanded={true} /></MemoryRouter>)
    expect(screen.queryByText('Click to see lessons ▾')).not.toBeInTheDocument()
  })

  it('toggle button calls onToggle with the module id', () => {
    const onToggle = vi.fn()
    render(<MemoryRouter><ModuleCard {...baseProps} onToggle={onToggle} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith('1')
  })

  it('locked card renders no button', () => {
    render(
      <MemoryRouter>
        <ModuleCard {...baseProps} isUnlocked={false} />
      </MemoryRouter>
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('locked card shows lock icon', () => {
    render(
      <MemoryRouter>
        <ModuleCard {...baseProps} isUnlocked={false} />
      </MemoryRouter>
    )
    expect(screen.getByLabelText('Locked')).toBeInTheDocument()
  })

  it('expanded card shows up-chevron', () => {
    render(<MemoryRouter><ModuleCard {...baseProps} isExpanded={true} /></MemoryRouter>)
    expect(screen.getByText('▴')).toBeInTheDocument()
  })

  it('collapsed card shows down-chevron', () => {
    render(<MemoryRouter><ModuleCard {...baseProps} isExpanded={false} /></MemoryRouter>)
    expect(screen.getByText('▾')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```
npm test -- src/features/curriculum/components/ModuleCard.test.tsx
```

Expected: most tests FAIL — `onToggle`, `isExpanded`, `completedLessons` props not yet on `ModuleCard`.

- [ ] **Step 3: Rewrite `ModuleCard`**

Replace the entire contents of `src/features/curriculum/components/ModuleCard.tsx`:

```tsx
import type { Module } from '@/lib/types'
import { getLessonStatuses } from '../utils/getLessonStatuses'
import { LessonRow } from './LessonRow'

interface ModuleCardProps {
  module: Module
  isUnlocked: boolean
  completedLessonCount: number
  isComplete: boolean
  nextLessonId: string
  isExpanded: boolean
  onToggle: (moduleId: string) => void
  completedLessons: string[]
}

export function ModuleCard({
  module,
  isUnlocked,
  completedLessonCount,
  isComplete,
  nextLessonId: _nextLessonId,
  isExpanded,
  onToggle,
  completedLessons,
}: ModuleCardProps) {
  const totalLessons = module.lessons.length
  const progress =
    totalLessons > 0 ? Math.round((completedLessonCount / totalLessons) * 100) : 0

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

  const lessonStatuses = getLessonStatuses(module.lessons, completedLessons)

  return (
    <div
      className={`bg-card rounded-theme p-5 border-2 transition-all ${
        isExpanded ? 'border-primary' : isComplete ? 'border-success' : 'border-border'
      }`}
    >
      <button
        className="w-full flex items-center gap-3 mb-3 cursor-pointer text-left"
        onClick={() => onToggle(module.id)}
        aria-expanded={isExpanded}
      >
        <span className="text-3xl">{module.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-base text-sm leading-snug">{module.title}</h3>
          <p className="text-text-muted text-xs">{completedLessonCount}/{totalLessons} completed</p>
        </div>
        <span className="text-text-muted text-xs" aria-hidden="true">
          {isExpanded ? '▴' : '▾'}
        </span>
      </button>

      {isExpanded ? (
        <div className="flex flex-col gap-1.5 border-t border-white/[0.07] pt-2.5">
          {lessonStatuses.map(({ lesson, status }) => (
            <LessonRow key={lesson.id} lesson={lesson} moduleId={module.id} status={status} />
          ))}
        </div>
      ) : (
        <>
          <p className="text-text-muted text-xs mb-4 line-clamp-2">{module.description}</p>
          <div>
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
          <p className="text-text-muted text-[10px] mt-2.5">Click to see lessons ▾</p>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```
npm test -- src/features/curriculum/components/ModuleCard.test.tsx
```

Expected: 9 tests PASS.

- [ ] **Step 5: Commit**

```
git add src/features/curriculum/components/ModuleCard.tsx src/features/curriculum/components/ModuleCard.test.tsx
git commit -m "feat: add expansion behavior to ModuleCard with lesson list"
```

---

## Task 4: Update `ModuleMap`

**Files:**
- Modify: `src/features/curriculum/components/ModuleMap.tsx`
- Modify: `src/features/curriculum/components/ModuleMap.test.tsx`

- [ ] **Step 1: Update the existing `ModuleMap` tests**

Replace the entire contents of `src/features/curriculum/components/ModuleMap.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ModuleMap } from './ModuleMap'

vi.mock('@/features/curriculum/hooks/useProgress', () => ({
  useProgress: () => ({
    completedLessons: [],
    completedModules: [],
    loading: false,
    isModuleUnlockedForUser: (id: string) => id === '1' || id === '2',
  }),
}))

describe('ModuleMap', () => {
  it('renders all 19 module cards', () => {
    render(<MemoryRouter><ModuleMap /></MemoryRouter>)
    expect(screen.getByText('HTML Fundamentals')).toBeInTheDocument()
    expect(screen.getByText('Capstone Project')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Locked').length).toBe(17)
  })

  it('unlocked cards render toggle buttons', () => {
    render(<MemoryRouter><ModuleMap /></MemoryRouter>)
    expect(screen.getAllByRole('button').length).toBe(2)
  })

  it('clicking a card header expands the module', () => {
    render(<MemoryRouter><ModuleMap /></MemoryRouter>)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByText('What is HTML?')).toBeInTheDocument()
  })

  it('clicking an expanded card header collapses it', () => {
    render(<MemoryRouter><ModuleMap /></MemoryRouter>)
    const button = screen.getAllByRole('button')[0]
    fireEvent.click(button)
    expect(screen.getByText('What is HTML?')).toBeInTheDocument()
    fireEvent.click(button)
    expect(screen.queryByText('What is HTML?')).not.toBeInTheDocument()
  })

  it('two cards can be expanded simultaneously', () => {
    render(<MemoryRouter><ModuleMap /></MemoryRouter>)
    const [btn1, btn2] = screen.getAllByRole('button')
    fireEvent.click(btn1)
    fireEvent.click(btn2)
    // Both expanded: both lesson lists visible
    expect(screen.getByText('What is HTML?')).toBeInTheDocument()
    // Module 2 first lesson title
    expect(screen.getByText('Introduction to CSS')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify the new tests fail**

```
npm test -- src/features/curriculum/components/ModuleMap.test.tsx
```

Expected: several tests FAIL because `ModuleMap` doesn't pass `isExpanded`/`onToggle`/`completedLessons` to `ModuleCard` yet.

- [ ] **Step 3: Update `ModuleMap`**

Replace the entire contents of `src/features/curriculum/components/ModuleMap.tsx`:

```tsx
import { useState } from 'react'
import { MODULES } from '@/data/curriculum'
import { ModuleCard } from './ModuleCard'
import { useProgress } from '../hooks/useProgress'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

export function ModuleMap() {
  const { completedLessons, completedModules, isModuleUnlockedForUser, loading } = useProgress()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function handleToggle(moduleId: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId)
      return next
    })
  }

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
            nextLessonId={nextLesson?.id ?? ''}
            isExpanded={expandedIds.has(module.id)}
            onToggle={handleToggle}
            completedLessons={completedLessons}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Check the first lesson title of module 2**

Before running tests, verify the title of the first lesson in module 2 in `src/data/curriculum.ts`. Search for the module with `id: '2'` and note the `title` of its first lesson. If it differs from `'Introduction to CSS'`, update that string in the test written in Step 1 to match exactly.

- [ ] **Step 5: Run all tests — verify they pass**

```
npm test
```

Expected: all tests PASS (no regressions).

- [ ] **Step 6: Commit**

```
git add src/features/curriculum/components/ModuleMap.tsx src/features/curriculum/components/ModuleMap.test.tsx
git commit -m "feat: wire up module expansion state in ModuleMap"
```

---

## Task 5: Final verification

- [ ] **Step 1: Run the full test suite one more time**

```
npm test
```

Expected: all tests PASS.

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit if any fixes were needed**

If type-check revealed issues, fix them, then:

```
git add -p
git commit -m "fix: type errors from lesson picker feature"
```
