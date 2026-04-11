# Phase 5 — Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Admin Dashboard — a role-gated area for admins covering user search/management, bug report queue, analytics with CSS bar charts, and read-only curriculum content preview.

**Architecture:** All admin code lives in `src/features/admin/`. The existing `ProtectedRoute` with `requiredRole="admin"` gates the `/admin` route. Four tabs compose independent hook+component pairs. Content management full CRUD (drag-and-drop editing) requires a database migration and is intentionally out of scope — this phase builds read-only content preview using the existing static `MODULES` data.

**Tech Stack:** React 18, TypeScript strict, Supabase JS v2, React Router v6, Tailwind CSS v3, Vitest (pure utility tests only — no new packages required)

---

## Scope note: Content Management

The spec calls for add/edit/delete/reorder of modules and lessons. The current curriculum is stored in `src/data/curriculum.ts` (a TypeScript file, not a database table). Full content management CRUD requires new Supabase tables (`modules`, `lessons`, `content_blocks`, `quiz_questions`, `validators`), a data migration, and updates to every component that currently reads from `MODULES`. That work is scoped to a future phase. This plan implements read-only content preview using the static data.

---

## File Map

```
Create: src/features/admin/utils/adminAnalytics.ts           (pure: bucketXP, groupByLesson, groupByStatus)
Create: src/features/admin/utils/adminAnalytics.test.ts
Create: src/features/admin/hooks/useAdminUsers.ts            (search, changeRole, resetProgress)
Create: src/features/admin/components/AdminUserList.tsx      (search UI + user rows + expanded detail)
Create: src/features/admin/hooks/useAdminBugReports.ts       (list + updateStatus)
Create: src/features/admin/components/AdminBugReports.tsx    (filter tabs + report cards)
Create: src/features/admin/hooks/useAdminAnalytics.ts        (summary counts + raw data)
Create: src/features/admin/components/AdminAnalytics.tsx     (summary cards + CSS bar charts)
Create: src/features/admin/components/AdminContentBrowser.tsx (static MODULES tree + lesson preview)
Create: src/features/admin/pages/AdminPage.tsx               (tabbed page: Users/Bug Reports/Analytics/Content)
Modify: src/App.tsx                                           (add /admin route)
Modify: src/features/curriculum/pages/ModuleMapPage.tsx      (add Admin nav link for role === 'admin')
```

---

## Shared types and imports used throughout

Read `src/lib/types.ts` before starting. Relevant types:
- `Role` — `'student' | 'moderator' | 'admin'`
- `Module`, `Lesson`, `ContentBlock`, `QuizQuestion`, `Project`, `Validator`

Existing imports available:
- `supabase` from `@/lib/supabase`
- `useAuth` from `@/features/auth/hooks/useAuth` — `{ user: UserProfile | null }`
- `MODULES` from `@/data/curriculum` — `Module[]` (19 modules, lessons, quiz, projects)
- `ContentRenderer` from `@/features/curriculum/components/ContentRenderer` — `<ContentRenderer block={ContentBlock} />`
- `useTheme` from `@/theme/ThemeContext` — `{ theme, setTheme }`
- `LoadingSpinner` from `@/shared/components/LoadingSpinner`
- `formatRelativeTime` from `@/features/comments/utils/formatRelativeTime`

**Tables used in this plan:**
- `users` — `id, email, display_name, avatar_url, role, created_at`
- `progress` — `user_id, lesson_id, module_id, xp_earned, completed_at`
- `quiz_attempts` — `user_id, lesson_id, score`
- `project_submissions` — `user_id, project_id, passed`
- `leaderboard_cache` — `user_id, xp, streak, level`
- `profiles` — `id (= user_id), earned_badge_ids (jsonb array)`
- `badge_events` — `user_id, badge_id`
- `bug_reports` — `id, reported_by (→ users), page_url, description, expected_behavior, status, created_at`

**Interfaces defined in this plan** (defined in the hook files, imported by components):

```typescript
// useAdminUsers.ts
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

// useAdminBugReports.ts
export type BugStatus = 'new' | 'in_progress' | 'resolved'

export interface AdminBugReport {
  id: string
  pageUrl: string
  description: string
  expectedBehavior: string | null
  status: BugStatus
  createdAt: string
  reporterName: string
}

// useAdminAnalytics.ts
export interface AdminAnalyticsData {
  userCount: number
  lessonCompletions: number
  quizAttempts: number
  projectsPassed: number
  xpBuckets: { label: string; count: number }[]
  topLessons: { lessonId: string; lessonTitle: string; count: number }[]
  bugStatusCounts: { status: string; count: number }[]
  loading: boolean
  error: string | null
}
```

---

## Task 1: `adminAnalytics` pure utilities + tests

**Files:**
- Create: `src/features/admin/utils/adminAnalytics.ts`
- Create: `src/features/admin/utils/adminAnalytics.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/admin/utils/adminAnalytics.test.ts
import { describe, it, expect } from 'vitest'
import { bucketXP, groupByLesson, groupByStatus } from './adminAnalytics'

describe('bucketXP', () => {
  it('assigns 0–499 XP to first bucket', () => {
    const result = bucketXP([0, 100, 499])
    expect(result.find(b => b.label === '0–499')?.count).toBe(3)
  })

  it('assigns 500–999 XP to second bucket', () => {
    const result = bucketXP([500, 750, 999])
    expect(result.find(b => b.label === '500–999')?.count).toBe(3)
  })

  it('assigns 1000–4999 XP to third bucket', () => {
    const result = bucketXP([1000, 2500, 4999])
    expect(result.find(b => b.label === '1,000–4,999')?.count).toBe(3)
  })

  it('assigns 5000–9999 XP to fourth bucket', () => {
    const result = bucketXP([5000, 7500, 9999])
    expect(result.find(b => b.label === '5,000–9,999')?.count).toBe(3)
  })

  it('assigns 10000+ XP to fifth bucket', () => {
    const result = bucketXP([10000, 99999])
    expect(result.find(b => b.label === '10,000+')?.count).toBe(2)
  })

  it('returns all 5 buckets with zero counts for empty input', () => {
    const result = bucketXP([])
    expect(result).toHaveLength(5)
    expect(result.every(b => b.count === 0)).toBe(true)
  })
})

describe('groupByLesson', () => {
  it('counts completions per lesson, sorted descending', () => {
    const rows = [
      { lesson_id: '1.1' }, { lesson_id: '1.1' }, { lesson_id: '1.2' },
    ]
    const result = groupByLesson(rows)
    expect(result[0]).toEqual({ lessonId: '1.1', count: 2 })
    expect(result[1]).toEqual({ lessonId: '1.2', count: 1 })
  })

  it('respects topN limit', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ lesson_id: `${i}.1` }))
    expect(groupByLesson(rows, 5)).toHaveLength(5)
  })

  it('returns empty array for empty input', () => {
    expect(groupByLesson([])).toHaveLength(0)
  })
})

describe('groupByStatus', () => {
  it('counts each status', () => {
    const rows = [
      { status: 'new' }, { status: 'new' }, { status: 'resolved' },
    ]
    const result = groupByStatus(rows)
    expect(result.find(r => r.status === 'new')?.count).toBe(2)
    expect(result.find(r => r.status === 'resolved')?.count).toBe(1)
  })

  it('returns empty array for empty input', () => {
    expect(groupByStatus([])).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/features/admin/utils/adminAnalytics.test.ts
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the implementation**

```typescript
// src/features/admin/utils/adminAnalytics.ts

export interface XPBucket {
  label: string
  count: number
}

export function bucketXP(xpValues: number[]): XPBucket[] {
  const buckets: XPBucket[] = [
    { label: '0–499', count: 0 },
    { label: '500–999', count: 0 },
    { label: '1,000–4,999', count: 0 },
    { label: '5,000–9,999', count: 0 },
    { label: '10,000+', count: 0 },
  ]
  for (const xp of xpValues) {
    if (xp < 500) buckets[0].count++
    else if (xp < 1000) buckets[1].count++
    else if (xp < 5000) buckets[2].count++
    else if (xp < 10000) buckets[3].count++
    else buckets[4].count++
  }
  return buckets
}

export interface LessonCount {
  lessonId: string
  count: number
}

export function groupByLesson(rows: { lesson_id: string }[], topN = 10): LessonCount[] {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.lesson_id] = (counts[row.lesson_id] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([lessonId, count]) => ({ lessonId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

export interface StatusCount {
  status: string
  count: number
}

export function groupByStatus(rows: { status: string }[]): StatusCount[] {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  }
  return Object.entries(counts).map(([status, count]) => ({ status, count }))
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run src/features/admin/utils/adminAnalytics.test.ts
```
Expected: 11 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/utils/adminAnalytics.ts src/features/admin/utils/adminAnalytics.test.ts
git commit -m "feat: add admin analytics pure utilities with tests"
```

---

## Task 2: `useAdminUsers` hook + `AdminUserList` component

**Files:**
- Create: `src/features/admin/hooks/useAdminUsers.ts`
- Create: `src/features/admin/components/AdminUserList.tsx`

- [ ] **Step 1: Create `useAdminUsers.ts`**

```typescript
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
        setLoading(false)
      }
    }
    load()
  }, [search])

  const changeRole = useCallback(async (userId: string, role: Role) => {
    const { error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
    if (!updateError) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    }
  }, [])

  const resetProgress = useCallback(async (userId: string) => {
    await Promise.all([
      supabase.from('progress').delete().eq('user_id', userId),
      supabase.from('quiz_attempts').delete().eq('user_id', userId),
      supabase.from('project_submissions').delete().eq('user_id', userId),
      supabase.from('leaderboard_cache').delete().eq('user_id', userId),
      supabase.from('profiles').update({ earned_badge_ids: [] }).eq('id', userId),
      supabase.from('badge_events').delete().eq('user_id', userId),
    ])
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
    setLoading(true)

    async function load() {
      try {
        const [cacheRes, profileRes, progressRes] = await Promise.all([
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
          supabase
            .from('progress')
            .select('lesson_id', { count: 'exact', head: true })
            .eq('user_id', userId),
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
```

- [ ] **Step 2: Create `AdminUserList.tsx`**

```tsx
// src/features/admin/components/AdminUserList.tsx
import { useState } from 'react'
import { useAdminUsers, useAdminUserDetail } from '../hooks/useAdminUsers'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { formatRelativeTime } from '@/features/comments/utils/formatRelativeTime'
import type { Role } from '@/lib/types'

const ROLE_STYLES: Record<Role, string> = {
  student: 'border-border text-text-muted',
  moderator: 'border-primary/60 text-primary',
  admin: 'border-success text-success',
}

const ROLES: Role[] = ['student', 'moderator', 'admin']

function UserDetail({ userId, onResetProgress }: { userId: string; onResetProgress: () => Promise<void> }) {
  const detail = useAdminUserDetail(userId)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleReset = async () => {
    setResetting(true)
    try {
      await onResetProgress()
      setConfirmReset(false)
    } finally {
      setResetting(false)
    }
  }

  if (detail.loading) return <div className="py-2"><LoadingSpinner /></div>

  return (
    <div className="px-4 py-3 bg-bg border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div>
        <p className="text-xs text-text-muted">XP</p>
        <p className="text-sm font-semibold text-text-base">{detail.xp.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-xs text-text-muted">Level</p>
        <p className="text-sm font-semibold text-text-base">{detail.level} — {detail.levelTitle}</p>
      </div>
      <div>
        <p className="text-xs text-text-muted">Streak</p>
        <p className="text-sm font-semibold text-text-base">{detail.streak} days</p>
      </div>
      <div>
        <p className="text-xs text-text-muted">Progress</p>
        <p className="text-sm font-semibold text-text-base">{detail.lessonCount} lessons · {detail.badgeCount} badges</p>
      </div>
      <div className="col-span-2 sm:col-span-4 flex gap-2 pt-1">
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="px-3 py-1.5 text-xs rounded-theme border border-error text-error hover:bg-bg-secondary transition-colors"
          >
            Reset Progress
          </button>
        ) : (
          <>
            <span className="text-xs text-error self-center">Are you sure? This cannot be undone.</span>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="px-3 py-1.5 text-xs rounded-theme bg-error text-white font-semibold disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Confirm Reset'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-3 py-1.5 text-xs rounded-theme border border-border text-text-muted hover:text-text-base transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function AdminUserList() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { users, loading, error, changeRole, resetProgress } = useAdminUsers(search)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  if (error) return <p className="text-error text-sm">{error}</p>

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 px-3 py-2 text-sm rounded-theme border border-border bg-bg text-text-base focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors"
        >
          Search
        </button>
      </form>

      {loading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <p className="text-text-muted text-sm">No users found.</p>
      ) : (
        <div className="border border-border rounded-theme overflow-hidden">
          {users.map(user => (
            <div key={user.id} className="border-b border-border last:border-b-0">
              {/* Row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary hover:bg-bg transition-colors">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-text-muted">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-base truncate">{user.displayName}</p>
                  <p className="text-xs text-text-muted truncate">{user.email}</p>
                </div>

                {/* Role select */}
                <select
                  value={user.role}
                  onChange={e => changeRole(user.id, e.target.value as Role)}
                  className={`text-xs px-2 py-1 rounded-theme border bg-bg focus:outline-none ${ROLE_STYLES[user.role]}`}
                  aria-label={`Change role for ${user.displayName}`}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                {/* Joined */}
                <span className="text-xs text-text-muted hidden sm:block shrink-0">
                  {formatRelativeTime(user.createdAt)}
                </span>

                {/* Expand toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}
                  className="text-xs text-text-muted hover:text-primary transition-colors shrink-0"
                  aria-label={expandedId === user.id ? 'Collapse user details' : 'Expand user details'}
                >
                  {expandedId === user.id ? '▲' : '▼'}
                </button>
              </div>

              {/* Expanded detail */}
              {expandedId === user.id && (
                <UserDetail
                  userId={user.id}
                  onResetProgress={() => resetProgress(user.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite**

```
npx vitest run
```
Expected: all passing (78 tests: 67 pre-existing + 11 from Task 1)

- [ ] **Step 4: Commit**

```bash
git add src/features/admin/hooks/useAdminUsers.ts src/features/admin/components/AdminUserList.tsx
git commit -m "feat: add admin user management (search, role change, progress reset)"
```

---

## Task 3: `useAdminBugReports` hook + `AdminBugReports` component

**Files:**
- Create: `src/features/admin/hooks/useAdminBugReports.ts`
- Create: `src/features/admin/components/AdminBugReports.tsx`

- [ ] **Step 1: Create `useAdminBugReports.ts`**

```typescript
// src/features/admin/hooks/useAdminBugReports.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type BugStatus = 'new' | 'in_progress' | 'resolved'

export interface AdminBugReport {
  id: string
  pageUrl: string
  description: string
  expectedBehavior: string | null
  status: BugStatus
  createdAt: string
  reporterName: string
}

interface RawBugReport {
  id: string
  page_url: string
  description: string
  expected_behavior: string | null
  status: string
  created_at: string
  reporter: { display_name: string } | null
}

export function useAdminBugReports(): {
  reports: AdminBugReport[]
  loading: boolean
  error: string | null
  updateStatus: (reportId: string, status: BugStatus) => Promise<void>
} {
  const [reports, setReports] = useState<AdminBugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data, error: fetchError } = await supabase
          .from('bug_reports')
          .select('id, page_url, description, expected_behavior, status, created_at, reporter:users!reported_by(display_name)')
          .order('created_at', { ascending: false })

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        const rows = (data ?? []) as unknown as RawBugReport[]
        setReports(
          rows.map(r => ({
            id: r.id,
            pageUrl: r.page_url,
            description: r.description,
            expectedBehavior: r.expected_behavior,
            status: r.status as BugStatus,
            createdAt: r.created_at,
            reporterName: r.reporter?.display_name ?? 'Unknown',
          }))
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateStatus = useCallback(async (reportId: string, status: BugStatus) => {
    const { error: updateError } = await supabase
      .from('bug_reports')
      .update({ status })
      .eq('id', reportId)
    if (!updateError) {
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r))
    }
  }, [])

  return { reports, loading, error, updateStatus }
}
```

- [ ] **Step 2: Create `AdminBugReports.tsx`**

```tsx
// src/features/admin/components/AdminBugReports.tsx
import { useState } from 'react'
import { useAdminBugReports } from '../hooks/useAdminBugReports'
import type { BugStatus } from '../hooks/useAdminBugReports'
import { formatRelativeTime } from '@/features/comments/utils/formatRelativeTime'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

const STATUS_STYLES: Record<BugStatus, string> = {
  new: 'bg-bg border-primary/60 text-primary',
  in_progress: 'bg-bg border-warning text-warning',
  resolved: 'bg-bg border-success text-success',
}

const STATUS_LABELS: Record<BugStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

const ALL_STATUSES: (BugStatus | 'all')[] = ['all', 'new', 'in_progress', 'resolved']

export function AdminBugReports() {
  const { reports, loading, error, updateStatus } = useAdminBugReports()
  const [filter, setFilter] = useState<BugStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter)

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-error text-sm">{error}</p>

  return (
    <div className="flex flex-col gap-4">
      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {ALL_STATUSES.map(s => {
          const count = s === 'all' ? reports.length : reports.filter(r => r.status === s).length
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                filter === s ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-base'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-muted text-sm">No bug reports.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(report => (
            <div key={report.id} className="border border-border rounded-theme bg-bg-secondary overflow-hidden">
              {/* Header row */}
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-muted truncate">{report.pageUrl}</p>
                  <p className="text-sm text-text-base mt-0.5 line-clamp-2">{report.description}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {report.reporterName} · {formatRelativeTime(report.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-theme border font-semibold ${STATUS_STYLES[report.status]}`}>
                    {STATUS_LABELS[report.status]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                    className="text-xs text-text-muted hover:text-primary transition-colors"
                  >
                    {expandedId === report.id ? 'Less ▲' : 'More ▼'}
                  </button>
                </div>
              </div>

              {/* Expanded: expected behavior + status change */}
              {expandedId === report.id && (
                <div className="px-4 pb-4 border-t border-border pt-3 flex flex-col gap-3">
                  {report.expectedBehavior && (
                    <div>
                      <p className="text-xs font-semibold text-text-muted mb-1">Expected behavior</p>
                      <p className="text-sm text-text-base">{report.expectedBehavior}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {(['new', 'in_progress', 'resolved'] as BugStatus[])
                      .filter(s => s !== report.status)
                      .map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateStatus(report.id, s)}
                          className="px-3 py-1.5 text-xs rounded-theme border border-border text-text-muted hover:text-text-base transition-colors"
                        >
                          Mark {STATUS_LABELS[s]}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

Note: the `warning` Tailwind token (`text-warning`, `border-warning`) may not be defined in the project's CSS variables. If the build fails, replace `text-warning` and `border-warning` with `text-yellow-500` and `border-yellow-500` respectively.

- [ ] **Step 3: Run full test suite**

```
npx vitest run
```
Expected: all passing

- [ ] **Step 4: Commit**

```bash
git add src/features/admin/hooks/useAdminBugReports.ts src/features/admin/components/AdminBugReports.tsx
git commit -m "feat: add admin bug reports queue with status management"
```

---

## Task 4: `useAdminAnalytics` hook + `AdminAnalytics` component

**Files:**
- Create: `src/features/admin/hooks/useAdminAnalytics.ts`
- Create: `src/features/admin/components/AdminAnalytics.tsx`

- [ ] **Step 1: Create `useAdminAnalytics.ts`**

```typescript
// src/features/admin/hooks/useAdminAnalytics.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MODULES } from '@/data/curriculum'
import { bucketXP, groupByLesson, groupByStatus } from '../utils/adminAnalytics'

export interface AdminAnalyticsData {
  userCount: number
  lessonCompletions: number
  quizAttempts: number
  projectsPassed: number
  xpBuckets: { label: string; count: number }[]
  topLessons: { lessonId: string; lessonTitle: string; count: number }[]
  bugStatusCounts: { status: string; count: number }[]
  loading: boolean
  error: string | null
}

// Build a lookup map from lessonId -> lesson title from static MODULES data
const LESSON_TITLE_MAP: Record<string, string> = {}
for (const mod of MODULES) {
  for (const lesson of mod.lessons) {
    LESSON_TITLE_MAP[lesson.id] = lesson.title
  }
}

export function useAdminAnalytics(): AdminAnalyticsData {
  const [data, setData] = useState<Omit<AdminAnalyticsData, 'loading' | 'error'>>({
    userCount: 0,
    lessonCompletions: 0,
    quizAttempts: 0,
    projectsPassed: 0,
    xpBuckets: [],
    topLessons: [],
    bugStatusCounts: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [
          userCountRes,
          lessonCountRes,
          quizCountRes,
          projectCountRes,
          xpRes,
          progressLessonsRes,
          bugStatusRes,
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('progress').select('*', { count: 'exact', head: true }),
          supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }),
          supabase.from('project_submissions').select('*', { count: 'exact', head: true }).eq('passed', true),
          supabase.from('leaderboard_cache').select('xp'),
          supabase.from('progress').select('lesson_id'),
          supabase.from('bug_reports').select('status'),
        ])

        const fetchError =
          userCountRes.error ?? lessonCountRes.error ?? quizCountRes.error ??
          projectCountRes.error ?? xpRes.error ?? progressLessonsRes.error ?? bugStatusRes.error

        if (fetchError) {
          setError(fetchError.message)
          return
        }

        const xpValues = (xpRes.data ?? []).map((r: { xp: number }) => r.xp ?? 0)
        const lessonRows = (progressLessonsRes.data ?? []) as { lesson_id: string }[]
        const bugRows = (bugStatusRes.data ?? []) as { status: string }[]

        const rawTopLessons = groupByLesson(lessonRows, 10)

        setData({
          userCount: userCountRes.count ?? 0,
          lessonCompletions: lessonCountRes.count ?? 0,
          quizAttempts: quizCountRes.count ?? 0,
          projectsPassed: projectCountRes.count ?? 0,
          xpBuckets: bucketXP(xpValues),
          topLessons: rawTopLessons.map(l => ({
            lessonId: l.lessonId,
            lessonTitle: LESSON_TITLE_MAP[l.lessonId] ?? l.lessonId,
            count: l.count,
          })),
          bugStatusCounts: groupByStatus(bugRows),
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { ...data, loading, error }
}
```

- [ ] **Step 2: Create `AdminAnalytics.tsx`**

```tsx
// src/features/admin/components/AdminAnalytics.tsx
import { useAdminAnalytics } from '../hooks/useAdminAnalytics'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

interface BarItem {
  label: string
  value: number
  max: number
}

function CSSBarChart({ items, valueLabel = '' }: { items: BarItem[]; valueLabel?: string }) {
  if (items.length === 0) return <p className="text-text-muted text-xs">No data.</p>
  return (
    <div className="flex flex-col gap-2">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-text-muted w-32 shrink-0 truncate text-right">{item.label}</span>
          <div className="flex-1 bg-bg rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: item.max > 0 ? `${Math.round((item.value / item.max) * 100)}%` : '0%' }}
            />
          </div>
          <span className="text-xs text-text-muted w-10 shrink-0 text-right">
            {item.value}{valueLabel}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border rounded-theme p-4 bg-bg-secondary">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-2xl font-bold text-text-base mt-1">{value.toLocaleString()}</p>
    </div>
  )
}

export function AdminAnalytics() {
  const analytics = useAdminAnalytics()

  if (analytics.loading) return <LoadingSpinner />
  if (analytics.error) return <p className="text-error text-sm">{analytics.error}</p>

  const maxXP = Math.max(...analytics.xpBuckets.map(b => b.count), 1)
  const maxLesson = Math.max(...analytics.topLessons.map(l => l.count), 1)
  const maxBug = Math.max(...analytics.bugStatusCounts.map(b => b.count), 1)

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={analytics.userCount} />
        <StatCard label="Lessons Completed" value={analytics.lessonCompletions} />
        <StatCard label="Quiz Attempts" value={analytics.quizAttempts} />
        <StatCard label="Projects Passed" value={analytics.projectsPassed} />
      </div>

      {/* XP distribution */}
      <div className="border border-border rounded-theme p-4 bg-bg-secondary">
        <p className="text-sm font-semibold text-text-base mb-4">XP Distribution</p>
        <CSSBarChart
          items={analytics.xpBuckets.map(b => ({ label: b.label, value: b.count, max: maxXP }))}
          valueLabel=" users"
        />
      </div>

      {/* Top lessons */}
      {analytics.topLessons.length > 0 && (
        <div className="border border-border rounded-theme p-4 bg-bg-secondary">
          <p className="text-sm font-semibold text-text-base mb-4">Most Completed Lessons (top 10)</p>
          <CSSBarChart
            items={analytics.topLessons.map(l => ({
              label: l.lessonTitle,
              value: l.count,
              max: maxLesson,
            }))}
          />
        </div>
      )}

      {/* Bug report status */}
      {analytics.bugStatusCounts.length > 0 && (
        <div className="border border-border rounded-theme p-4 bg-bg-secondary">
          <p className="text-sm font-semibold text-text-base mb-4">Bug Reports by Status</p>
          <CSSBarChart
            items={analytics.bugStatusCounts.map(b => ({
              label: b.status,
              value: b.count,
              max: maxBug,
            }))}
          />
        </div>
      )}
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
git add src/features/admin/hooks/useAdminAnalytics.ts src/features/admin/components/AdminAnalytics.tsx
git commit -m "feat: add admin analytics with summary stats and CSS bar charts"
```

---

## Task 5: `AdminContentBrowser` component

**Files:**
- Create: `src/features/admin/components/AdminContentBrowser.tsx`

- [ ] **Step 1: Create `AdminContentBrowser.tsx`**

```tsx
// src/features/admin/components/AdminContentBrowser.tsx
import { useState } from 'react'
import { MODULES } from '@/data/curriculum'
import { ContentRenderer } from '@/features/curriculum/components/ContentRenderer'
import { useTheme } from '@/theme/ThemeContext'
import type { Theme } from '@/lib/types'
import type { Lesson, Module } from '@/lib/types'

const THEMES: Theme[] = ['fun', 'pro', 'dev']

export function AdminContentBrowser() {
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(MODULES[0]?.id ?? null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()

  const selectedLesson: Lesson | undefined = MODULES.flatMap(m => m.lessons).find(l => l.id === selectedLessonId)
  const selectedModule: Module | undefined = MODULES.find(m => m.lessons.some(l => l.id === selectedLessonId))

  return (
    <div className="flex gap-4">
      {/* Sidebar: module/lesson tree */}
      <div className="w-56 shrink-0 border border-border rounded-theme overflow-y-auto max-h-[70vh]">
        {MODULES.map(mod => (
          <div key={mod.id} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => setExpandedModuleId(expandedModuleId === mod.id ? null : mod.id)}
              className={`w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-bg-secondary transition-colors ${
                expandedModuleId === mod.id ? 'text-primary' : 'text-text-base'
              }`}
            >
              <span className="truncate">{mod.icon} {mod.title}</span>
              <span className="text-text-muted ml-1 shrink-0">{expandedModuleId === mod.id ? '▲' : '▼'}</span>
            </button>
            {expandedModuleId === mod.id && (
              <div>
                {mod.lessons.map(lesson => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`w-full text-left px-4 py-2 text-xs border-t border-border hover:bg-bg-secondary transition-colors ${
                      selectedLessonId === lesson.id
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-text-muted'
                    }`}
                  >
                    {lesson.id} — {lesson.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preview panel */}
      <div className="flex-1 min-w-0">
        {!selectedLesson ? (
          <p className="text-text-muted text-sm">Select a lesson from the sidebar to preview its content.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Theme toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Preview theme:</span>
              {THEMES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`px-3 py-1 text-xs rounded-theme border transition-colors ${
                    theme === t ? 'border-primary text-primary' : 'border-border text-text-muted hover:border-primary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Lesson header */}
            <div>
              <p className="text-xs text-text-muted">
                {selectedModule?.title} · Lesson {selectedLesson.id}
              </p>
              <h2 className="text-xl font-bold text-text-base mt-1">{selectedLesson.title}</h2>
              <p className="text-xs text-text-muted mt-1">
                {selectedLesson.duration} min · {selectedLesson.xpReward} XP reward
              </p>
            </div>

            {/* Content blocks */}
            <div className="border border-border rounded-theme p-4 bg-bg-secondary">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                Content ({selectedLesson.content.length} blocks)
              </p>
              {selectedLesson.content.map((block, i) => (
                <ContentRenderer key={i} block={block} />
              ))}
            </div>

            {/* Quiz */}
            <div className="border border-border rounded-theme p-4 bg-bg-secondary">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                Quiz ({selectedLesson.quiz.length} questions)
              </p>
              {selectedLesson.quiz.map((q, i) => (
                <div key={i} className="mb-4 last:mb-0">
                  <p className="text-sm font-semibold text-text-base mb-2">Q{i + 1}: {q.question}</p>
                  <ul className="flex flex-col gap-1">
                    {q.options.map((opt, j) => (
                      <li
                        key={j}
                        className={`text-xs px-3 py-1.5 rounded-theme border ${
                          j === q.correct
                            ? 'border-success bg-success/5 text-success font-semibold'
                            : 'border-border text-text-muted'
                        }`}
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Practice project */}
            {selectedLesson.project && (
              <div className="border border-border rounded-theme p-4 bg-bg-secondary">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                  Practice Project
                </p>
                <p className="text-sm font-semibold text-text-base">{selectedLesson.project.title}</p>
                <p className="text-sm text-text-muted mt-1 mb-3">{selectedLesson.project.description}</p>
                <ul className="flex flex-col gap-1.5">
                  {selectedLesson.project.validators.map(v => (
                    <li key={v.id} className="flex items-start gap-2 text-xs">
                      <span className={v.required ? 'text-text-base' : 'text-success shrink-0'}>
                        {v.required ? '●' : '◆'}
                      </span>
                      <span className="text-text-base">{v.description}</span>
                      {!v.required && (
                        <span className="ml-auto text-success shrink-0">+{v.bonusXP} XP</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```
npx vitest run
```
Expected: all passing

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/components/AdminContentBrowser.tsx
git commit -m "feat: add admin content browser with lesson preview and theme toggle"
```

---

## Task 6: `AdminPage` + `/admin` route + nav link

**Files:**
- Create: `src/features/admin/pages/AdminPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/features/curriculum/pages/ModuleMapPage.tsx`

- [ ] **Step 1: Create `AdminPage.tsx`**

```tsx
// src/features/admin/pages/AdminPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminUserList } from '../components/AdminUserList'
import { AdminBugReports } from '../components/AdminBugReports'
import { AdminAnalytics } from '../components/AdminAnalytics'
import { AdminContentBrowser } from '../components/AdminContentBrowser'
import { useAuth } from '@/features/auth/hooks/useAuth'

type Tab = 'users' | 'bugs' | 'analytics' | 'content'

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'bugs', label: 'Bug Reports' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'content', label: 'Content' },
]

export function AdminPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('users')

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-text-muted hover:text-primary transition-colors text-sm">
              ← Home
            </Link>
            <span className="text-text-muted text-sm">/</span>
            <h1 className="text-lg font-bold text-text-base">Admin Dashboard</h1>
          </div>
          <span className="text-xs text-text-muted hidden sm:block">{user?.display_name}</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
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
        {activeTab === 'users' && <AdminUserList />}
        {activeTab === 'bugs' && <AdminBugReports />}
        {activeTab === 'analytics' && <AdminAnalytics />}
        {activeTab === 'content' && <AdminContentBrowser />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modify `src/App.tsx` — add the `/admin` route**

Read the current file first. Add this import after the existing feature imports:
```typescript
import { AdminPage } from '@/features/admin/pages/AdminPage'
```

Add this route before `<Route path="*" ...>`:
```tsx
<Route
  path="/admin"
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminPage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Modify `src/features/curriculum/pages/ModuleMapPage.tsx` — add Admin nav link**

Find the existing `<nav>` block:
```tsx
<nav className="hidden sm:flex gap-3 text-sm">
  <Link to="/leaderboard" className="text-text-muted hover:text-primary transition-colors">Leaderboard</Link>
  <Link to="/profile" className="text-text-muted hover:text-primary transition-colors">{user?.display_name}</Link>
  {(user?.role === 'moderator' || user?.role === 'admin') && (
    <Link to="/moderator" className="text-text-muted hover:text-primary transition-colors">Moderation</Link>
  )}
</nav>
```

Replace with (add Admin link for role === 'admin' only):
```tsx
<nav className="hidden sm:flex gap-3 text-sm">
  <Link to="/leaderboard" className="text-text-muted hover:text-primary transition-colors">Leaderboard</Link>
  <Link to="/profile" className="text-text-muted hover:text-primary transition-colors">{user?.display_name}</Link>
  {(user?.role === 'moderator' || user?.role === 'admin') && (
    <Link to="/moderator" className="text-text-muted hover:text-primary transition-colors">Moderation</Link>
  )}
  {user?.role === 'admin' && (
    <Link to="/admin" className="text-text-muted hover:text-primary transition-colors">Admin</Link>
  )}
</nav>
```

- [ ] **Step 4: Run full test suite**

```
npx vitest run
```
Expected: 78 tests passing (67 pre-existing + 11 from Task 1)

- [ ] **Step 5: Run production build**

```
npm run build
```
Expected: clean TypeScript compile + Vite build, no errors.

If `text-warning` / `border-warning` causes a build error (these tokens are not in the project's Tailwind config), fix them in `AdminBugReports.tsx` by replacing:
- `text-warning` → `text-yellow-500`
- `border-warning` → `border-yellow-500`

- [ ] **Step 6: Commit and push**

```bash
git add src/features/admin/pages/AdminPage.tsx src/App.tsx src/features/curriculum/pages/ModuleMapPage.tsx
git commit -m "feat: add AdminPage with tabbed layout and wire /admin route"
git push origin master
```

---

## Self-Review

**Spec coverage check (Section 13 of design doc):**

| Requirement | Covered | Notes |
|---|---|---|
| Search and filter student/moderator accounts | ✅ Task 2 — search by name/email, limit 100 | |
| View individual student progress, XP, badges, streak | ✅ Task 2 — `useAdminUserDetail` expands on row click | |
| Change roles | ✅ Task 2 — inline role select per row | |
| Reset student progress | ✅ Task 2 — confirm + delete from 5 tables | |
| Review and resolve comment reports | ⚠️ Moderator Dashboard (Phase 4) covers this; admins access `/moderator` route | |
| Manage bug reports | ✅ Task 3 — list, filter, update status | |
| Active users charts | ✅ Task 4 — summary stats (count metrics), CSS bar charts | |
| Module completion rates | Partial — top lessons by completion shown; per-module completion rate requires GROUP BY not easily done in Supabase JS client | |
| Average quiz score per lesson | Not included — requires GROUP BY per lesson_id on quiz_attempts; deferred | |
| New signups over time | Not included — requires date-bucket query; deferred | |
| XP distribution | ✅ Task 4 — XP buckets chart | |
| Bug reports queue with status management | ✅ Task 4 (counts) + Task 3 (management) | |
| Add/edit/delete curriculum | ❌ Out of scope — requires new DB tables (see scope note above) | |
| Drag-and-drop reorder | ❌ Out of scope — requires new DB tables | |
| Preview lesson in any theme | ✅ Task 5 — static browse + theme toggle | |
| Suspend accounts | ❌ Not in DB schema — `users` has no `suspended` field; requires migration | |

**Gaps addressed:**
- Average quiz score per lesson and new-signups-over-time charts are omitted because they require GROUP BY queries that aren't natively supported in the Supabase JS client without a database function or RPC. These can be added in a future iteration by creating a Supabase DB function.
- Suspend accounts requires adding a `suspended_at` or `suspended` column to the `users` table — a DB migration outside this plan's scope.

**Placeholder scan:** No placeholders found.

**Type consistency check:**
- `AdminUser` defined in Task 2, used only in Task 2 ✓
- `AdminUserDetail` defined in Task 2, used only in Task 2 ✓
- `AdminBugReport` / `BugStatus` defined in Task 3, used only in Task 3 ✓
- `AdminAnalyticsData` defined in Task 4, used only in Task 4 ✓
- `XPBucket` / `LessonCount` / `StatusCount` from Task 1 imported into Task 4 ✓
- `ContentRenderer` accepts `block: ContentBlock` — used in Task 5 passing `selectedLesson.content` items ✓
