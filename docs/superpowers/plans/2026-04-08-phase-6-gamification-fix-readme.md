# Phase 6 — Gamification Fix + README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken badge evaluation (module/quiz/speed badges never fire due to empty progress data being passed to the evaluator), add the missing DB migration for `profiles`/`badge_events` tables, and write the project README.

**Architecture:** Badge evaluation in `useXP.ts` builds a `UserProgressState` from hardcoded empty values. The fix extracts a pure `buildProgressState` function (testable), fetches real data from `progress` and `quiz_attempts` in parallel, and passes it to `evaluateBadges`. The migration adds two missing tables and fixes `leaderboard_cache` column names so setup instructions in the README are accurate.

**Tech Stack:** React 18, TypeScript strict, Supabase JS v2, Vitest (pure function tests only)

---

## Scope note: What was broken

`useXP.ts` lines 87–95 hardcode the `UserProgressState` passed to `evaluateBadges`:

```typescript
const progressState: UserProgressState = {
  completedLessons: [],   // ← always empty
  completedModules: [],   // ← always empty
  xp: newXP,
  streak: newStreak,
  quizScores: {},         // ← always empty
  lessonsToday: 0,        // ← always zero
  projectsPassed: [],
}
```

This means only XP-threshold badges (`century`, `xp_5000`, `xp_10000`) and streak badges (`on_fire`, `dedicated`, `unstoppable`) can ever fire. All 19 module-completion badges, quiz badges (`quiz_ace`, `quiz_legend`), and the speed badge (`speed_learner`) are permanently disabled. The fix fetches real `progress` and `quiz_attempts` rows from Supabase before badge evaluation.

---

## Scope note: Migration discrepancy

`supabase/migrations/001_initial_schema.sql` defines `leaderboard_cache` with columns `total_xp`, `current_streak`, `quiz_accuracy`, `lessons_completed` — but all application code queries `xp`, `streak`, `last_activity_date`, `level`. The migration also omits the `profiles` and `badge_events` tables used by `useXP.ts`. Migration `002` corrects this so any developer following the README can set up a working database.

---

## File Map

```
Create: supabase/migrations/002_fix_schema.sql          (fix leaderboard_cache + add profiles + badge_events)
Modify: src/features/gamification/hooks/useXP.ts        (export buildProgressState, wire real data into awardXP)
Modify: src/features/gamification/hooks/useXP.test.ts   (add 6 tests for buildProgressState)
Create: README.md                                        (full project README per spec section 17)
```

---

## Shared types and imports used throughout

From `src/lib/types.ts`:
```typescript
export interface UserProgressState {
  completedLessons: string[]
  completedModules: string[]
  xp: number
  streak: number
  quizScores: Record<string, number>  // lessonId -> best score
  lessonsToday: number
  projectsPassed: string[]
}
```

`MODULES` from `@/data/curriculum` — `Module[]`. Each module has `id: string` and `lessons: { id: string }[]`.

---

## Task 1: Database migration — fix schema and add missing tables

**Files:**
- Create: `supabase/migrations/002_fix_schema.sql`

This migration is applied manually via the Supabase SQL editor. There are no automated tests for SQL migrations.

- [ ] **Step 1: Create `supabase/migrations/002_fix_schema.sql`**

```sql
-- 002_fix_schema.sql
-- Fixes leaderboard_cache column names to match application code,
-- and adds the profiles and badge_events tables.

-- ── Fix leaderboard_cache ──────────────────────────────────────────────────
-- 001_initial_schema.sql used different column names. These alters bring the
-- schema in line with what the application actually queries and writes.

ALTER TABLE public.leaderboard_cache RENAME COLUMN total_xp TO xp;
ALTER TABLE public.leaderboard_cache RENAME COLUMN current_streak TO streak;
ALTER TABLE public.leaderboard_cache DROP COLUMN IF EXISTS quiz_accuracy;
ALTER TABLE public.leaderboard_cache DROP COLUMN IF EXISTS lessons_completed;
ALTER TABLE public.leaderboard_cache DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.leaderboard_cache ADD COLUMN IF NOT EXISTS last_activity_date date;
ALTER TABLE public.leaderboard_cache ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- Recreate indexes on renamed columns
CREATE INDEX IF NOT EXISTS leaderboard_cache_xp_idx ON public.leaderboard_cache (xp DESC);
CREATE INDEX IF NOT EXISTS leaderboard_cache_streak_idx ON public.leaderboard_cache (streak DESC);

-- ── profiles ──────────────────────────────────────────────────────────────
-- Stores per-user earned badge IDs as a JSONB array.
-- Keyed by user id (same as auth.users id).
CREATE TABLE IF NOT EXISTS public.profiles (
  id               uuid PRIMARY KEY REFERENCES public.users ON DELETE CASCADE,
  earned_badge_ids jsonb NOT NULL DEFAULT '[]'
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: read own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles: upsert own" ON public.profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "profiles: admin" ON public.profiles
  FOR ALL USING (public.current_user_role() = 'admin');

-- ── badge_events ──────────────────────────────────────────────────────────
-- Append-only log of individual badge award events.
CREATE TABLE IF NOT EXISTS public.badge_events (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   uuid NOT NULL REFERENCES public.users ON DELETE CASCADE,
  badge_id  text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badge_events: insert own" ON public.badge_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "badge_events: read own" ON public.badge_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "badge_events: admin" ON public.badge_events
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE INDEX IF NOT EXISTS badge_events_user_id_idx ON public.badge_events (user_id);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/002_fix_schema.sql
git commit -m "feat: add migration to fix leaderboard_cache columns and add profiles/badge_events tables"
```

---

## Task 2: Fix badge evaluation in `useXP.ts`

**Files:**
- Modify: `src/features/gamification/hooks/useXP.ts`
- Modify: `src/features/gamification/hooks/useXP.test.ts`

The fix has two parts:
1. Extract a pure `buildProgressState` function — this is testable
2. Inside `awardXP`, fetch real `progress` and `quiz_attempts` rows from Supabase and pass them to `buildProgressState`

- [ ] **Step 1: Write the failing tests**

Add these tests to `src/features/gamification/hooks/useXP.test.ts` (after the existing `computeNewStreak` tests):

```typescript
import { describe, it, expect } from 'vitest'
import { computeNewStreak, buildProgressState } from './useXP'
import { MODULES } from '@/data/curriculum'

// ... existing computeNewStreak tests unchanged ...

describe('buildProgressState', () => {
  it('maps completedLessons from progress rows', () => {
    const rows = [
      { lesson_id: '1.1', completed_at: '2024-03-15T10:00:00Z' },
      { lesson_id: '1.2', completed_at: '2024-03-15T11:00:00Z' },
    ]
    const result = buildProgressState(rows, [], 500, 1, '2024-03-15')
    expect(result.completedLessons).toEqual(['1.1', '1.2'])
  })

  it('marks a module complete when all its lessons are present', () => {
    const mod = MODULES[0]
    const allLessons = mod.lessons.map(l => ({
      lesson_id: l.id,
      completed_at: '2024-03-15T10:00:00Z',
    }))
    const result = buildProgressState(allLessons, [], 500, 1, '2024-03-15')
    expect(result.completedModules).toContain(mod.id)
  })

  it('does not mark a module complete when some lessons are missing', () => {
    const mod = MODULES[0]
    // All lessons except the last one
    const partialLessons = mod.lessons.slice(0, -1).map(l => ({
      lesson_id: l.id,
      completed_at: '2024-03-15T10:00:00Z',
    }))
    const result = buildProgressState(partialLessons, [], 500, 1, '2024-03-15')
    expect(result.completedModules).not.toContain(mod.id)
  })

  it('uses the best score per lesson for quizScores', () => {
    const quizRows = [
      { lesson_id: '1.1', score: 80 },
      { lesson_id: '1.1', score: 100 },
      { lesson_id: '1.2', score: 60 },
    ]
    const result = buildProgressState([], quizRows, 0, 0, '2024-03-15')
    expect(result.quizScores['1.1']).toBe(100)
    expect(result.quizScores['1.2']).toBe(60)
  })

  it('counts only lessons completed today for lessonsToday', () => {
    const rows = [
      { lesson_id: '1.1', completed_at: '2024-03-15T10:00:00Z' },
      { lesson_id: '1.2', completed_at: '2024-03-14T10:00:00Z' }, // yesterday
      { lesson_id: '1.3', completed_at: '2024-03-15T22:00:00Z' },
    ]
    const result = buildProgressState(rows, [], 500, 1, '2024-03-15')
    expect(result.lessonsToday).toBe(2)
  })

  it('returns empty state for empty inputs', () => {
    const result = buildProgressState([], [], 0, 0, '2024-03-15')
    expect(result.completedLessons).toHaveLength(0)
    expect(result.completedModules).toHaveLength(0)
    expect(result.quizScores).toEqual({})
    expect(result.lessonsToday).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run src/features/gamification/hooks/useXP.test.ts
```
Expected: FAIL with "buildProgressState is not exported"

- [ ] **Step 3: Add `buildProgressState` to `useXP.ts` and wire it into `awardXP`**

Replace the entire file `src/features/gamification/hooks/useXP.ts` with:

```typescript
import { supabase } from '@/lib/supabase'
import { evaluateBadges, getLevel } from '@/data/achievements'
import { MODULES } from '@/data/curriculum'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { UserProgressState } from '@/lib/types'

export function computeNewStreak(
  lastActivityDate: string | null,
  currentDate: string,
  currentStreak: number,
): number {
  if (lastActivityDate === null) return 1

  const last = new Date(lastActivityDate)
  const current = new Date(currentDate)

  // Diff in whole days (both are YYYY-MM-DD so no time component)
  const diffMs = current.getTime() - last.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return currentStreak + 1
  if (diffDays === 0) return currentStreak
  return 1
}

export function buildProgressState(
  progressRows: { lesson_id: string; completed_at: string }[],
  quizRows: { lesson_id: string; score: number }[],
  xp: number,
  streak: number,
  today: string,
): UserProgressState {
  const completedLessons = progressRows.map(r => r.lesson_id)

  // A module is complete when all its lessons appear in completedLessons
  const completedModules = MODULES
    .filter(m => m.lessons.every(l => completedLessons.includes(l.id)))
    .map(m => m.id)

  // Best score per lesson (for quiz badge conditions)
  const quizScores: Record<string, number> = {}
  for (const row of quizRows) {
    quizScores[row.lesson_id] = Math.max(quizScores[row.lesson_id] ?? 0, row.score)
  }

  // Count lessons completed on today's UTC date
  const lessonsToday = progressRows.filter(r => r.completed_at.slice(0, 10) === today).length

  return {
    completedLessons,
    completedModules,
    xp,
    streak,
    quizScores,
    lessonsToday,
    projectsPassed: [],
  }
}

export function useXP(): { awardXP: (amount: number, reason: string) => Promise<void> } {
  const { user } = useAuth()

  async function awardXP(amount: number, _reason: string): Promise<void> {
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
        // Insert badge events for newly earned badges
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

        // Update profiles with merged badge ids
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

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run src/features/gamification/hooks/useXP.test.ts
```
Expected: 11 tests passing (5 existing `computeNewStreak` + 6 new `buildProgressState`)

- [ ] **Step 5: Run full test suite**

```
npx vitest run
```
Expected: 84 tests passing (78 pre-existing + 6 new)

- [ ] **Step 6: Commit**

```bash
git add src/features/gamification/hooks/useXP.ts src/features/gamification/hooks/useXP.test.ts
git commit -m "fix: wire real progress data into badge evaluation in useXP"
```

---

## Task 3: Write `README.md`

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# React Academy

A gamified full-stack learning platform built with React, TypeScript, Supabase, and Tailwind CSS. Students progress through 19 modules — from HTML basics to full-stack deployment — earning XP, levels, streaks, and badges along the way.

## Features

- **19-module curriculum** covering HTML, CSS, JavaScript, TypeScript, Git, React, Databases, Node.js, Supabase, Auth, Testing, and Deployment
- **Gamification**: XP, levels (1–10 + Legend), daily streaks, and 29 unlockable badges
- **Three themes**: Fun (gamified), Pro (clean professional), Dev (dark terminal)
- **Leaderboards**: All-time XP, current streak, quiz accuracy, and most-active boards
- **Discussion**: Per-lesson comment threads with report and timeout system
- **Moderator dashboard**: Comment report queue, recent comments feed, timeout management, and student inbox
- **Admin dashboard**: User management, bug reports queue, analytics with charts, and curriculum content preview
- **Profile page**: XP progress, badge showcase, stats, settings, and moderator reply inbox

## Tech Stack

| Technology | Version | Docs |
|---|---|---|
| React | 18 | https://react.dev |
| TypeScript | 5 | https://www.typescriptlang.org/docs/ |
| Vite | 5 | https://vite.dev |
| Tailwind CSS | 3 | https://tailwindcss.com/docs |
| Supabase JS | v2 | https://supabase.com/docs/reference/javascript |
| React Router | v6 | https://reactrouter.com/en/main |
| Vitest | latest | https://vitest.dev |

## Prerequisites

- **Node.js** v20 or later — https://nodejs.org
- **Supabase account** (free tier works) — https://supabase.com
- **Netlify account** (free tier works) — https://netlify.com
- **GitHub account** for source hosting — https://github.com

## Quick Start (Local Development)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/react-academy.git
cd react-academy
npm install
```

### 2. Add environment variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

See [Supabase Setup](#supabase-setup) for where to get these values.

### 3. Start the dev server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### 4. Run tests

```bash
npm test
```

## Supabase Setup

### 1. Create a project

1. Sign in at https://supabase.com
2. Click **New project**
3. Enter a project name and choose a database password
4. Select a region close to your users
5. Click **Create new project** and wait ~2 minutes for provisioning

### 2. Get your API credentials

1. In your project dashboard, go to **Settings → API**
2. Copy the **Project URL** — this is your `VITE_SUPABASE_URL`
3. Copy the **anon public** key — this is your `VITE_SUPABASE_ANON_KEY`

### 3. Run database migrations

1. In your Supabase dashboard, open the **SQL Editor**
2. Click **New query**, paste the contents of `supabase/migrations/001_initial_schema.sql`, click **Run**
3. Click **New query** again, paste `supabase/migrations/002_fix_schema.sql`, click **Run**

This creates all tables, indexes, Row Level Security policies, and the `handle_new_user` trigger.

### 4. Configure authentication

Go to **Authentication → Providers**:

- **Email**: enabled by default — no action needed
- **Google OAuth** (optional):
  1. Create OAuth credentials at https://console.cloud.google.com
  2. Add `https://YOUR_PROJECT.supabase.co/auth/v1/callback` as an authorised redirect URI
  3. In Supabase, enable Google and paste the Client ID and Client Secret
- **GitHub OAuth** (optional):
  1. Create an OAuth App at https://github.com/settings/developers
  2. Set the callback URL to `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
  3. In Supabase, enable GitHub and paste the Client ID and Client Secret

### 5. Set the site URL

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to your deployed URL (e.g. `https://your-app.netlify.app`)
   - For local development, use `http://localhost:5173`
3. Add the same URL to **Redirect URLs**

### 6. Create the avatars storage bucket

1. Go to **Storage** in your dashboard
2. Click **New bucket**, name it `avatars`, check **Public bucket**, click **Save**
3. Go to **Policies** for the `avatars` bucket and add:
   - **SELECT** policy (public read): allow expression `true`
   - **INSERT** policy (authenticated write): allow expression `auth.uid() IS NOT NULL`

## Netlify Deployment

### 1. Connect your repository

1. Sign in at https://app.netlify.com
2. Click **Add new site → Import an existing project**
3. Select GitHub and authorise Netlify
4. Choose the `react-academy` repository

### 2. Build settings

The `netlify.toml` in the repository is auto-detected — no manual configuration required:

```toml
[build]
  command   = "npm run build"
  publish   = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

### 3. Add environment variables

1. Go to **Site configuration → Environment variables**
2. Click **Add a variable** for each:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
3. Click **Deploy site**

### 4. Update Supabase redirect URLs after deploy

Once Netlify assigns your URL (e.g. `https://rainbow-zebra-abc123.netlify.app`):

1. Go to **Authentication → URL Configuration** in Supabase
2. Update **Site URL** to your Netlify URL
3. Add it to **Redirect URLs**

## GitHub Setup

```bash
# Create a new repository at https://github.com/new, then:
git remote add origin https://github.com/YOUR_USERNAME/react-academy.git
git branch -M main
git push -u origin main
```

> **Never commit `.env`** — it is listed in `.gitignore`.

## Folder Structure

```
src/
├── data/
│   ├── curriculum.ts          # 19 modules with lessons, quizzes, and projects
│   └── achievements.ts        # Badge definitions, level/XP calculations
├── features/
│   ├── auth/                  # Sign in, sign up, onboarding flow
│   ├── bugreport/             # Bug submission form
│   ├── comments/              # Per-lesson comment threads
│   ├── curriculum/            # Module map, lesson page, content renderer
│   ├── gamification/          # XP awarding, streak tracking, badge evaluation
│   ├── leaderboard/           # Four ranked leaderboard boards
│   ├── moderator/             # Moderator dashboard (reports, comments, timeouts, inbox)
│   ├── admin/                 # Admin dashboard (users, bugs, analytics, content)
│   └── profile/               # Profile page (stats, badges, settings, inbox)
├── lib/
│   ├── supabase.ts            # Supabase client singleton
│   └── types.ts               # Shared TypeScript interfaces
├── pages/
│   └── NotFoundPage.tsx       # 404 fallback
├── shared/
│   └── components/            # LoadingSpinner, ProtectedRoute
├── theme/
│   └── ThemeContext.tsx       # fun / pro / dev theme context
└── App.tsx                    # Route definitions
supabase/
└── migrations/
    ├── 001_initial_schema.sql # Core tables, RLS policies, indexes
    └── 002_fix_schema.sql     # Fix leaderboard_cache columns, add profiles + badge_events
```

## Contributing

1. Fork the repo and create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Follow the code conventions:
   - **TypeScript strict mode** — no `any`, no unchecked assertions
   - **Tailwind CSS custom tokens** — use `bg-bg`, `text-text-base`, `text-primary`, etc. (defined in `src/index.css`); avoid arbitrary values
   - **Hook return shape** — `{ data, loading, error: string | null }` with `try/finally` ensuring `setLoading(false)` always runs
   - **State only on success** — only update local state after a confirmed Supabase write, not before

3. Run tests before pushing:
   ```bash
   npm test
   ```

4. Open a pull request against `master` with a clear description of the change.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive README with setup, deployment, and contributing guide"
```

- [ ] **Step 3: Run production build to confirm everything is clean**

```bash
npm run build
```
Expected: clean TypeScript compile + Vite build, no errors.

- [ ] **Step 4: Push**

```bash
git push origin master
```

---

## Self-Review

### Spec coverage (Section 17)

| README requirement | Covered | Notes |
|---|---|---|
| Project overview and feature summary | ✅ Task 3 — opening paragraph + Features section | |
| Technologies used with links | ✅ Task 3 — Tech Stack table with links | |
| Prerequisites (Node.js, accounts) | ✅ Task 3 — Prerequisites section | |
| Local development setup | ✅ Task 3 — Quick Start section | |
| Supabase configuration walkthrough | ✅ Task 3 — full 6-step Supabase Setup section | |
| Netlify deployment walkthrough | ✅ Task 3 — full 4-step Netlify Deployment section | |
| GitHub setup instructions | ✅ Task 3 — GitHub Setup section | |
| Folder structure overview | ✅ Task 3 — Folder Structure section | |
| Contributing guidelines | ✅ Task 3 — Contributing section | |

### Badge evaluation fix — spec coverage (Section 8)

| Badge type | Before fix | After fix |
|---|---|---|
| Module completion (19 badges) | ❌ Never fires — completedModules always `[]` | ✅ Fires when all lessons in module are in `progress` |
| `first_steps` (1 lesson complete) | ❌ Never fires — completedLessons always `[]` | ✅ Fires on first lesson completion |
| `quiz_ace` / `quiz_legend` | ❌ Never fires — quizScores always `{}` | ✅ Fires after 5 / 10 perfect scores |
| `speed_learner` (5 lessons in a day) | ❌ Never fires — lessonsToday always `0` | ✅ Fires after 5 completions on same UTC day |
| XP badges (`century`, `xp_5000`, `xp_10000`) | ✅ Already worked (uses `newXP`) | ✅ Still works |
| Streak badges (`on_fire`, `dedicated`, `unstoppable`) | ✅ Already worked (uses `newStreak`) | ✅ Still works |

### Placeholder scan

No TBD/TODO patterns. Every step has complete code.

### Type consistency

`buildProgressState` returns `UserProgressState` (from `@/lib/types`). `evaluateBadges` accepts `UserProgressState`. `buildProgressState` is called in `awardXP` with the return value passed directly to `evaluateBadges`. Consistent throughout.
