# Phase 4 — Moderator Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Moderator Dashboard — a role-gated area for moderators and admins covering the unresolved comment report queue, a recent comments feed with delete capability, comment timeout management (issue/revoke), and the moderator messages inbox with inline reply.

**Architecture:** All moderator feature code lives in `src/features/moderator/`. The existing `ProtectedRoute` already supports `requiredRole="moderator"` with role-hierarchy enforcement (moderator ≥ 1, admin ≥ 2) so no new guard component is needed. Each section has its own Supabase hook + component pair. `ModeratorPage` composes them as tabs. The only new route is `/moderator`.

**Tech Stack:** React 18, TypeScript strict, Supabase JS v2, React Router v6, Tailwind CSS v3, Vitest (pure utility tests only)

---

## File Map

```
Create: src/features/moderator/utils/formatTimeoutExpiry.ts
Create: src/features/moderator/utils/formatTimeoutExpiry.test.ts
Create: src/features/moderator/hooks/useModerationQueue.ts
Create: src/features/moderator/components/ModerationQueueItem.tsx
Create: src/features/moderator/components/ModerationQueue.tsx
Create: src/features/moderator/hooks/useRecentComments.ts
Create: src/features/moderator/components/RecentCommentsFeed.tsx
Create: src/features/moderator/hooks/useCommentTimeouts.ts
Create: src/features/moderator/components/TimeoutManager.tsx
Create: src/features/moderator/hooks/useModeratorInbox.ts
Create: src/features/moderator/components/ModeratorInbox.tsx
Create: src/features/moderator/pages/ModeratorPage.tsx
Modify: src/App.tsx                                          (add /moderator route)
Modify: src/features/curriculum/pages/ModuleMapPage.tsx     (add Moderation nav link for role >= moderator)
```

---

## Shared types used throughout

Read `src/lib/types.ts` and `src/features/auth/hooks/useAuth.tsx` before starting. Key facts:

- `UserProfile.role` is `'student' | 'moderator' | 'admin'`
- `useAuth()` → `{ user: UserProfile | null, loading: boolean }` from `src/features/auth/hooks/useAuth.tsx`
- `ProtectedRoute` at `src/shared/components/ProtectedRoute.tsx` — already accepts `requiredRole` prop
- `supabase` client from `src/lib/supabase.ts`
- `LoadingSpinner` from `src/shared/components/LoadingSpinner.tsx`
- `formatRelativeTime` from `src/features/comments/utils/formatRelativeTime.ts` — takes an ISO string, returns e.g. `"2 hours ago"`

**Interfaces defined in this plan (defined in the hook files, imported into component files):**

```typescript
// defined in useModerationQueue.ts
export interface ModerationReport {
  id: string
  reason: 'spam' | 'inappropriate' | 'gives_away_answer' | 'other'
  createdAt: string
  comment: {
    id: string
    content: string
    lessonId: string
    userId: string
    authorName: string
    authorAvatar: string | null
    isHidden: boolean
  }
  reporterName: string
}

// defined in useRecentComments.ts
export interface RecentComment {
  id: string
  userId: string
  lessonId: string
  content: string
  authorName: string
  authorAvatar: string | null
  createdAt: string
}

// defined in useCommentTimeouts.ts
export interface ActiveTimeout {
  id: string
  userId: string
  displayName: string
  reason: string
  expiresAt: string
  issuedAt: string
}

// defined in useModeratorInbox.ts
export interface ModeratorMessage {
  id: string
  fromUserId: string
  fromDisplayName: string
  subject: string
  message: string
  moderatorReply: string | null
  resolved: boolean
  createdAt: string
}
```

---

## Supabase table reference

Relevant tables (from schema):

**`comment_reports`**: `id`, `comment_id → comments.id`, `reported_by → users.id`, `reason`, `resolved`, `created_at`

**`comments`**: `id`, `user_id → users.id`, `lesson_id`, `content`, `is_hidden`, `created_at`

**`comment_timeouts`**: `id`, `user_id → users.id`, `issued_by → users.id`, `expires_at`, `reason`, `created_at`

**`moderator_messages`**: `id`, `from_user_id → users.id`, `subject`, `message`, `moderator_reply`, `replied_by`, `created_at`, `resolved`

---

## Task 1: `formatTimeoutExpiry` utility + tests

**Files:**
- Create: `src/features/moderator/utils/formatTimeoutExpiry.ts`
- Create: `src/features/moderator/utils/formatTimeoutExpiry.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/moderator/utils/formatTimeoutExpiry.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatTimeoutExpiry } from './formatTimeoutExpiry'

describe('formatTimeoutExpiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-08T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns "Expired" for past timestamps', () => {
    expect(formatTimeoutExpiry('2026-04-08T11:00:00Z')).toBe('Expired')
  })

  it('returns minutes remaining when under 1 hour', () => {
    expect(formatTimeoutExpiry('2026-04-08T12:45:00Z')).toBe('45m remaining')
  })

  it('returns hours remaining when exactly on the hour', () => {
    expect(formatTimeoutExpiry('2026-04-08T14:00:00Z')).toBe('2h remaining')
  })

  it('returns hours and minutes when under 24 hours', () => {
    expect(formatTimeoutExpiry('2026-04-08T14:30:00Z')).toBe('2h 30m remaining')
  })

  it('returns days when over 24 hours', () => {
    expect(formatTimeoutExpiry('2026-04-10T12:00:00Z')).toBe('2d remaining')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/features/moderator/utils/formatTimeoutExpiry.test.ts
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the implementation**

```typescript
// src/features/moderator/utils/formatTimeoutExpiry.ts
export function formatTimeoutExpiry(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  if (diffMs <= 0) return 'Expired'

  const totalMinutes = Math.floor(diffMs / 60000)
  if (totalMinutes < 60) return `${totalMinutes}m remaining`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m remaining` : `${hours}h remaining`

  return `${Math.floor(hours / 24)}d remaining`
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run src/features/moderator/utils/formatTimeoutExpiry.test.ts
```
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/features/moderator/utils/formatTimeoutExpiry.ts src/features/moderator/utils/formatTimeoutExpiry.test.ts
git commit -m "feat: add formatTimeoutExpiry utility with tests"
```

---

## Task 2: `useModerationQueue` + `ModerationQueueItem` + `ModerationQueue`

**Files:**
- Create: `src/features/moderator/hooks/useModerationQueue.ts`
- Create: `src/features/moderator/components/ModerationQueueItem.tsx`
- Create: `src/features/moderator/components/ModerationQueue.tsx`

- [ ] **Step 1: Create `useModerationQueue.ts`**

```typescript
// src/features/moderator/hooks/useModerationQueue.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface ModerationReport {
  id: string
  reason: 'spam' | 'inappropriate' | 'gives_away_answer' | 'other'
  createdAt: string
  comment: {
    id: string
    content: string
    lessonId: string
    userId: string
    authorName: string
    authorAvatar: string | null
    isHidden: boolean
  }
  reporterName: string
}

interface RawReport {
  id: string
  reason: string
  created_at: string
  comment: {
    id: string
    content: string
    lesson_id: string
    user_id: string
    is_hidden: boolean
    author: { display_name: string; avatar_url: string | null } | null
  } | null
  reporter: { display_name: string } | null
}

export function useModerationQueue(): {
  reports: ModerationReport[]
  loading: boolean
  resolveReport: (reportId: string, commentId: string, deleteComment: boolean) => Promise<void>
} {
  const [reports, setReports] = useState<ModerationReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('comment_reports')
          .select(`
            id, reason, created_at,
            comment:comments!comment_id (
              id, content, lesson_id, user_id, is_hidden,
              author:users!user_id (display_name, avatar_url)
            ),
            reporter:users!reported_by (display_name)
          `)
          .eq('resolved', false)
          .order('created_at', { ascending: false })

        const rows = (data ?? []) as unknown as RawReport[]
        setReports(
          rows
            .filter(r => r.comment !== null)
            .map(r => ({
              id: r.id,
              reason: r.reason as ModerationReport['reason'],
              createdAt: r.created_at,
              comment: {
                id: r.comment!.id,
                content: r.comment!.content,
                lessonId: r.comment!.lesson_id,
                userId: r.comment!.user_id,
                authorName: r.comment!.author?.display_name ?? 'Unknown',
                authorAvatar: r.comment!.author?.avatar_url ?? null,
                isHidden: r.comment!.is_hidden,
              },
              reporterName: r.reporter?.display_name ?? 'Unknown',
            }))
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const resolveReport = useCallback(
    async (reportId: string, commentId: string, deleteComment: boolean) => {
      const ops: Promise<unknown>[] = [
        supabase.from('comment_reports').update({ resolved: true }).eq('id', reportId),
      ]
      if (deleteComment) {
        ops.push(supabase.from('comments').update({ is_hidden: true }).eq('id', commentId))
      }
      await Promise.all(ops)
      setReports(prev => prev.filter(r => r.id !== reportId))
    },
    []
  )

  return { reports, loading, resolveReport }
}
```

- [ ] **Step 2: Create `ModerationQueueItem.tsx`**

```tsx
// src/features/moderator/components/ModerationQueueItem.tsx
import { useState } from 'react'
import type { ModerationReport } from '../hooks/useModerationQueue'
import { formatRelativeTime } from '@/features/comments/utils/formatRelativeTime'

const REASON_LABELS: Record<ModerationReport['reason'], string> = {
  spam: 'Spam',
  inappropriate: 'Inappropriate',
  gives_away_answer: 'Gives away answer',
  other: 'Other',
}

interface ModerationQueueItemProps {
  report: ModerationReport
  onResolve: (reportId: string, commentId: string, deleteComment: boolean) => Promise<void>
}

export function ModerationQueueItem({ report, onResolve }: ModerationQueueItemProps) {
  const [resolving, setResolving] = useState(false)

  const handleAction = async (deleteComment: boolean) => {
    setResolving(true)
    await onResolve(report.id, report.comment.id, deleteComment)
    setResolving(false)
  }

  return (
    <div className="border border-border rounded-theme p-4 bg-bg-secondary flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
            {REASON_LABELS[report.reason]}
          </span>
          <p className="text-xs text-text-muted mt-0.5">
            Reported by {report.reporterName} · {formatRelativeTime(report.createdAt)}
          </p>
        </div>
        <span className="text-xs text-text-muted shrink-0">Lesson: {report.comment.lessonId}</span>
      </div>

      <div className="bg-bg border border-border rounded-theme px-3 py-2">
        <p className="text-xs text-text-muted mb-1">{report.comment.authorName}</p>
        <p className="text-sm text-text-base">{report.comment.content}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleAction(false)}
          disabled={resolving}
          className="px-3 py-1.5 text-xs rounded-theme border border-border text-text-muted hover:text-text-base transition-colors disabled:opacity-50"
        >
          Keep Comment
        </button>
        <button
          type="button"
          onClick={() => handleAction(true)}
          disabled={resolving}
          className="px-3 py-1.5 text-xs rounded-theme border border-error text-error hover:bg-bg transition-colors disabled:opacity-50"
        >
          Remove Comment
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `ModerationQueue.tsx`**

```tsx
// src/features/moderator/components/ModerationQueue.tsx
import { useModerationQueue } from '../hooks/useModerationQueue'
import { ModerationQueueItem } from './ModerationQueueItem'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

export function ModerationQueue() {
  const { reports, loading, resolveReport } = useModerationQueue()

  if (loading) return <LoadingSpinner />
  if (reports.length === 0) {
    return <p className="text-text-muted text-sm">No pending reports.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">{reports.length} unresolved report{reports.length !== 1 ? 's' : ''}</p>
      {reports.map(report => (
        <ModerationQueueItem key={report.id} report={report} onResolve={resolveReport} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run full test suite to confirm no regressions**

```
npx vitest run
```
Expected: all 62 pre-existing tests pass (no new tests for these files — they are Supabase-coupled)

- [ ] **Step 5: Commit**

```bash
git add src/features/moderator/hooks/useModerationQueue.ts src/features/moderator/components/ModerationQueueItem.tsx src/features/moderator/components/ModerationQueue.tsx
git commit -m "feat: add moderation report queue (hook + components)"
```

---

## Task 3: `useRecentComments` + `RecentCommentsFeed`

**Files:**
- Create: `src/features/moderator/hooks/useRecentComments.ts`
- Create: `src/features/moderator/components/RecentCommentsFeed.tsx`

- [ ] **Step 1: Create `useRecentComments.ts`**

```typescript
// src/features/moderator/hooks/useRecentComments.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface RecentComment {
  id: string
  userId: string
  lessonId: string
  content: string
  authorName: string
  authorAvatar: string | null
  createdAt: string
}

interface RawComment {
  id: string
  user_id: string
  lesson_id: string
  content: string
  created_at: string
  author: { display_name: string; avatar_url: string | null } | null
}

export function useRecentComments(): {
  comments: RecentComment[]
  loading: boolean
  deleteComment: (commentId: string) => Promise<void>
} {
  const [comments, setComments] = useState<RecentComment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('comments')
          .select('id, user_id, lesson_id, content, created_at, author:users!user_id(display_name, avatar_url)')
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(50)

        const rows = (data ?? []) as unknown as RawComment[]
        setComments(
          rows.map(r => ({
            id: r.id,
            userId: r.user_id,
            lessonId: r.lesson_id,
            content: r.content,
            authorName: r.author?.display_name ?? 'Unknown',
            authorAvatar: r.author?.avatar_url ?? null,
            createdAt: r.created_at,
          }))
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const deleteComment = useCallback(async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .update({ is_hidden: true })
      .eq('id', commentId)
    if (!error) setComments(prev => prev.filter(c => c.id !== commentId))
  }, [])

  return { comments, loading, deleteComment }
}
```

- [ ] **Step 2: Create `RecentCommentsFeed.tsx`**

```tsx
// src/features/moderator/components/RecentCommentsFeed.tsx
import { useRecentComments } from '../hooks/useRecentComments'
import { formatRelativeTime } from '@/features/comments/utils/formatRelativeTime'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

export function RecentCommentsFeed() {
  const { comments, loading, deleteComment } = useRecentComments()

  if (loading) return <LoadingSpinner />
  if (comments.length === 0) {
    return <p className="text-text-muted text-sm">No recent comments.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {comments.map(comment => (
        <div
          key={comment.id}
          className="border border-border rounded-theme p-3 bg-bg-secondary flex gap-3 items-start"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-text-base">{comment.authorName}</span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">Lesson {comment.lessonId}</span>
              <span className="text-xs text-text-muted ml-auto shrink-0">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm text-text-base line-clamp-2">{comment.content}</p>
          </div>
          <button
            type="button"
            onClick={() => deleteComment(comment.id)}
            aria-label={`Delete comment by ${comment.authorName}`}
            className="text-xs text-error hover:underline shrink-0 mt-0.5"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite**

```
npx vitest run
```
Expected: all passing

- [ ] **Step 4: Commit**

```bash
git add src/features/moderator/hooks/useRecentComments.ts src/features/moderator/components/RecentCommentsFeed.tsx
git commit -m "feat: add recent comments feed with moderator delete"
```

---

## Task 4: `useCommentTimeouts` + `TimeoutManager`

**Files:**
- Create: `src/features/moderator/hooks/useCommentTimeouts.ts`
- Create: `src/features/moderator/components/TimeoutManager.tsx`

- [ ] **Step 1: Create `useCommentTimeouts.ts`**

```typescript
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
  issueTimeout: (userId: string, durationHours: number, reason: string) => Promise<void>
  revokeTimeout: (timeoutId: string) => Promise<void>
} {
  const { user } = useAuth()
  const [timeouts, setTimeouts] = useState<ActiveTimeout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('comment_timeouts')
          .select('id, user_id, reason, expires_at, created_at, target:users!user_id(display_name)')
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: true })

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
      const { data, error } = await supabase
        .from('comment_timeouts')
        .insert({ user_id: userId, issued_by: user.id, expires_at: expiresAt, reason })
        .select('id, user_id, reason, expires_at, created_at, target:users!user_id(display_name)')
        .single()

      if (!error && data) {
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
    const { error } = await supabase
      .from('comment_timeouts')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', timeoutId)
    if (!error) setTimeouts(prev => prev.filter(t => t.id !== timeoutId))
  }, [])

  return { timeouts, loading, issueTimeout, revokeTimeout }
}
```

- [ ] **Step 2: Create `TimeoutManager.tsx`**

```tsx
// src/features/moderator/components/TimeoutManager.tsx
import { useState } from 'react'
import { useCommentTimeouts } from '../hooks/useCommentTimeouts'
import { formatTimeoutExpiry } from '../utils/formatTimeoutExpiry'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

const DURATION_OPTIONS = [
  { label: '1 hour', hours: 1 },
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
  { label: '7 days', hours: 168 },
]

export function TimeoutManager() {
  const { timeouts, loading, issueTimeout, revokeTimeout } = useCommentTimeouts()
  const [userId, setUserId] = useState('')
  const [duration, setDuration] = useState(24)
  const [reason, setReason] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [issueError, setIssueError] = useState<string | null>(null)

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId.trim() || !reason.trim()) return
    setIssuing(true)
    setIssueError(null)
    try {
      await issueTimeout(userId.trim(), duration, reason.trim())
      setUserId('')
      setReason('')
    } catch {
      setIssueError('Failed to issue timeout. Check that the user ID is valid.')
    } finally {
      setIssuing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Issue new timeout form */}
      <div className="border border-border rounded-theme p-4 bg-bg-secondary">
        <h3 className="text-sm font-semibold text-text-base mb-3">Issue New Timeout</h3>
        <form onSubmit={handleIssue} className="flex flex-col gap-3">
          <div>
            <label htmlFor="timeout-user-id" className="block text-xs text-text-muted mb-1">
              User ID
            </label>
            <input
              id="timeout-user-id"
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="Paste user UUID (visible in comment feeds above)"
              className="w-full px-3 py-2 text-sm rounded-theme border border-border bg-bg text-text-base focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="timeout-duration" className="block text-xs text-text-muted mb-1">
              Duration
            </label>
            <select
              id="timeout-duration"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-theme border border-border bg-bg text-text-base focus:outline-none focus:border-primary"
            >
              {DURATION_OPTIONS.map(opt => (
                <option key={opt.hours} value={opt.hours}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="timeout-reason" className="block text-xs text-text-muted mb-1">
              Reason
            </label>
            <input
              id="timeout-reason"
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Repeated spam"
              className="w-full px-3 py-2 text-sm rounded-theme border border-border bg-bg text-text-base focus:outline-none focus:border-primary"
            />
          </div>
          {issueError && <p className="text-error text-xs">{issueError}</p>}
          <button
            type="submit"
            disabled={issuing || !userId.trim() || !reason.trim()}
            className="px-4 py-2 text-sm rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
          >
            {issuing ? 'Issuing...' : 'Issue Timeout'}
          </button>
        </form>
      </div>

      {/* Active timeouts list */}
      <div>
        <h3 className="text-sm font-semibold text-text-base mb-3">
          Active Timeouts
        </h3>
        {loading ? (
          <LoadingSpinner />
        ) : timeouts.length === 0 ? (
          <p className="text-text-muted text-sm">No active timeouts.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {timeouts.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 border border-border rounded-theme px-3 py-2.5 bg-bg-secondary"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-base">{t.displayName}</p>
                  <p className="text-xs text-text-muted truncate">{t.reason}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-text-muted">{formatTimeoutExpiry(t.expiresAt)}</p>
                  <button
                    type="button"
                    onClick={() => revokeTimeout(t.id)}
                    className="text-xs text-error hover:underline mt-0.5"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite**

```
npx vitest run
```
Expected: all passing

- [ ] **Step 4: Commit**

```bash
git add src/features/moderator/hooks/useCommentTimeouts.ts src/features/moderator/components/TimeoutManager.tsx
git commit -m "feat: add comment timeout management (issue, list, revoke)"
```

---

## Task 5: `useModeratorInbox` + `ModeratorInbox`

**Files:**
- Create: `src/features/moderator/hooks/useModeratorInbox.ts`
- Create: `src/features/moderator/components/ModeratorInbox.tsx`

- [ ] **Step 1: Create `useModeratorInbox.ts`**

```typescript
// src/features/moderator/hooks/useModeratorInbox.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'

export interface ModeratorMessage {
  id: string
  fromUserId: string
  fromDisplayName: string
  subject: string
  message: string
  moderatorReply: string | null
  resolved: boolean
  createdAt: string
}

interface RawMessage {
  id: string
  from_user_id: string
  subject: string
  message: string
  moderator_reply: string | null
  resolved: boolean
  created_at: string
  sender: { display_name: string } | null
}

export function useModeratorInbox(): {
  messages: ModeratorMessage[]
  loading: boolean
  replyToMessage: (messageId: string, reply: string) => Promise<void>
  markResolved: (messageId: string) => Promise<void>
} {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ModeratorMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('moderator_messages')
          .select(
            'id, from_user_id, subject, message, moderator_reply, resolved, created_at, sender:users!from_user_id(display_name)'
          )
          .order('resolved', { ascending: true })
          .order('created_at', { ascending: false })

        const rows = (data ?? []) as unknown as RawMessage[]
        setMessages(
          rows.map(r => ({
            id: r.id,
            fromUserId: r.from_user_id,
            fromDisplayName: r.sender?.display_name ?? 'Unknown',
            subject: r.subject,
            message: r.message,
            moderatorReply: r.moderator_reply,
            resolved: r.resolved,
            createdAt: r.created_at,
          }))
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const replyToMessage = useCallback(
    async (messageId: string, reply: string) => {
      if (!user) return
      const { error } = await supabase
        .from('moderator_messages')
        .update({ moderator_reply: reply, replied_by: user.id, resolved: true })
        .eq('id', messageId)
      if (!error) {
        setMessages(prev =>
          prev.map(m =>
            m.id === messageId ? { ...m, moderatorReply: reply, resolved: true } : m
          )
        )
      }
    },
    [user]
  )

  const markResolved = useCallback(async (messageId: string) => {
    const { error } = await supabase
      .from('moderator_messages')
      .update({ resolved: true })
      .eq('id', messageId)
    if (!error) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, resolved: true } : m))
    }
  }, [])

  return { messages, loading, replyToMessage, markResolved }
}
```

- [ ] **Step 2: Create `ModeratorInbox.tsx`**

```tsx
// src/features/moderator/components/ModeratorInbox.tsx
import { useState } from 'react'
import { useModeratorInbox } from '../hooks/useModeratorInbox'
import { formatRelativeTime } from '@/features/comments/utils/formatRelativeTime'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

export function ModeratorInbox() {
  const { messages, loading, replyToMessage, markResolved } = useModeratorInbox()
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)

  const handleReply = async (messageId: string) => {
    const text = replyText[messageId]?.trim()
    if (!text) return
    setSending(messageId)
    await replyToMessage(messageId, text)
    setReplyText(prev => ({ ...prev, [messageId]: '' }))
    setSending(null)
  }

  if (loading) return <LoadingSpinner />
  if (messages.length === 0) {
    return <p className="text-text-muted text-sm">No messages.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`border rounded-theme p-4 bg-bg-secondary ${
            msg.resolved ? 'border-border opacity-60' : 'border-primary/40'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-sm font-semibold text-text-base">{msg.subject}</p>
              <p className="text-xs text-text-muted">
                From {msg.fromDisplayName} · {formatRelativeTime(msg.createdAt)}
              </p>
            </div>
            {msg.resolved && (
              <span className="text-xs text-success shrink-0 font-semibold">Resolved</span>
            )}
          </div>

          <p className="text-sm text-text-base mb-3">{msg.message}</p>

          {msg.moderatorReply ? (
            <div className="pl-3 border-l-2 border-primary">
              <p className="text-xs text-primary font-semibold">Your reply:</p>
              <p className="text-sm text-text-base mt-0.5">{msg.moderatorReply}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                value={replyText[msg.id] ?? ''}
                onChange={e => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                rows={2}
                placeholder="Write a reply..."
                className="w-full px-3 py-2 text-sm rounded-theme border border-border bg-bg text-text-base focus:outline-none focus:border-primary resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleReply(msg.id)}
                  disabled={sending === msg.id || !replyText[msg.id]?.trim()}
                  className="px-3 py-1.5 text-xs rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {sending === msg.id ? 'Sending...' : 'Send Reply'}
                </button>
                <button
                  type="button"
                  onClick={() => markResolved(msg.id)}
                  className="px-3 py-1.5 text-xs rounded-theme border border-border text-text-muted hover:text-text-base transition-colors"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite**

```
npx vitest run
```
Expected: all passing

- [ ] **Step 4: Commit**

```bash
git add src/features/moderator/hooks/useModeratorInbox.ts src/features/moderator/components/ModeratorInbox.tsx
git commit -m "feat: add moderator inbox with inline reply and mark-resolved"
```

---

## Task 6: `ModeratorPage` + route wiring + nav link

**Files:**
- Create: `src/features/moderator/pages/ModeratorPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/features/curriculum/pages/ModuleMapPage.tsx`

- [ ] **Step 1: Create `ModeratorPage.tsx`**

```tsx
// src/features/moderator/pages/ModeratorPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ModerationQueue } from '../components/ModerationQueue'
import { RecentCommentsFeed } from '../components/RecentCommentsFeed'
import { TimeoutManager } from '../components/TimeoutManager'
import { ModeratorInbox } from '../components/ModeratorInbox'
import { useAuth } from '@/features/auth/hooks/useAuth'

type Tab = 'queue' | 'comments' | 'timeouts' | 'messages'

const TABS: { id: Tab; label: string }[] = [
  { id: 'queue', label: 'Report Queue' },
  { id: 'comments', label: 'Recent Comments' },
  { id: 'timeouts', label: 'Timeouts' },
  { id: 'messages', label: 'Messages' },
]

export function ModeratorPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('queue')

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-text-muted hover:text-primary transition-colors text-sm">
              ← Home
            </Link>
            <span className="text-text-muted text-sm">/</span>
            <h1 className="text-lg font-bold text-text-base">Moderator Dashboard</h1>
          </div>
          <span className="text-xs text-text-muted hidden sm:block">{user?.display_name}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-base'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'queue' && <ModerationQueue />}
        {activeTab === 'comments' && <RecentCommentsFeed />}
        {activeTab === 'timeouts' && <TimeoutManager />}
        {activeTab === 'messages' && <ModeratorInbox />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modify `src/App.tsx` — add the `/moderator` route**

Add this import after the existing feature imports:
```typescript
import { ModeratorPage } from '@/features/moderator/pages/ModeratorPage'
```

Add this route before `<Route path="*" ...>`:
```tsx
<Route
  path="/moderator"
  element={
    <ProtectedRoute requiredRole="moderator">
      <ModeratorPage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Modify `src/features/curriculum/pages/ModuleMapPage.tsx` — add Moderation nav link**

Inside the `<nav>` element (after the Profile link), add:
```tsx
{(user?.role === 'moderator' || user?.role === 'admin') && (
  <Link to="/moderator" className="text-text-muted hover:text-primary transition-colors">
    Moderation
  </Link>
)}
```

The updated nav block in full context (replacing the existing nav):
```tsx
<nav className="hidden sm:flex gap-3 text-sm">
  <Link to="/leaderboard" className="text-text-muted hover:text-primary transition-colors">Leaderboard</Link>
  <Link to="/profile" className="text-text-muted hover:text-primary transition-colors">{user?.display_name}</Link>
  {(user?.role === 'moderator' || user?.role === 'admin') && (
    <Link to="/moderator" className="text-text-muted hover:text-primary transition-colors">Moderation</Link>
  )}
</nav>
```

- [ ] **Step 4: Run full test suite**

```
npx vitest run
```
Expected: all 67 tests pass (62 pre-existing + 5 new from Task 1)

- [ ] **Step 5: Run production build**

```
npm run build
```
Expected: clean build, no TypeScript errors

- [ ] **Step 6: Commit and push**

```bash
git add src/features/moderator/pages/ModeratorPage.tsx src/App.tsx src/features/curriculum/pages/ModuleMapPage.tsx
git commit -m "feat: add ModeratorPage with tabbed layout and wire /moderator route"
git push origin master
```

---

## Self-Review

**Spec coverage check (Section 14 of design doc):**

| Requirement | Covered by |
|---|---|
| Comment moderation queue (unresolved `comment_reports`) | Task 2 |
| Recent comments feed across all lessons | Task 3 |
| Comment timeout management (issue / view / revoke) | Task 4 |
| Moderator messages inbox (read and reply) | Task 5 |
| Role-gated route | Task 6 (`ProtectedRoute requiredRole="moderator"`) |
| Nav link only for moderator/admin roles | Task 6 |

**No gaps found.** The `ProtectedRoute` already enforces role hierarchy (admin satisfies `requiredRole="moderator"`), so the route is accessible to both roles without extra code.

**Type consistency check:**
- `ModerationReport` defined in Task 2, used in Task 2 only ✓
- `RecentComment` defined in Task 3, used in Task 3 only ✓
- `ActiveTimeout` defined in Task 4, used in Task 4 only ✓
- `ModeratorMessage` defined in Task 5, used in Task 5 only ✓
- `formatTimeoutExpiry` defined in Task 1, imported in Task 4 ✓
- `formatRelativeTime` imported in Tasks 2, 3, 5 (from existing `src/features/comments/utils/formatRelativeTime.ts`) ✓

**No placeholder language found.**
