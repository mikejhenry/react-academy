# Phase 3 — Profile, Leaderboard, Comments & Bug Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the social and profile layer: per-lesson comment threads, four-board leaderboard, a full profile page (XP/level/badges/stats/settings/inbox), bug reporting, and navigation linking everything together.

**Architecture:** Each feature lives in its own folder under `src/features/` (comments, leaderboard, profile, bugreport). The comment system uses a `useComments` hook per lesson. The leaderboard reads from `leaderboard_cache` for XP/streak boards and computes quiz accuracy and lesson counts from raw tables client-side. The profile page composes five sub-components and two hooks (`useProgresss` already exists; `useProfileStats` is new for XP/streak/badges).

**Tech Stack:** React 18, TypeScript strict, Supabase JS v2, React Router v6, Tailwind CSS v3, Vitest (for pure utility tests only)

---

## File Map

```
Create: src/features/comments/utils/formatRelativeTime.ts
Create: src/features/comments/utils/formatRelativeTime.test.ts
Create: src/features/comments/hooks/useComments.ts
Create: src/features/comments/components/CommentForm.tsx
Create: src/features/comments/components/ReportModal.tsx
Create: src/features/comments/components/CommentItem.tsx
Create: src/features/comments/components/CommentSection.tsx
Create: src/features/leaderboard/hooks/useLeaderboard.ts
Create: src/features/leaderboard/components/LeaderboardTable.tsx
Create: src/features/leaderboard/pages/LeaderboardPage.tsx
Create: src/features/profile/hooks/useProfileStats.ts
Create: src/features/profile/components/XPProgressBar.tsx
Create: src/features/profile/components/BadgeGrid.tsx
Create: src/features/profile/components/StatsPanel.tsx
Create: src/features/profile/components/StreakDisplay.tsx
Create: src/features/profile/components/ProfileInbox.tsx
Create: src/features/profile/components/ContactModeratorForm.tsx
Create: src/features/profile/components/ProfileSettings.tsx
Create: src/features/profile/pages/ProfilePage.tsx
Create: src/features/bugreport/pages/BugReportPage.tsx
Modify: src/App.tsx  (add /profile, /leaderboard, /report-bug routes)
Modify: src/features/curriculum/pages/ModuleMapPage.tsx  (add profile/leaderboard nav links)
Modify: src/features/curriculum/pages/LessonPage.tsx  (add <CommentSection> at bottom)
```

---

## Key interfaces used throughout

Read `src/lib/types.ts` before starting. The relevant existing types are:
- `UserProfile` — id, email, display_name, avatar_url, theme, role
- `Theme` — `'fun' | 'pro' | 'dev'`
- `UserProgressState` — completedLessons, completedModules, xp, streak, quizScores, lessonsToday, projectsPassed
- `Badge` — id, name, description, icon, condition(progress)

Existing hooks:
- `useAuth()` → `{ user: UserProfile | null, signOut, updateProfile, ... }` from `src/features/auth/hooks/useAuth.tsx`
- `useTheme()` → `{ theme, setTheme, tokens }` from `src/theme/ThemeContext.tsx`
- `useProgress()` → `{ completedLessons, completedModules, quizScores, projectsPassed, loading }` from `src/features/curriculum/hooks/useProgress.tsx`
- `BADGES`, `getLevelTitle`, `getLevel`, `getXPForNextLevel` from `src/data/achievements.ts`
- `supabase` client from `src/lib/supabase.ts`
- `LoadingSpinner` from `src/shared/components/LoadingSpinner.tsx`

**Supabase `leaderboard_cache` columns** (as written by `useXP`): `user_id`, `xp`, `streak`, `last_activity_date`, `level`

---

## Task 1: formatRelativeTime utility + tests

**Files:**
- Create: `src/features/comments/utils/formatRelativeTime.ts`
- Create: `src/features/comments/utils/formatRelativeTime.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/comments/utils/formatRelativeTime.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatRelativeTime } from './formatRelativeTime'

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-15T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for < 60 seconds ago', () => {
    expect(formatRelativeTime('2024-03-15T11:59:30Z')).toBe('just now')
  })

  it('returns minutes for < 1 hour ago', () => {
    expect(formatRelativeTime('2024-03-15T11:30:00Z')).toBe('30m ago')
  })

  it('returns hours for < 24 hours ago', () => {
    expect(formatRelativeTime('2024-03-15T08:00:00Z')).toBe('4h ago')
  })

  it('returns "yesterday" for exactly 1 day ago', () => {
    expect(formatRelativeTime('2024-03-14T12:00:00Z')).toBe('yesterday')
  })

  it('returns days for 2-6 days ago', () => {
    expect(formatRelativeTime('2024-03-12T12:00:00Z')).toBe('3d ago')
  })

  it('returns weeks for 7-29 days ago', () => {
    expect(formatRelativeTime('2024-03-08T12:00:00Z')).toBe('1w ago')
  })

  it('returns months for >= 30 days ago', () => {
    expect(formatRelativeTime('2024-02-14T12:00:00Z')).toBe('1mo ago')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "C:\Users\johns\Full Stack AI Assisted Projects\React learning App"
npx vitest run src/features/comments/utils/formatRelativeTime.test.ts
```

Expected: FAIL — `Cannot find module './formatRelativeTime'`

- [ ] **Step 3: Implement formatRelativeTime**

```typescript
// src/features/comments/utils/formatRelativeTime.ts
export function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/features/comments/utils/formatRelativeTime.test.ts
```

Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/comments/utils/formatRelativeTime.ts src/features/comments/utils/formatRelativeTime.test.ts
git commit -m "feat: add formatRelativeTime utility with tests"
```

---

## Task 2: useComments hook

**Files:**
- Create: `src/features/comments/hooks/useComments.ts`

No unit tests (all Supabase I/O — covered by manual testing).

- [ ] **Step 1: Create the hook**

```typescript
// src/features/comments/hooks/useComments.ts
import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'

export interface CommentUser {
  display_name: string
  avatar_url: string | null
}

export interface Comment {
  id: string
  user_id: string
  lesson_id: string
  content: string
  is_hidden: boolean
  created_at: string
  users: CommentUser
}

export function useComments(lessonId: string) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [timeoutExpiry, setTimeoutExpiry] = useState<string | null>(null)

  // Check for active comment timeout on mount
  useEffect(() => {
    if (!user) return
    async function checkTimeout() {
      const { data } = await supabase
        .from('comment_timeouts')
        .select('expires_at')
        .eq('user_id', user!.id)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle()
      if (data) {
        setIsTimedOut(true)
        setTimeoutExpiry((data as { expires_at: string }).expires_at)
      }
    }
    checkTimeout()
  }, [user?.id])

  const loadComments = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('id, user_id, lesson_id, content, is_hidden, created_at, users!user_id(display_name, avatar_url)')
      .eq('lesson_id', lessonId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50)
    setComments((data ?? []) as Comment[])
    setLoading(false)
  }, [lessonId])

  const addComment = async (content: string): Promise<boolean> => {
    if (!user) return false
    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      lesson_id: lessonId,
      content,
    })
    if (!error) await loadComments()
    return !error
  }

  const deleteComment = async (commentId: string): Promise<void> => {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const reportComment = async (commentId: string, reason: string): Promise<boolean> => {
    if (!user) return false
    const { error } = await supabase.from('comment_reports').insert({
      comment_id: commentId,
      reported_by: user.id,
      reason,
    })
    return !error
  }

  return {
    comments,
    loading,
    loadComments,
    addComment,
    deleteComment,
    reportComment,
    isTimedOut,
    timeoutExpiry,
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd "C:\Users\johns\Full Stack AI Assisted Projects\React learning App"
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/features/comments/hooks/useComments.ts
git commit -m "feat: add useComments hook for per-lesson comment CRUD and timeout detection"
```

---

## Task 3: CommentForm + ReportModal components

**Files:**
- Create: `src/features/comments/components/CommentForm.tsx`
- Create: `src/features/comments/components/ReportModal.tsx`

- [ ] **Step 1: Create CommentForm**

```typescript
// src/features/comments/components/CommentForm.tsx
import { useState } from 'react'

interface CommentFormProps {
  onSubmit: (content: string) => Promise<boolean>
  isTimedOut: boolean
  timeoutExpiry: string | null
}

export function CommentForm({ onSubmit, isTimedOut, timeoutExpiry }: CommentFormProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isTimedOut) {
    return (
      <div className="p-3 rounded-theme bg-bg-secondary border border-error text-sm text-error">
        You are temporarily restricted from commenting
        {timeoutExpiry && ` until ${new Date(timeoutExpiry).toLocaleString()}`}.
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    const ok = await onSubmit(content.trim())
    if (ok) setContent('')
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Share your thoughts or ask a question..."
        rows={3}
        className="w-full px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary resize-y"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-4 py-2 rounded-theme bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create ReportModal**

```typescript
// src/features/comments/components/ReportModal.tsx

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'gives_away_answer', label: 'Gives away quiz answer' },
  { value: 'other', label: 'Other' },
] as const

interface ReportModalProps {
  onReport: (reason: string) => void
  onClose: () => void
}

export function ReportModal({ onReport, onClose }: ReportModalProps) {
  const [selected, setSelected] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-theme p-6 w-full max-w-sm mx-4">
        <h3 className="text-text-base font-semibold mb-4">Report Comment</h3>
        <div className="flex flex-col gap-2 mb-4">
          {REPORT_REASONS.map(r => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={selected === r.value}
                onChange={() => setSelected(r.value)}
                className="accent-primary"
              />
              <span className="text-text-base text-sm">{r.label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-theme border border-border text-text-muted text-sm hover:border-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (selected) onReport(selected) }}
            disabled={!selected}
            className="px-4 py-2 rounded-theme bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Report
          </button>
        </div>
      </div>
    </div>
  )
}
```

Add the missing `import { useState } from 'react'` at the top of ReportModal.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/features/comments/components/CommentForm.tsx src/features/comments/components/ReportModal.tsx
git commit -m "feat: add CommentForm and ReportModal components"
```

---

## Task 4: CommentItem + CommentSection + LessonPage integration

**Files:**
- Create: `src/features/comments/components/CommentItem.tsx`
- Create: `src/features/comments/components/CommentSection.tsx`
- Modify: `src/features/curriculum/pages/LessonPage.tsx`

- [ ] **Step 1: Create CommentItem**

```typescript
// src/features/comments/components/CommentItem.tsx
import { useState } from 'react'
import type { Comment } from '../hooks/useComments'
import { ReportModal } from './ReportModal'
import { formatRelativeTime } from '../utils/formatRelativeTime'

interface CommentItemProps {
  comment: Comment
  currentUserId: string | null
  onDelete: (id: string) => void
  onReport: (id: string, reason: string) => void
}

export function CommentItem({ comment, currentUserId, onDelete, onReport }: CommentItemProps) {
  const [showReportModal, setShowReportModal] = useState(false)
  const initial = comment.users.display_name.charAt(0).toUpperCase()

  return (
    <>
      <div className="flex gap-3 py-3 border-b border-border last:border-0">
        <div className="w-8 h-8 rounded-full bg-border overflow-hidden shrink-0">
          {comment.users.avatar_url ? (
            <img src={comment.users.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-text-muted">
              {initial}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-text-base text-sm font-medium">{comment.users.display_name}</span>
            <span className="text-text-muted text-xs">{formatRelativeTime(comment.created_at)}</span>
          </div>
          <p className="text-text-base text-sm mt-1 break-words">{comment.content}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {comment.user_id === currentUserId ? (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-text-muted hover:text-error text-xs px-1 transition-colors"
              aria-label="Delete comment"
            >
              ✕
            </button>
          ) : (
            <button
              onClick={() => setShowReportModal(true)}
              className="text-text-muted hover:text-warning text-xs px-1 transition-colors"
              aria-label="Report comment"
            >
              ⚑
            </button>
          )}
        </div>
      </div>
      {showReportModal && (
        <ReportModal
          onReport={reason => { onReport(comment.id, reason); setShowReportModal(false) }}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Create CommentSection**

```typescript
// src/features/comments/components/CommentSection.tsx
import { useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { useComments } from '../hooks/useComments'
import { CommentForm } from './CommentForm'
import { CommentItem } from './CommentItem'

interface CommentSectionProps {
  lessonId: string
}

export function CommentSection({ lessonId }: CommentSectionProps) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const {
    comments,
    loading,
    loadComments,
    addComment,
    deleteComment,
    reportComment,
    isTimedOut,
    timeoutExpiry,
  } = useComments(lessonId)

  const handleToggle = () => {
    if (!expanded) {
      setExpanded(true)
      loadComments()
    } else {
      setExpanded(false)
    }
  }

  return (
    <div className="mt-12 border-t border-border pt-6">
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm font-medium"
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>{expanded ? 'Hide Discussion' : 'Show Discussion'}</span>
      </button>

      {expanded && (
        <div className="mt-4 flex flex-col gap-4">
          {user && (
            <CommentForm
              onSubmit={addComment}
              isTimedOut={isTimedOut}
              timeoutExpiry={timeoutExpiry}
            />
          )}

          {loading ? (
            <LoadingSpinner />
          ) : comments.length === 0 ? (
            <p className="text-text-muted text-sm">No comments yet. Be the first!</p>
          ) : (
            <div>
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id ?? null}
                  onDelete={deleteComment}
                  onReport={reportComment}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add CommentSection to LessonPage**

Open `src/features/curriculum/pages/LessonPage.tsx`. Read the current file first.

Add the import at the top (with other imports):
```typescript
import { CommentSection } from '@/features/comments/components/CommentSection'
```

Inside `<main>`, after the existing step conditionals (after the `step === 'complete'` block), add:
```tsx
{/* Comments — always visible once we have a valid lesson */}
{module && lesson && (
  <CommentSection lessonId={lesson.id} />
)}
```

- [ ] **Step 4: Run tests + type-check**

```bash
npx vitest run && npx tsc --noEmit
```

Expected: all tests pass, 0 TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/features/comments/components/CommentItem.tsx src/features/comments/components/CommentSection.tsx src/features/curriculum/pages/LessonPage.tsx
git commit -m "feat: add comment system — CommentItem, CommentSection, integrated into LessonPage"
```

---

## Task 5: useLeaderboard hook

**Files:**
- Create: `src/features/leaderboard/hooks/useLeaderboard.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/features/leaderboard/hooks/useLeaderboard.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getLevelTitle } from '@/data/achievements'

export type BoardType = 'xp' | 'streak' | 'quiz' | 'active'
export type ActivePeriod = 'all' | 'week'

export interface LeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  levelTitle: string
  value: number
  rank: number
}

interface UseLeaderboardResult {
  entries: LeaderboardEntry[]
  currentUserRank: number | null
  loading: boolean
}

// Supabase join row shapes
interface CacheRow {
  user_id: string
  xp: number
  streak: number
  level: number
  users: { display_name: string; avatar_url: string | null }
}

interface QuizAttemptRow {
  user_id: string
  score: number
  users: { display_name: string; avatar_url: string | null }
}

interface ProgressRow {
  user_id: string
  lesson_id: string
  completed_at: string
  users: { display_name: string; avatar_url: string | null }
}

export function useLeaderboard(
  board: BoardType,
  activePeriod: ActivePeriod = 'all'
): UseLeaderboardResult {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      if (board === 'xp' || board === 'streak') {
        const sortField = board === 'xp' ? 'xp' : 'streak'
        const { data } = await supabase
          .from('leaderboard_cache')
          .select('user_id, xp, streak, level, users!user_id(display_name, avatar_url)')
          .order(sortField, { ascending: false })

        const rows = (data ?? []) as CacheRow[]
        setEntries(
          rows.map((row, i) => ({
            userId: row.user_id,
            displayName: row.users?.display_name ?? 'Unknown',
            avatarUrl: row.users?.avatar_url ?? null,
            levelTitle: getLevelTitle(row.level ?? 1),
            value: board === 'xp' ? (row.xp ?? 0) : (row.streak ?? 0),
            rank: i + 1,
          }))
        )
      }

      if (board === 'quiz') {
        // Fetch all quiz attempts with user info
        const { data: quizData } = await supabase
          .from('quiz_attempts')
          .select('user_id, score, users!user_id(display_name, avatar_url)')

        // Fetch level info from leaderboard_cache
        const { data: cacheData } = await supabase
          .from('leaderboard_cache')
          .select('user_id, level')

        const levelMap = new Map(
          (cacheData ?? []).map(r => [r.user_id as string, (r.level as number) ?? 1])
        )

        // Group by user
        const byUser = new Map<string, { scores: number[]; displayName: string; avatarUrl: string | null }>()
        for (const row of (quizData ?? []) as QuizAttemptRow[]) {
          if (!byUser.has(row.user_id)) {
            byUser.set(row.user_id, {
              scores: [],
              displayName: row.users?.display_name ?? 'Unknown',
              avatarUrl: row.users?.avatar_url ?? null,
            })
          }
          byUser.get(row.user_id)!.scores.push(row.score)
        }

        const ranked = [...byUser.entries()]
          .filter(([, v]) => v.scores.length >= 10) // min 10 attempts to qualify
          .map(([userId, v]) => ({
            userId,
            displayName: v.displayName,
            avatarUrl: v.avatarUrl,
            levelTitle: getLevelTitle(levelMap.get(userId) ?? 1),
            value: Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length),
            rank: 0,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 100)
          .map((e, i) => ({ ...e, rank: i + 1 }))

        setEntries(ranked)
      }

      if (board === 'active') {
        let query = supabase
          .from('progress')
          .select('user_id, lesson_id, completed_at, users!user_id(display_name, avatar_url)')

        if (activePeriod === 'week') {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          query = query.gte('completed_at', weekAgo)
        }

        const { data: progressData } = await query

        const { data: cacheData } = await supabase
          .from('leaderboard_cache')
          .select('user_id, level')

        const levelMap = new Map(
          (cacheData ?? []).map(r => [r.user_id as string, (r.level as number) ?? 1])
        )

        const byUser = new Map<string, { count: number; displayName: string; avatarUrl: string | null }>()
        for (const row of (progressData ?? []) as ProgressRow[]) {
          if (!byUser.has(row.user_id)) {
            byUser.set(row.user_id, {
              count: 0,
              displayName: row.users?.display_name ?? 'Unknown',
              avatarUrl: row.users?.avatar_url ?? null,
            })
          }
          byUser.get(row.user_id)!.count++
        }

        const ranked = [...byUser.entries()]
          .map(([userId, v]) => ({
            userId,
            displayName: v.displayName,
            avatarUrl: v.avatarUrl,
            levelTitle: getLevelTitle(levelMap.get(userId) ?? 1),
            value: v.count,
            rank: 0,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 100)
          .map((e, i) => ({ ...e, rank: i + 1 }))

        setEntries(ranked)
      }

      setLoading(false)
    }

    load()
  }, [board, activePeriod])

  const currentUserRank = user
    ? (entries.find(e => e.userId === user.id)?.rank ?? null)
    : null

  return { entries, currentUserRank, loading }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/features/leaderboard/hooks/useLeaderboard.ts
git commit -m "feat: add useLeaderboard hook for XP, streak, quiz accuracy, and lessons boards"
```

---

## Task 6: LeaderboardTable + LeaderboardPage

**Files:**
- Create: `src/features/leaderboard/components/LeaderboardTable.tsx`
- Create: `src/features/leaderboard/pages/LeaderboardPage.tsx`

- [ ] **Step 1: Create LeaderboardTable**

```typescript
// src/features/leaderboard/components/LeaderboardTable.tsx
import type { LeaderboardEntry } from '../hooks/useLeaderboard'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  currentUserId: string | null
  valueLabel: string
  valueFormatter?: (v: number) => string
}

export function LeaderboardTable({
  entries,
  currentUserId,
  valueLabel,
  valueFormatter,
}: LeaderboardTableProps) {
  const format = valueFormatter ?? String

  return (
    <div className="flex flex-col gap-0.5">
      {entries.map(entry => (
        <div
          key={entry.userId}
          className={`flex items-center gap-3 px-4 py-3 rounded-theme ${
            entry.userId === currentUserId
              ? 'bg-primary/10 border border-primary'
              : 'bg-bg-secondary'
          }`}
        >
          <span className="text-text-muted text-sm w-8 shrink-0 font-mono">#{entry.rank}</span>
          <div className="w-8 h-8 rounded-full bg-border overflow-hidden shrink-0">
            {entry.avatarUrl ? (
              <img
                src={entry.avatarUrl}
                alt={entry.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-text-muted">
                {entry.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-base text-sm font-medium truncate">{entry.displayName}</p>
            <p className="text-text-muted text-xs">{entry.levelTitle}</p>
          </div>
          <span className="text-text-base font-semibold text-sm shrink-0">
            {format(entry.value)}{' '}
            <span className="text-text-muted font-normal text-xs">{valueLabel}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create LeaderboardPage**

```typescript
// src/features/leaderboard/pages/LeaderboardPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/theme/ThemeContext'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { useLeaderboard, type BoardType, type ActivePeriod } from '../hooks/useLeaderboard'
import { LeaderboardTable } from '../components/LeaderboardTable'

interface BoardConfig {
  type: BoardType
  label: string
  valueLabel: string
  valueFormatter?: (v: number) => string
}

const BOARDS: BoardConfig[] = [
  { type: 'xp', label: 'Top Learners', valueLabel: 'XP' },
  { type: 'streak', label: 'Longest Streak', valueLabel: 'days' },
  { type: 'quiz', label: 'Quiz Masters', valueLabel: '', valueFormatter: v => `${v}%` },
  { type: 'active', label: 'Most Active', valueLabel: 'lessons' },
]

export function LeaderboardPage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [activeBoard, setActiveBoard] = useState<BoardType>('xp')
  const [activePeriod, setActivePeriod] = useState<ActivePeriod>('all')
  const { entries, currentUserRank, loading } = useLeaderboard(activeBoard, activePeriod)
  const currentBoardConfig = BOARDS.find(b => b.type === activeBoard)!

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-lg font-bold text-text-base">React Academy</Link>
            <nav className="hidden sm:flex gap-3 text-sm">
              <Link to="/" className="text-text-muted hover:text-primary transition-colors">Modules</Link>
              <Link to="/leaderboard" className="text-primary font-medium">Leaderboard</Link>
              <Link to="/profile" className="text-text-muted hover:text-primary transition-colors">Profile</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
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

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-text-base mb-6">Leaderboard</h2>

        {/* Board selector tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {BOARDS.map(board => (
            <button
              key={board.type}
              onClick={() => setActiveBoard(board.type)}
              className={`px-4 py-2 rounded-theme text-sm font-medium transition-colors ${
                activeBoard === board.type
                  ? 'bg-primary text-white'
                  : 'bg-bg-secondary border border-border text-text-muted hover:border-primary hover:text-primary'
              }`}
            >
              {board.label}
            </button>
          ))}
        </div>

        {/* Weekly/All-time toggle for Most Active */}
        {activeBoard === 'active' && (
          <div className="flex gap-2 mb-4">
            {(['all', 'week'] as ActivePeriod[]).map(period => (
              <button
                key={period}
                onClick={() => setActivePeriod(period)}
                className={`px-3 py-1 rounded-theme text-xs font-medium transition-colors ${
                  activePeriod === period
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'border border-border text-text-muted hover:border-primary'
                }`}
              >
                {period === 'all' ? 'All time' : 'This week'}
              </button>
            ))}
          </div>
        )}

        {/* Current user rank */}
        {currentUserRank !== null && (
          <p className="text-text-muted text-sm mb-4">
            Your rank:{' '}
            <span className="text-text-base font-semibold">#{currentUserRank}</span>
          </p>
        )}

        {/* Board content */}
        {loading ? (
          <LoadingSpinner />
        ) : entries.length === 0 ? (
          <p className="text-text-muted text-sm">
            {activeBoard === 'quiz'
              ? 'No players have completed 10 or more quizzes yet.'
              : 'No entries yet.'}
          </p>
        ) : (
          <LeaderboardTable
            entries={entries}
            currentUserId={user?.id ?? null}
            valueLabel={currentBoardConfig.valueLabel}
            valueFormatter={currentBoardConfig.valueFormatter}
          />
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/features/leaderboard/components/LeaderboardTable.tsx src/features/leaderboard/pages/LeaderboardPage.tsx
git commit -m "feat: add LeaderboardTable and LeaderboardPage with 4 boards"
```

---

## Task 7: useProfileStats hook

**Files:**
- Create: `src/features/profile/hooks/useProfileStats.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/features/profile/hooks/useProfileStats.ts
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
  const [xp, setXP] = useState(0)
  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)

      const [cacheRes, profileRes] = await Promise.all([
        supabase
          .from('leaderboard_cache')
          .select('xp, streak, level')
          .eq('user_id', user!.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('earned_badge_ids')
          .eq('id', user!.id)
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

      setLoading(false)
    }

    load()
  }, [user?.id])

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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/features/profile/hooks/useProfileStats.ts
git commit -m "feat: add useProfileStats hook reading XP, streak, level, and earned badges"
```

---

## Task 8: Profile sub-components — XPProgressBar, BadgeGrid, StatsPanel, StreakDisplay

**Files:**
- Create: `src/features/profile/components/XPProgressBar.tsx`
- Create: `src/features/profile/components/BadgeGrid.tsx`
- Create: `src/features/profile/components/StatsPanel.tsx`
- Create: `src/features/profile/components/StreakDisplay.tsx`

- [ ] **Step 1: Create XPProgressBar**

```typescript
// src/features/profile/components/XPProgressBar.tsx
interface XPProgressBarProps {
  xp: number
  level: number
  levelTitle: string
  xpForNextLevel: number
}

export function XPProgressBar({ xp, level, levelTitle, xpForNextLevel }: XPProgressBarProps) {
  // XP earned within the current level (each level requires 500 XP)
  const xpIntoLevel = xp - (level - 1) * 500
  const percent = Math.min(Math.round((xpIntoLevel / 500) * 100), 100)
  const xpRemaining = xpForNextLevel - xp

  return (
    <div className="bg-bg-secondary border border-border rounded-theme p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-text-base font-semibold">
          Level {level} — {levelTitle}
        </span>
        <span className="text-text-muted text-sm">{xp.toLocaleString()} XP total</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-text-muted text-xs mt-1">
        {xpRemaining} XP to Level {level + 1}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create BadgeGrid**

```typescript
// src/features/profile/components/BadgeGrid.tsx
import { BADGES } from '@/data/achievements'

interface BadgeGridProps {
  earnedBadgeIds: string[]
}

export function BadgeGrid({ earnedBadgeIds }: BadgeGridProps) {
  return (
    <div>
      <h3 className="text-text-base font-semibold mb-3">
        Badges ({earnedBadgeIds.length}/{BADGES.length})
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {BADGES.map(badge => {
          const earned = earnedBadgeIds.includes(badge.id)
          return (
            <div
              key={badge.id}
              title={earned ? `${badge.name}: ${badge.description}` : `Locked: ${badge.description}`}
              className={`flex flex-col items-center gap-1 p-2 rounded-theme border cursor-default ${
                earned
                  ? 'border-primary bg-bg-secondary'
                  : 'border-border opacity-30'
              }`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-xs text-text-muted text-center leading-tight">
                {badge.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create StatsPanel**

```typescript
// src/features/profile/components/StatsPanel.tsx
interface StatsPanelProps {
  completedLessonsCount: number
  completedModulesCount: number
  projectsPassedCount: number
  quizAccuracy: number // 0-100, rounded
}

export function StatsPanel({
  completedLessonsCount,
  completedModulesCount,
  projectsPassedCount,
  quizAccuracy,
}: StatsPanelProps) {
  const stats = [
    { label: 'Lessons', value: completedLessonsCount },
    { label: 'Modules', value: completedModulesCount },
    { label: 'Projects', value: projectsPassedCount },
    { label: 'Quiz Avg', value: `${quizAccuracy}%` },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="bg-bg-secondary border border-border rounded-theme p-4 text-center"
        >
          <p className="text-2xl font-bold text-text-base">{stat.value}</p>
          <p className="text-text-muted text-sm">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create StreakDisplay**

```typescript
// src/features/profile/components/StreakDisplay.tsx
interface StreakDisplayProps {
  currentStreak: number
}

export function StreakDisplay({ currentStreak }: StreakDisplayProps) {
  return (
    <div className="bg-bg-secondary border border-border rounded-theme p-4 flex items-center gap-4">
      <span className="text-4xl">🔥</span>
      <div>
        <p className="text-3xl font-bold text-text-base leading-none">{currentStreak}</p>
        <p className="text-text-muted text-sm mt-1">day streak</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/features/profile/components/XPProgressBar.tsx src/features/profile/components/BadgeGrid.tsx src/features/profile/components/StatsPanel.tsx src/features/profile/components/StreakDisplay.tsx
git commit -m "feat: add profile sub-components — XPProgressBar, BadgeGrid, StatsPanel, StreakDisplay"
```

---

## Task 9: ProfileInbox + ContactModeratorForm + ProfileSettings

**Files:**
- Create: `src/features/profile/components/ProfileInbox.tsx`
- Create: `src/features/profile/components/ContactModeratorForm.tsx`
- Create: `src/features/profile/components/ProfileSettings.tsx`

- [ ] **Step 1: Create ProfileInbox**

```typescript
// src/features/profile/components/ProfileInbox.tsx
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

interface ModeratorMessage {
  id: string
  subject: string
  message: string
  moderator_reply: string | null
  created_at: string
  resolved: boolean
}

export function ProfileInbox() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ModeratorMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data } = await supabase
        .from('moderator_messages')
        .select('id, subject, message, moderator_reply, created_at, resolved')
        .eq('from_user_id', user!.id)
        .order('created_at', { ascending: false })
      setMessages((data ?? []) as ModeratorMessage[])
      setLoading(false)
    }
    load()
  }, [user?.id])

  if (loading) return <LoadingSpinner />

  if (messages.length === 0) {
    return <p className="text-text-muted text-sm">No messages yet.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map(msg => (
        <div key={msg.id} className="border border-border rounded-theme p-4 bg-bg-secondary">
          <p className="text-text-base font-semibold text-sm">{msg.subject}</p>
          <p className="text-text-muted text-sm mt-1">{msg.message}</p>
          {msg.moderator_reply ? (
            <div className="mt-3 pl-3 border-l-2 border-primary">
              <p className="text-xs text-primary font-semibold">Moderator reply:</p>
              <p className="text-text-base text-sm mt-0.5">{msg.moderator_reply}</p>
            </div>
          ) : (
            <p className="text-text-muted text-xs mt-2 italic">Awaiting reply...</p>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create ContactModeratorForm**

```typescript
// src/features/profile/components/ContactModeratorForm.tsx
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function ContactModeratorForm() {
  const { user } = useAuth()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const { error: insertError } = await supabase.from('moderator_messages').insert({
      from_user_id: user.id,
      subject,
      message,
    })
    if (insertError) {
      setError(insertError.message)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <p className="text-success text-sm">
        Message sent! A moderator will reply to your inbox.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        required
        placeholder="Subject"
        className="px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary"
      />
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        required
        rows={4}
        placeholder="Your message..."
        className="w-full px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary resize-y"
      />
      {error && <p className="text-error text-sm">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!subject.trim() || !message.trim()}
          className="px-4 py-2 rounded-theme bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          Send Message
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Create ProfileSettings**

```typescript
// src/features/profile/components/ProfileSettings.tsx
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/theme/ThemeContext'
import type { Theme } from '@/lib/types'

export function ProfileSettings() {
  const { user, updateProfile } = useAuth()
  const { setTheme } = useTheme()
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const handleSaveName = async () => {
    setSaving(true)
    setMessage(null)
    const { error } = await updateProfile({ display_name: displayName })
    setMessage(error ?? 'Display name updated.')
    setSaving(false)
  }

  const handleThemeChange = async (theme: Theme) => {
    setTheme(theme)
    await updateProfile({ theme })
  }

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) return
    setSaving(true)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setMessage(error?.message ?? 'Password updated.')
    setNewPassword('')
    setSaving(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateProfile({ avatar_url: urlData.publicUrl })
    }
    setAvatarUploading(false)
  }

  const isError = message !== null && (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed'))

  return (
    <div className="flex flex-col gap-6">
      {/* Display Name */}
      <div>
        <label className="block text-sm font-semibold text-text-base mb-1">Display Name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSaveName}
            disabled={saving || displayName === user?.display_name || !displayName.trim()}
            className="px-4 py-2 rounded-theme bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Avatar */}
      <div>
        <label className="block text-sm font-semibold text-text-base mb-2">Avatar</label>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-border overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted font-bold">
                {user?.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <label className="cursor-pointer px-3 py-2 rounded-theme border border-border text-text-muted text-sm hover:border-primary hover:text-primary transition-colors">
            {avatarUploading ? 'Uploading...' : 'Upload photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-semibold text-text-base mb-1">Theme</label>
        <select
          value={user?.theme ?? 'pro'}
          onChange={e => handleThemeChange(e.target.value as Theme)}
          className="px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary"
          aria-label="Select theme"
        >
          <option value="fun">🎮 Fun</option>
          <option value="pro">💼 Pro</option>
          <option value="dev">💻 Dev</option>
        </select>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-semibold text-text-base mb-1">Change Password</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="New password (min 6 characters)"
            className="flex-1 px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={handlePasswordChange}
            disabled={saving || newPassword.length < 6}
            className="px-4 py-2 rounded-theme bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Update
          </button>
        </div>
      </div>

      {/* Feedback message */}
      {message && (
        <p className={`text-sm ${isError ? 'text-error' : 'text-success'}`}>{message}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/components/ProfileInbox.tsx src/features/profile/components/ContactModeratorForm.tsx src/features/profile/components/ProfileSettings.tsx
git commit -m "feat: add ProfileInbox, ContactModeratorForm, and ProfileSettings components"
```

---

## Task 10: ProfilePage

**Files:**
- Create: `src/features/profile/pages/ProfilePage.tsx`

- [ ] **Step 1: Create ProfilePage**

```typescript
// src/features/profile/pages/ProfilePage.tsx
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/theme/ThemeContext'
import { useProgress } from '@/features/curriculum/hooks/useProgress'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { useProfileStats } from '../hooks/useProfileStats'
import { XPProgressBar } from '../components/XPProgressBar'
import { BadgeGrid } from '../components/BadgeGrid'
import { StatsPanel } from '../components/StatsPanel'
import { StreakDisplay } from '../components/StreakDisplay'
import { ProfileInbox } from '../components/ProfileInbox'
import { ContactModeratorForm } from '../components/ContactModeratorForm'
import { ProfileSettings } from '../components/ProfileSettings'

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const {
    completedLessons,
    completedModules,
    quizScores,
    projectsPassed,
    loading: progressLoading,
  } = useProgress()
  const {
    xp,
    streak,
    level,
    levelTitle,
    xpForNextLevel,
    earnedBadgeIds,
    loading: statsLoading,
  } = useProfileStats()

  const quizScoreValues = Object.values(quizScores)
  const quizAccuracy =
    quizScoreValues.length > 0
      ? Math.round(quizScoreValues.reduce((a, b) => a + b, 0) / quizScoreValues.length)
      : 0

  if (!user || progressLoading || statsLoading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-lg font-bold text-text-base">React Academy</Link>
            <nav className="hidden sm:flex gap-3 text-sm">
              <Link to="/" className="text-text-muted hover:text-primary transition-colors">Modules</Link>
              <Link to="/leaderboard" className="text-text-muted hover:text-primary transition-colors">Leaderboard</Link>
              <Link to="/profile" className="text-primary font-medium">Profile</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
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

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Hero */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-border overflow-hidden shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-text-muted">
                {user.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-base">{user.display_name}</h1>
            <p className="text-text-muted text-sm">{levelTitle} · Level {level}</p>
          </div>
        </div>

        {/* XP + Level */}
        <XPProgressBar
          xp={xp}
          level={level}
          levelTitle={levelTitle}
          xpForNextLevel={xpForNextLevel}
        />

        {/* Streak + Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StreakDisplay currentStreak={streak} />
          <div className="sm:col-span-2">
            <StatsPanel
              completedLessonsCount={completedLessons.length}
              completedModulesCount={completedModules.length}
              projectsPassedCount={projectsPassed.length}
              quizAccuracy={quizAccuracy}
            />
          </div>
        </div>

        {/* Badges */}
        <BadgeGrid earnedBadgeIds={earnedBadgeIds} />

        {/* Divider */}
        <hr className="border-border" />

        {/* Inbox */}
        <section>
          <h2 className="text-lg font-semibold text-text-base mb-3">Messages from Moderators</h2>
          <ProfileInbox />
        </section>

        {/* Contact a Moderator */}
        <section>
          <h2 className="text-lg font-semibold text-text-base mb-3">Contact a Moderator</h2>
          <ContactModeratorForm />
        </section>

        {/* Divider */}
        <hr className="border-border" />

        {/* Settings */}
        <section>
          <h2 className="text-lg font-semibold text-text-base mb-4">Settings</h2>
          <ProfileSettings />
        </section>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/features/profile/pages/ProfilePage.tsx
git commit -m "feat: add ProfilePage composing all profile sub-components"
```

---

## Task 11: BugReportPage

**Files:**
- Create: `src/features/bugreport/pages/BugReportPage.tsx`

- [ ] **Step 1: Create BugReportPage**

```typescript
// src/features/bugreport/pages/BugReportPage.tsx
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function BugReportPage() {
  const { user } = useAuth()
  const location = useLocation()
  // Prefer the URL the user came from (passed via router state), fallback to current
  const pageUrl = (location.state as { from?: string } | null)?.from ?? window.location.href

  const [description, setDescription] = useState('')
  const [expected, setExpected] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError(null)
    const { error: insertError } = await supabase.from('bug_reports').insert({
      reported_by: user.id,
      page_url: pageUrl,
      description,
      expected_behavior: expected,
    })
    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-5xl">✅</p>
        <h2 className="text-xl font-semibold text-text-base">Bug report submitted</h2>
        <p className="text-text-muted text-sm text-center">
          Thank you! Our team will investigate and update the status.
        </p>
        <Link
          to="/"
          className="mt-2 text-primary hover:underline text-sm"
        >
          ← Back to modules
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3 text-sm">
          <Link to="/" className="text-text-muted hover:text-primary transition-colors">← Back</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text-base mb-1">Report a Bug</h1>
        <p className="text-text-muted text-sm mb-6">Found something broken? Let us know.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Page URL — read-only, auto-captured */}
          <div>
            <label className="block text-sm font-semibold text-text-base mb-1">Page URL</label>
            <input
              type="text"
              readOnly
              value={pageUrl}
              className="w-full px-3 py-2 rounded-theme border border-border bg-bg-secondary text-text-muted text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-text-base mb-1" htmlFor="bug-description">
              What went wrong?
            </label>
            <textarea
              id="bug-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Describe what happened..."
              className="w-full px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary resize-y"
            />
          </div>

          {/* Expected behavior */}
          <div>
            <label className="block text-sm font-semibold text-text-base mb-1" htmlFor="bug-expected">
              What did you expect to happen?
            </label>
            <textarea
              id="bug-expected"
              value={expected}
              onChange={e => setExpected(e.target.value)}
              rows={3}
              placeholder="Describe the expected behavior..."
              className="w-full px-3 py-2 rounded-theme border border-border bg-bg text-text-base text-sm focus:outline-none focus:border-primary resize-y"
            />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!description.trim() || submitting}
            className="px-6 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Bug Report'}
          </button>
        </form>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/features/bugreport/pages/BugReportPage.tsx
git commit -m "feat: add BugReportPage with auto-captured page URL and Supabase submission"
```

---

## Task 12: Wire routes + update navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/features/curriculum/pages/ModuleMapPage.tsx`

- [ ] **Step 1: Update App.tsx**

Read the current `src/App.tsx`. Replace the entire file with:

```typescript
// src/App.tsx
import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { AuthPage } from '@/features/auth/pages/AuthPage'
import { OnboardingPage } from '@/features/auth/pages/OnboardingPage'
import { ModuleMapPage } from '@/features/curriculum/pages/ModuleMapPage'
import { LessonPage } from '@/features/curriculum/pages/LessonPage'
import { LeaderboardPage } from '@/features/leaderboard/pages/LeaderboardPage'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'
import { BugReportPage } from '@/features/bugreport/pages/BugReportPage'
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
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <LeaderboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report-bug"
        element={
          <ProtectedRoute>
            <BugReportPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
```

- [ ] **Step 2: Update ModuleMapPage header navigation**

Read `src/features/curriculum/pages/ModuleMapPage.tsx`. Find the header `<div className="flex items-center gap-3">` that contains the theme selector and sign-out button. Add navigation links before the theme selector:

Replace:
```tsx
          <div className="flex items-center gap-3">
            <span className="text-text-muted text-sm hidden sm:block">{user?.display_name}</span>
            <select
```

With:
```tsx
          <div className="flex items-center gap-3">
            <nav className="hidden sm:flex gap-3 text-sm">
              <Link to="/leaderboard" className="text-text-muted hover:text-primary transition-colors">Leaderboard</Link>
              <Link to="/profile" className="text-text-muted hover:text-primary transition-colors">{user?.display_name}</Link>
            </nav>
            <select
```

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass (65+ tests across 8+ test files)

- [ ] **Step 4: Run production build**

```bash
npm run build
```

Expected: Clean build, no TypeScript errors, `dist/` created

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/features/curriculum/pages/ModuleMapPage.tsx
git commit -m "feat: wire Phase 3 routes — profile, leaderboard, bug report + nav links"
```

- [ ] **Step 6: Push to GitHub**

```bash
git push origin master
```

Expected: All Phase 3 commits pushed to `https://github.com/mikejhenry/react-academy.git`

---

## Self-Review

### Spec coverage check

| Spec section | Task(s) |
|---|---|
| Per-lesson comments, collapsed | Task 4 — CommentSection |
| Show Discussion toggle | Task 4 — CommentSection handleToggle |
| Flat comments: avatar, display name, relative time | Task 4 — CommentItem |
| Author can delete own comment | Task 4 — CommentItem delete button |
| Report comment → reason → comment_reports | Task 3 — ReportModal, Task 4 — CommentItem report |
| Comment timeout message with expiry | Task 3 — CommentForm timeout display |
| 4 leaderboard boards from leaderboard_cache | Tasks 5-6 — useLeaderboard, LeaderboardPage |
| Top 100 + current user rank | Task 5 — currentUserRank + entry highlight |
| Quiz Masters: min 10 attempts | Task 5 — filter(>= 10) |
| Most Active: weekly + all-time toggle | Task 6 — activePeriod state + toggle UI |
| Each row: rank, avatar, display name, level title, value | Task 6 — LeaderboardTable |
| Profile: display name, avatar, level title, theme | Task 10 — ProfilePage hero + Settings |
| XP total and level progress bar | Tasks 7-8, 10 — useProfileStats + XPProgressBar |
| Current streak | Tasks 7-8, 10 — useProfileStats + StreakDisplay |
| Badges earned grid | Tasks 7-8, 10 — useProfileStats + BadgeGrid |
| Module/lesson progress overview | Task 10 — StatsPanel completedLessons/Modules |
| Learning stats (quiz accuracy, lessons, projects) | Tasks 8, 10 — StatsPanel |
| Inbox: moderator message replies | Task 9 — ProfileInbox |
| Contact moderator: subject + message | Task 9 — ContactModeratorForm |
| Settings: display name, avatar, theme, password | Task 9 — ProfileSettings |
| Bug report: page URL, description, expected behavior | Task 11 — BugReportPage |
| Bug report → bug_reports table, status 'new' | Task 11 — Supabase insert |
| Report a Bug in footer | Pre-existing in ModuleMapPage footer (Phase 2), route added in Task 12 |

### Type consistency check

- `Comment` interface defined in `useComments.ts`, imported by `CommentItem.tsx` ✓
- `LeaderboardEntry` and `BoardType` defined in `useLeaderboard.ts`, imported by `LeaderboardTable.tsx` and `LeaderboardPage.tsx` ✓
- `ProfileStats` returned by `useProfileStats`, consumed by `ProfilePage` ✓
- `StatsPanel` prop `completedLessonsCount` (number) matches `completedLessons.length` (number) in `ProfilePage` ✓
- `XPProgressBar` prop `xpForNextLevel` (number from `getXPForNextLevel`) ✓
- `ActivePeriod` type exported from `useLeaderboard.ts` and used in `LeaderboardPage.tsx` ✓
