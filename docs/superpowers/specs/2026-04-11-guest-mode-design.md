# Guest Mode Design

**Date:** 2026-04-11  
**Status:** Approved

## Overview

Allow unauthenticated users to preview the full learning experience by continuing as a guest. Guests access all learning content (module map + lessons) with full interactivity. Progress is persisted to `localStorage` so it survives page refreshes within the same browser. A prompt after lesson/quiz completion encourages sign-up. On sign-up, guest progress is migrated to the new account.

## User Experience

### Auth Page
A "Continue as Guest" button appears below the sign-in form, separated by an "or" divider. A short note below the button reads: "Your progress will be saved in this browser. Sign up any time to keep it permanently."

### Module Map (guest nav)
- Leaderboard and Profile nav links are visible but muted/struck-through.
- A tooltip reading "Sign in to access" appears on hover.
- A "Sign Up" button is always visible in the header.
- A thin persistent banner at the top reads: "Browsing as guest — Sign up to save permanently."
- No avatar is shown.

### Lesson / Quiz
Guests get the full interactive experience — they can read content, take quizzes, and complete projects. After a lesson is marked complete, a non-blocking inline banner appears:

**Comments:** The `CommentSection` is hidden for guests (the `comments` RLS policy requires `auth.uid() is not null`, so queries would silently fail). In its place, a single line reads: "Sign in to join the discussion." This is an addition to `LessonPage` — no changes needed to `CommentSection` itself.

> 💾 **Don't lose your progress** — Create a free account to save permanently across all devices.  
> [Sign Up Free] [Continue Learning →]

The "Continue Learning →" button dismisses the banner and navigates back to the module map. The guest is never blocked from proceeding.

### Blocked routes
`/leaderboard` and `/profile` redirect guests to `/auth` if accessed directly (e.g., via URL). Nav links for these are grayed out and non-navigable in the UI.

## Architecture

### Auth Layer (`useAuth.tsx`)

Three additions to `AuthContextValue`:
- `isGuest: boolean` — backed by a `useState<boolean>` in `AuthProvider`, initialized from `localStorage.getItem('guest_mode') === 'true'`
- `continueAsGuest(): void` — calls `localStorage.setItem('guest_mode', 'true')` then `setIsGuest(true)`
- `clearGuest(): void` — removes `guest_mode`, `guest_progress`, `guest_xp` from localStorage and calls `setIsGuest(false)`

`signUp` calls `migrateGuestProgress(data.user.id)` then `clearGuest()` on success.  
`signOut` calls `clearGuest()`.

`AuthPage` reads `isGuest` and treats it the same as `user` for the redirect check (guests who revisit `/auth` are redirected to `/`).

### Routing (`ProtectedRoute.tsx`)

Current: blocks when `user === null`.  
Updated: also passes through when `isGuest === true` and no `requiredRole` is set.  
Role-gated routes (`requiredRole` set) still block guests unconditionally — they redirect to `/auth`.

### Guest Progress Storage

Three `localStorage` keys:

| Key | Type | Contents |
|-----|------|----------|
| `guest_mode` | `"true"` \| absent | Guest session flag |
| `guest_progress` | JSON string | `{ lessons: [{lesson_id, module_id, completed_at, xp_earned}], quizScores: Record<string,number>, projectsPassed: string[] }` |
| `guest_xp` | JSON string | Accumulated XP as a number |

### Progress Hook (`useProgress.tsx`)

The `useEffect` currently resets to empty state when `user === null`. Updated behavior:
- If `!user && isGuest`: load from `guest_progress` localStorage key.
- If `!user && !isGuest`: reset to empty (unchanged).

Write-path functions (`completeLesson`, `saveQuizAttempt`, `completeProject`) branch to localStorage writes when `isGuest`, skipping all Supabase calls.

### XP Hook (`useXP.ts`)

`awardXP` checks `isGuest` at the top. If true: increment `guest_xp` in localStorage and return. No Supabase calls, no badge evaluation — badges require a real account.

## Migration (`migrateGuestProgress.ts`)

Called from `signUp` after a successful account creation. Location: `src/features/auth/utils/migrateGuestProgress.ts`.

Steps:
1. Read and parse `guest_progress` and `guest_xp` from localStorage.
2. If empty, return early (nothing to migrate).
3. Upsert progress rows to Supabase `progress` table using `INSERT ... ON CONFLICT (user_id, lesson_id) DO NOTHING`.
4. If `guest_xp > 0`, upsert `leaderboard_cache` adding guest XP to any existing total.
5. On completion (success or failure), clear `guest_progress` and `guest_xp`.

**Error handling:** Wrapped in try/catch. On failure, log the error and clear localStorage keys anyway. The user gets a working account; guest progress is lost (same outcome as before migration existed). No error is surfaced to the UI.

Migration only happens on **sign-up**, not sign-in, to avoid merging guest data into an existing account with real history.

## Files Changed

### New
- `src/features/auth/utils/migrateGuestProgress.ts`
- `src/features/auth/utils/migrateGuestProgress.test.ts`

### Modified
- `src/features/auth/hooks/useAuth.tsx`
- `src/shared/components/ProtectedRoute.tsx`
- `src/features/auth/pages/AuthPage.tsx`
- `src/features/curriculum/hooks/useProgress.tsx`
- `src/features/gamification/hooks/useXP.ts`
- `src/features/curriculum/pages/ModuleMapPage.tsx`
- `src/features/curriculum/pages/LessonPage.tsx`

## Testing

- `migrateGuestProgress.test.ts`: unit tests with mocked Supabase. Verifies upsert called with correct rows, localStorage cleared on success, localStorage cleared on failure (error swallowed).
- No new tests for `useProgress` or `useXP` guest paths — the localStorage branch is trivial and the data contract is covered by migration tests.
- Existing `useXP.test.ts` suite (computeNewStreak, buildProgressState) unaffected.
