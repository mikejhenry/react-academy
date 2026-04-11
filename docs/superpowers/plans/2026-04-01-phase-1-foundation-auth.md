# Phase 1: Foundation & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the complete project foundation — TypeScript, Tailwind, Supabase, three-theme system, and a fully working auth + onboarding flow — so a student can sign up, choose their theme, and land on a stub module map.

**Architecture:** Feature-module SPA (React 18 + Vite + TypeScript). Auth state lives in a React Context backed by Supabase Auth (email/password + Google + GitHub OAuth). Theme state lives in a separate ThemeContext that injects CSS custom properties and a tokens object consumed by all components. Onboarding is a 4-step wizard that runs once after first sign-up.

**Tech Stack:** React 18, Vite 5, TypeScript, React Router v6, Tailwind CSS, Supabase JS v2, Zustand, Vitest, @testing-library/react

---

## Phase Deliverable

At the end of this phase:
- `npm run dev` starts the app
- A new user can sign up with email/password or Google/GitHub OAuth
- Onboarding wizard runs: display name → theme selection → welcome screen
- User lands on a stub Module Map page
- Returning user is redirected straight to the Module Map
- All three themes visually apply to the auth/onboarding screens
- `npm test` passes

---

## File Map

```
(new unless marked modify)
vite.config.ts                                    MODIFY — add test config
tsconfig.json                                     CREATE
tailwind.config.ts                                CREATE
postcss.config.js                                 CREATE
src/index.css                                     MODIFY — add CSS custom properties
src/main.tsx                                      MODIFY — wrap with providers
src/App.tsx                                       MODIFY — add router + protected routes
.env.example                                      CREATE
.gitignore                                        MODIFY — add .env, .superpowers/
netlify.toml                                      CREATE

src/lib/supabase.ts                               CREATE — Supabase client singleton
src/lib/types.ts                                  CREATE — shared TypeScript interfaces

src/theme/tokens.ts                               CREATE — color/font/animation tokens for 3 themes
src/theme/ThemeContext.tsx                        CREATE — ThemeContext + useTheme hook

src/features/auth/hooks/useAuth.ts                CREATE — AuthContext + useAuth hook
src/features/auth/components/OAuthButtons.tsx     CREATE — Google + GitHub sign-in buttons
src/features/auth/components/SignUpForm.tsx       CREATE — email/password sign-up form
src/features/auth/components/LoginForm.tsx        CREATE — email/password login form
src/features/auth/components/ProfileSetup.tsx     CREATE — display name + avatar step
src/features/auth/components/ThemeSelector.tsx    CREATE — theme picker with live previews
src/features/auth/components/WelcomeScreen.tsx    CREATE — theme-specific welcome animation
src/features/auth/pages/AuthPage.tsx              CREATE — login/signup page
src/features/auth/pages/OnboardingPage.tsx        CREATE — 4-step onboarding wizard

src/shared/components/ProtectedRoute.tsx          CREATE — redirect unauthenticated users
src/shared/components/LoadingSpinner.tsx          CREATE — themed loading indicator

src/pages/ModuleMapStub.tsx                       CREATE — empty shell, "Coming in Phase 2"
src/pages/NotFoundPage.tsx                        CREATE

src/data/curriculum.ts                            CREATE — migrate + type curriculum.js
src/data/achievements.ts                          CREATE — migrate + update for 19 modules

supabase/migrations/001_initial_schema.sql        CREATE — all tables + RLS policies

Tests:
src/theme/tokens.test.ts
src/features/auth/hooks/useAuth.test.ts
```

---

## Task 1: Install dependencies and configure TypeScript

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Modify: `vite.config.js` → `vite.config.ts`
- Create: `postcss.config.js`

- [ ] **Step 1: Install all required packages**

```bash
cd "C:\Users\johns\Full Stack AI Assisted Projects\React learning App"
npm install @supabase/supabase-js zustand clsx tailwindcss postcss autoprefixer @tailwindcss/typography
npm install -D typescript @types/node vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npx tailwindcss init -p
```

Expected: No errors. `node_modules/@supabase`, `node_modules/zustand`, `node_modules/tailwindcss` all present.

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Rename `vite.config.js` to `vite.config.ts` and replace its contents**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 5: Create `src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Update `package.json` scripts**

Replace the `"scripts"` section with:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors (only `src/main.jsx` may warn — rename it in the next task).

- [ ] **Step 8: Commit**

```bash
git init
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts postcss.config.js src/test-setup.ts
git commit -m "chore: set up TypeScript, Tailwind, Vitest"
```

---

## Task 2: Configure Tailwind with CSS custom properties for three themes

**Files:**
- Create: `tailwind.config.ts`
- Modify: `src/index.css`

- [ ] **Step 1: Replace `tailwind.config.js` (created by init) with `tailwind.config.ts`**

Delete `tailwind.config.js` and create `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        'bg-secondary': 'var(--color-bg-secondary)',
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'text-base': 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        border: 'var(--color-border)',
        card: 'var(--color-card)',
      },
      fontFamily: {
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        theme: 'var(--radius)',
      },
    },
  },
  plugins: [typography],
} satisfies Config
```

- [ ] **Step 2: Replace `src/index.css` with theme-aware CSS custom properties**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Fun & Gamified theme ─────────────────────────────── */
[data-theme='fun'] {
  --color-bg: #fff7ed;
  --color-bg-secondary: #fef3c7;
  --color-text: #1c1917;
  --color-text-muted: #78716c;
  --color-primary: #f97316;
  --color-primary-hover: #ea580c;
  --color-success: #22c55e;
  --color-warning: #eab308;
  --color-error: #ef4444;
  --color-border: #fed7aa;
  --color-card: #ffffff;
  --font-body: 'Nunito', 'Segoe UI', sans-serif;
  --font-mono: 'Fira Code', monospace;
  --radius: 1rem;
}

/* ── Clean & Professional theme ──────────────────────── */
[data-theme='pro'] {
  --color-bg: #f8fafc;
  --color-bg-secondary: #f1f5f9;
  --color-text: #0f172a;
  --color-text-muted: #64748b;
  --color-primary: #0f172a;
  --color-primary-hover: #1e293b;
  --color-success: #16a34a;
  --color-warning: #ca8a04;
  --color-error: #dc2626;
  --color-border: #e2e8f0;
  --color-card: #ffffff;
  --font-body: 'Inter', 'Segoe UI', sans-serif;
  --font-mono: 'Fira Code', monospace;
  --radius: 0.5rem;
}

/* ── Dark Developer theme ────────────────────────────── */
[data-theme='dev'] {
  --color-bg: #0d1117;
  --color-bg-secondary: #161b22;
  --color-text: #e6edf3;
  --color-text-muted: #8b949e;
  --color-primary: #3fb950;
  --color-primary-hover: #2ea043;
  --color-success: #3fb950;
  --color-warning: #d29922;
  --color-error: #f85149;
  --color-border: #30363d;
  --color-card: #161b22;
  --font-body: 'JetBrains Mono', 'Fira Code', monospace;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --radius: 0.375rem;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  transition: background-color 0.2s ease, color 0.2s ease;
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts src/index.css
git commit -m "chore: configure Tailwind with three-theme CSS custom properties"
```

---

## Task 3: Shared TypeScript types and Supabase client

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/supabase.ts`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create `src/lib/types.ts`**

```typescript
export type Theme = 'fun' | 'pro' | 'dev'
export type Role = 'student' | 'moderator' | 'admin'

export interface UserProfile {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  theme: Theme
  role: Role
  created_at: string
  last_active_at: string | null
}

export interface Module {
  id: string
  title: string
  icon: string
  description: string
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  title: string
  duration: number
  xpReward: number
  content: ContentBlock[]
  quiz: QuizQuestion[]
  project?: Project
}

export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'heading'; content: string }
  | { type: 'code'; language: string; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'tip'; content: string }
  | { type: 'warning'; content: string }

export interface QuizQuestion {
  question: string
  options: string[]
  correct: number
  type?: 'multiple-choice' | 'true-false' | 'fill-blank'
  pattern?: string  // regex pattern for fill-blank validation
}

export interface Validator {
  id: string
  description: string
  type: 'contains' | 'regex' | 'element' | 'property'
  value: string
  required: boolean
  bonusXP: number
}

export interface Project {
  id: string
  title: string
  description: string
  xpReward: number
  validators: Validator[]
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  condition: (progress: UserProgressState) => boolean
}

export interface UserProgressState {
  completedLessons: string[]
  completedModules: string[]
  xp: number
  streak: number
  quizScores: Record<string, number>
  lessonsToday: number
  projectsPassed: string[]
}
```

- [ ] **Step 2: Create `.env.example`**

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 3: Create `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Copy .env.example to .env and fill in values.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 4: Update `.gitignore`**

Add to the existing `.gitignore` (create it if it doesn't exist):

```
# Environment
.env
.env.local
.env.*.local

# Dependencies
node_modules/

# Build
dist/

# Editor
.vscode/
.idea/

# Superpowers
.superpowers/

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/supabase.ts .env.example .gitignore
git commit -m "chore: add Supabase client, shared types, env config"
```

---

## Task 4: Database migration SQL

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create `supabase/migrations/001_initial_schema.sql`**

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── users ─────────────────────────────────────────────
create table public.users (
  id            uuid primary key references auth.users on delete cascade,
  email         text not null,
  display_name  text not null default '',
  avatar_url    text,
  theme         text not null default 'pro' check (theme in ('fun', 'pro', 'dev')),
  role          text not null default 'student' check (role in ('student', 'moderator', 'admin')),
  created_at    timestamptz not null default now(),
  last_active_at timestamptz
);

-- Auto-create user row on auth sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── progress ──────────────────────────────────────────
create table public.progress (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users on delete cascade,
  module_id    text not null,
  lesson_id    text not null,
  completed_at timestamptz not null default now(),
  xp_earned    integer not null default 0,
  unique (user_id, lesson_id)
);

-- ── quiz_attempts ─────────────────────────────────────
create table public.quiz_attempts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users on delete cascade,
  lesson_id    text not null,
  score        integer not null,
  max_score    integer not null,
  answers      jsonb not null default '[]',
  completed_at timestamptz not null default now()
);

-- ── project_submissions ───────────────────────────────
create table public.project_submissions (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.users on delete cascade,
  project_id        text not null,
  submitted_code    text not null,
  passed            boolean not null default false,
  validator_results jsonb not null default '[]',
  submitted_at      timestamptz not null default now()
);

-- ── streaks ───────────────────────────────────────────
create table public.streaks (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references public.users on delete cascade unique,
  current_streak     integer not null default 0,
  longest_streak     integer not null default 0,
  last_activity_date date
);

-- ── badges ────────────────────────────────────────────
create table public.badges (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references public.users on delete cascade,
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

-- ── leaderboard_cache ─────────────────────────────────
create table public.leaderboard_cache (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.users on delete cascade unique,
  total_xp          integer not null default 0,
  current_streak    integer not null default 0,
  quiz_accuracy     numeric(5,2) not null default 0,
  lessons_completed integer not null default 0,
  updated_at        timestamptz not null default now()
);

-- ── comments ──────────────────────────────────────────
create table public.comments (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users on delete cascade,
  lesson_id  text not null,
  content    text not null,
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── comment_reports ───────────────────────────────────
create table public.comment_reports (
  id          uuid primary key default uuid_generate_v4(),
  comment_id  uuid not null references public.comments on delete cascade,
  reported_by uuid not null references public.users on delete cascade,
  reason      text not null check (reason in ('spam', 'inappropriate', 'gives_away_answer', 'other')),
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── comment_timeouts ──────────────────────────────────
create table public.comment_timeouts (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users on delete cascade,
  issued_by  uuid not null references public.users,
  expires_at timestamptz not null,
  reason     text not null,
  created_at timestamptz not null default now()
);

-- ── moderator_messages ────────────────────────────────
create table public.moderator_messages (
  id               uuid primary key default uuid_generate_v4(),
  from_user_id     uuid not null references public.users on delete cascade,
  subject          text not null,
  message          text not null,
  moderator_reply  text,
  replied_by       uuid references public.users,
  created_at       timestamptz not null default now(),
  resolved         boolean not null default false
);

-- ── bug_reports ───────────────────────────────────────
create table public.bug_reports (
  id                uuid primary key default uuid_generate_v4(),
  reported_by       uuid not null references public.users on delete cascade,
  page_url          text not null,
  description       text not null,
  expected_behavior text not null,
  status            text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  created_at        timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════

alter table public.users enable row level security;
alter table public.progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.project_submissions enable row level security;
alter table public.streaks enable row level security;
alter table public.badges enable row level security;
alter table public.leaderboard_cache enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reports enable row level security;
alter table public.comment_timeouts enable row level security;
alter table public.moderator_messages enable row level security;
alter table public.bug_reports enable row level security;

-- Helper: get current user role
create or replace function public.current_user_role()
returns text language sql security definer
as $$ select role from public.users where id = auth.uid() $$;

-- users
create policy "users: read own" on public.users for select using (id = auth.uid());
create policy "users: update own" on public.users for update using (id = auth.uid());
create policy "users: admin full" on public.users using (public.current_user_role() = 'admin');

-- progress
create policy "progress: own" on public.progress using (user_id = auth.uid());
create policy "progress: admin" on public.progress using (public.current_user_role() = 'admin');

-- quiz_attempts
create policy "quiz_attempts: own" on public.quiz_attempts using (user_id = auth.uid());
create policy "quiz_attempts: admin" on public.quiz_attempts using (public.current_user_role() = 'admin');

-- project_submissions
create policy "project_submissions: own" on public.project_submissions using (user_id = auth.uid());
create policy "project_submissions: admin" on public.project_submissions using (public.current_user_role() = 'admin');

-- streaks
create policy "streaks: own" on public.streaks using (user_id = auth.uid());
create policy "streaks: admin" on public.streaks using (public.current_user_role() = 'admin');

-- badges
create policy "badges: read own" on public.badges for select using (user_id = auth.uid());
create policy "badges: insert own" on public.badges for insert with check (user_id = auth.uid());
create policy "badges: admin" on public.badges using (public.current_user_role() = 'admin');

-- leaderboard_cache (all authenticated users can read)
create policy "leaderboard: read all" on public.leaderboard_cache for select using (auth.uid() is not null);
create policy "leaderboard: upsert own" on public.leaderboard_cache for all using (user_id = auth.uid());
create policy "leaderboard: admin" on public.leaderboard_cache using (public.current_user_role() = 'admin');

-- comments
create policy "comments: read all" on public.comments for select using (auth.uid() is not null);
create policy "comments: insert own" on public.comments for insert with check (user_id = auth.uid());
create policy "comments: delete own" on public.comments for delete using (user_id = auth.uid());
create policy "comments: mod delete any" on public.comments for delete using (public.current_user_role() in ('moderator', 'admin'));
create policy "comments: admin update" on public.comments for update using (public.current_user_role() = 'admin');

-- comment_reports
create policy "comment_reports: insert" on public.comment_reports for insert with check (auth.uid() is not null);
create policy "comment_reports: mod read" on public.comment_reports for select using (public.current_user_role() in ('moderator', 'admin'));
create policy "comment_reports: mod update" on public.comment_reports for update using (public.current_user_role() in ('moderator', 'admin'));

-- comment_timeouts
create policy "comment_timeouts: read own" on public.comment_timeouts for select using (user_id = auth.uid());
create policy "comment_timeouts: mod all" on public.comment_timeouts using (public.current_user_role() in ('moderator', 'admin'));

-- moderator_messages
create policy "mod_messages: insert" on public.moderator_messages for insert with check (from_user_id = auth.uid());
create policy "mod_messages: read own" on public.moderator_messages for select using (from_user_id = auth.uid());
create policy "mod_messages: mod read all" on public.moderator_messages for select using (public.current_user_role() in ('moderator', 'admin'));
create policy "mod_messages: mod reply" on public.moderator_messages for update using (public.current_user_role() in ('moderator', 'admin'));

-- bug_reports
create policy "bug_reports: insert" on public.bug_reports for insert with check (auth.uid() is not null);
create policy "bug_reports: read own" on public.bug_reports for select using (reported_by = auth.uid());
create policy "bug_reports: admin all" on public.bug_reports using (public.current_user_role() = 'admin');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/
git commit -m "chore: add initial Supabase schema migration with RLS policies"
```

---

## Task 5: Theme tokens and ThemeContext

**Files:**
- Create: `src/theme/tokens.ts`
- Create: `src/theme/ThemeContext.tsx`
- Test: `src/theme/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/theme/tokens.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { themes } from './tokens'
import type { Theme } from '@/lib/types'

const THEME_KEYS: Theme[] = ['fun', 'pro', 'dev']
const REQUIRED_COLOR_KEYS = ['bg', 'bgSecondary', 'text', 'textMuted', 'primary', 'primaryHover', 'success', 'warning', 'error', 'border', 'card']

describe('themes', () => {
  it('defines all three themes', () => {
    expect(Object.keys(themes)).toEqual(expect.arrayContaining(THEME_KEYS))
  })

  THEME_KEYS.forEach(key => {
    it(`theme "${key}" has all required color tokens`, () => {
      REQUIRED_COLOR_KEYS.forEach(colorKey => {
        expect(themes[key].colors).toHaveProperty(colorKey)
      })
    })

    it(`theme "${key}" has a celebration config with type`, () => {
      expect(['confetti', 'toast', 'terminal']).toContain(themes[key].celebration.type)
    })

    it(`theme "${key}" has required microcopy strings`, () => {
      expect(themes[key].celebration.successMessage).toBeTruthy()
      expect(themes[key].celebration.levelUpMessage).toBeTruthy()
      expect(themes[key].celebration.badgeMessage).toBeTruthy()
    })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module './tokens'`

- [ ] **Step 3: Create `src/theme/tokens.ts`**

```typescript
import type { Theme } from '@/lib/types'

export interface ThemeTokens {
  name: string
  colors: {
    bg: string
    bgSecondary: string
    text: string
    textMuted: string
    primary: string
    primaryHover: string
    success: string
    warning: string
    error: string
    border: string
    card: string
  }
  fonts: {
    body: string
    mono: string
  }
  radius: string
  celebration: {
    type: 'confetti' | 'toast' | 'terminal'
    successMessage: string
    levelUpMessage: string
    badgeMessage: string
  }
}

export const themes: Record<Theme, ThemeTokens> = {
  fun: {
    name: 'Fun & Gamified',
    colors: {
      bg: '#fff7ed',
      bgSecondary: '#fef3c7',
      text: '#1c1917',
      textMuted: '#78716c',
      primary: '#f97316',
      primaryHover: '#ea580c',
      success: '#22c55e',
      warning: '#eab308',
      error: '#ef4444',
      border: '#fed7aa',
      card: '#ffffff',
    },
    fonts: { body: 'Nunito, Segoe UI, sans-serif', mono: 'Fira Code, monospace' },
    radius: '1rem',
    celebration: {
      type: 'confetti',
      successMessage: "Nailed it! 🎉",
      levelUpMessage: "Level up! You're crushing it! 🚀",
      badgeMessage: "New badge unlocked! 🏆",
    },
  },
  pro: {
    name: 'Clean & Professional',
    colors: {
      bg: '#f8fafc',
      bgSecondary: '#f1f5f9',
      text: '#0f172a',
      textMuted: '#64748b',
      primary: '#0f172a',
      primaryHover: '#1e293b',
      success: '#16a34a',
      warning: '#ca8a04',
      error: '#dc2626',
      border: '#e2e8f0',
      card: '#ffffff',
    },
    fonts: { body: 'Inter, Segoe UI, sans-serif', mono: 'Fira Code, monospace' },
    radius: '0.5rem',
    celebration: {
      type: 'toast',
      successMessage: 'Lesson complete',
      levelUpMessage: 'Level up',
      badgeMessage: 'Badge earned',
    },
  },
  dev: {
    name: 'Dark Developer',
    colors: {
      bg: '#0d1117',
      bgSecondary: '#161b22',
      text: '#e6edf3',
      textMuted: '#8b949e',
      primary: '#3fb950',
      primaryHover: '#2ea043',
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149',
      border: '#30363d',
      card: '#161b22',
    },
    fonts: { body: 'JetBrains Mono, Fira Code, monospace', mono: 'JetBrains Mono, Fira Code, monospace' },
    radius: '0.375rem',
    celebration: {
      type: 'terminal',
      successMessage: '✓ lesson.complete()',
      levelUpMessage: '✓ level_up() // new rank unlocked',
      badgeMessage: '✓ badge.earned()',
    },
  },
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test
```

Expected: PASS — all 9 token tests pass.

- [ ] **Step 5: Create `src/theme/ThemeContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Theme } from '@/lib/types'
import { themes, type ThemeTokens } from './tokens'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  tokens: ThemeTokens
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) ?? 'pro'
  })

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, tokens: themes[theme] }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/theme/
git commit -m "feat: add three-theme token system and ThemeContext"
```

---

## Task 6: Auth Context and useAuth hook

**Files:**
- Create: `src/features/auth/hooks/useAuth.ts`
- Test: `src/features/auth/hooks/useAuth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/auth/hooks/useAuth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './useAuth'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
    }),
  },
}))

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside AuthProvider')
  })

  it('starts with loading true, user null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('exposes signOut function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(typeof result.current.signOut).toBe('function')
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module './useAuth'`

- [ ] **Step 3: Create `src/features/auth/hooks/useAuth.ts`**

```typescript
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'

interface AuthContextValue {
  user: UserProfile | null
  session: Session | null
  loading: boolean
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

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
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
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signInWithGitHub, signOut, updateProfile }}>
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

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: PASS — all auth hook tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/
git commit -m "feat: add AuthContext and useAuth hook with Supabase integration"
```

---

## Task 7: Shared UI components

**Files:**
- Create: `src/shared/components/ProtectedRoute.tsx`
- Create: `src/shared/components/LoadingSpinner.tsx`

- [ ] **Step 1: Create `src/shared/components/LoadingSpinner.tsx`**

```typescript
import { useTheme } from '@/theme/ThemeContext'

export function LoadingSpinner() {
  const { theme } = useTheme()

  if (theme === 'dev') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg font-mono text-primary">
        <span className="animate-pulse">$ loading...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin" />
    </div>
  )
}
```

- [ ] **Step 2: Create `src/shared/components/ProtectedRoute.tsx`**

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
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to={redirectTo} replace />

  if (requiredRole) {
    const roleHierarchy = { student: 0, moderator: 1, admin: 2 }
    if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/
git commit -m "feat: add ProtectedRoute and LoadingSpinner shared components"
```

---

## Task 8: Auth UI components

**Files:**
- Create: `src/features/auth/components/OAuthButtons.tsx`
- Create: `src/features/auth/components/SignUpForm.tsx`
- Create: `src/features/auth/components/LoginForm.tsx`

- [ ] **Step 1: Create `src/features/auth/components/OAuthButtons.tsx`**

```typescript
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function OAuthButtons() {
  const { signInWithGoogle, signInWithGitHub } = useAuth()
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoadingProvider(provider)
    if (provider === 'google') await signInWithGoogle()
    else await signInWithGitHub()
    setLoadingProvider(null)
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={() => handleOAuth('google')}
        disabled={!!loadingProvider}
        className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-theme border border-border bg-card text-text-base hover:bg-bg-secondary transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {loadingProvider === 'google' ? 'Connecting...' : 'Continue with Google'}
      </button>

      <button
        onClick={() => handleOAuth('github')}
        disabled={!!loadingProvider}
        className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-theme border border-border bg-card text-text-base hover:bg-bg-secondary transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
        {loadingProvider === 'github' ? 'Connecting...' : 'Continue with GitHub'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/features/auth/components/SignUpForm.tsx`**

```typescript
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface SignUpFormProps {
  onSuccess: () => void
  onSwitchToLogin: () => void
}

export function SignUpForm({ onSuccess, onSwitchToLogin }: SignUpFormProps) {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifyPrompt, setVerifyPrompt] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    const { error } = await signUp(email, password)
    setLoading(false)
    if (error) { setError(error); return }
    setVerifyPrompt(true)
    setTimeout(onSuccess, 3000)
  }

  if (verifyPrompt) {
    return (
      <div className="text-center p-4">
        <p className="text-text-base font-medium">Check your email!</p>
        <p className="text-text-muted text-sm mt-2">We sent a verification link to <strong>{email}</strong></p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      {error && <p className="text-error text-sm text-center">{error}</p>}
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)} required
        placeholder="Email address"
        className="px-4 py-3 rounded-theme border border-border bg-bg text-text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
      />
      <input
        type="password" value={password} onChange={e => setPassword(e.target.value)} required
        placeholder="Password (min 8 characters)"
        className="px-4 py-3 rounded-theme border border-border bg-bg text-text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
      />
      <input
        type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
        placeholder="Confirm password"
        className="px-4 py-3 rounded-theme border border-border bg-bg text-text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
      />
      <button
        type="submit" disabled={loading}
        className="px-4 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
      <p className="text-center text-sm text-text-muted">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline">Sign in</button>
      </p>
    </form>
  )
}
```

- [ ] **Step 3: Create `src/features/auth/components/LoginForm.tsx`**

```typescript
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface LoginFormProps {
  onSuccess: () => void
  onSwitchToSignUp: () => void
}

export function LoginForm({ onSuccess, onSwitchToSignUp }: LoginFormProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) { setError(error); return }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      {error && <p className="text-error text-sm text-center">{error}</p>}
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)} required
        placeholder="Email address"
        className="px-4 py-3 rounded-theme border border-border bg-bg text-text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
      />
      <input
        type="password" value={password} onChange={e => setPassword(e.target.value)} required
        placeholder="Password"
        className="px-4 py-3 rounded-theme border border-border bg-bg text-text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
      />
      <button
        type="submit" disabled={loading}
        className="px-4 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      <p className="text-center text-sm text-text-muted">
        Don't have an account?{' '}
        <button type="button" onClick={onSwitchToSignUp} className="text-primary hover:underline">Sign up</button>
      </p>
    </form>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/components/
git commit -m "feat: add auth forms and OAuth buttons"
```

---

## Task 9: Onboarding components

**Files:**
- Create: `src/features/auth/components/ProfileSetup.tsx`
- Create: `src/features/auth/components/ThemeSelector.tsx`
- Create: `src/features/auth/components/WelcomeScreen.tsx`

- [ ] **Step 1: Create `src/features/auth/components/ProfileSetup.tsx`**

```typescript
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface ProfileSetupProps {
  onComplete: () => void
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { updateProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (displayName.trim().length < 2) { setError('Display name must be at least 2 characters'); return }
    setError(null)
    setLoading(true)
    const { error } = await updateProfile({ display_name: displayName.trim() })
    setLoading(false)
    if (error) { setError(error); return }
    onComplete()
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-base">Set up your profile</h2>
        <p className="text-text-muted mt-1">What should we call you?</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        {error && <p className="text-error text-sm text-center">{error}</p>}
        <input
          type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
          placeholder="Display name" maxLength={30} required
          className="px-4 py-3 rounded-theme border border-border bg-bg text-text-base placeholder:text-text-muted focus:outline-none focus:border-primary text-center text-lg"
        />
        <button
          type="submit" disabled={loading}
          className="px-4 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/features/auth/components/ThemeSelector.tsx`**

```typescript
import { useTheme } from '@/theme/ThemeContext'
import { themes } from '@/theme/tokens'
import { useAuth } from '../hooks/useAuth'
import type { Theme } from '@/lib/types'

interface ThemeSelectorProps {
  onComplete: () => void
}

const THEME_PREVIEWS: { key: Theme; emoji: string; tagline: string }[] = [
  { key: 'fun', emoji: '🎮', tagline: 'Bright, playful, game-like' },
  { key: 'pro', emoji: '💼', tagline: 'Clean, minimal, focused' },
  { key: 'dev', emoji: '💻', tagline: 'Dark, terminal-style' },
]

export function ThemeSelector({ onComplete }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()
  const { updateProfile } = useAuth()

  const handleSelect = (t: Theme) => setTheme(t)

  const handleConfirm = async () => {
    await updateProfile({ theme })
    onComplete()
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-base">Choose your experience</h2>
        <p className="text-text-muted mt-1">You can change this anytime in your profile settings.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full sm:grid-cols-3">
        {THEME_PREVIEWS.map(({ key, emoji, tagline }) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className={`p-4 rounded-theme border-2 text-left transition-all ${
              theme === key
                ? 'border-primary bg-bg-secondary'
                : 'border-border bg-card hover:border-primary'
            }`}
          >
            <div className="text-2xl mb-2">{emoji}</div>
            <div className="font-semibold text-text-base">{themes[key].name}</div>
            <div className="text-sm text-text-muted mt-1">{tagline}</div>
          </button>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        className="px-8 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors"
      >
        Start Learning →
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/features/auth/components/WelcomeScreen.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { useTheme } from '@/theme/ThemeContext'
import { useAuth } from '../hooks/useAuth'

interface WelcomeScreenProps {
  onComplete: () => void
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [lines, setLines] = useState<string[]>([])
  const name = user?.display_name ?? 'there'

  // Dev theme: type out terminal lines
  useEffect(() => {
    if (theme !== 'dev') {
      const timer = setTimeout(onComplete, 2500)
      return () => clearTimeout(timer)
    }

    const terminalLines = [
      `$ welcome ${name}`,
      '> initializing learning environment...',
      '✓ profile loaded',
      '✓ curriculum ready — 19 modules',
      '✓ leaderboard connected',
      '> ready. let\'s build something.',
    ]
    let i = 0
    const interval = setInterval(() => {
      if (i < terminalLines.length) {
        setLines(prev => [...prev, terminalLines[i]])
        i++
      } else {
        clearInterval(interval)
        setTimeout(onComplete, 800)
      }
    }, 350)
    return () => clearInterval(interval)
  }, [theme, name, onComplete])

  if (theme === 'dev') {
    return (
      <div className="flex flex-col justify-center min-h-[300px] font-mono text-sm text-primary p-4">
        {lines.map((line, i) => (
          <div key={i} className="leading-relaxed animate-pulse-once">{line}</div>
        ))}
      </div>
    )
  }

  if (theme === 'fun') {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-8">
        <div className="text-6xl animate-bounce">🎉</div>
        <h2 className="text-3xl font-black text-text-base">Welcome, {name}!</h2>
        <p className="text-text-muted text-lg">Your adventure begins now. Let's go! 🚀</p>
        <div className="text-4xl animate-spin">⭐</div>
      </div>
    )
  }

  // pro theme
  return (
    <div className="flex flex-col items-center gap-4 text-center py-8">
      <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center text-3xl">👋</div>
      <h2 className="text-2xl font-bold text-text-base">Welcome, {name}</h2>
      <p className="text-text-muted">Your curriculum is ready. Module 1 is a great place to start.</p>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/components/
git commit -m "feat: add onboarding wizard components (ProfileSetup, ThemeSelector, WelcomeScreen)"
```

---

## Task 10: Auth and Onboarding pages

**Files:**
- Create: `src/features/auth/pages/AuthPage.tsx`
- Create: `src/features/auth/pages/OnboardingPage.tsx`

- [ ] **Step 1: Create `src/features/auth/pages/AuthPage.tsx`**

```typescript
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { SignUpForm } from '../components/SignUpForm'
import { LoginForm } from '../components/LoginForm'
import { OAuthButtons } from '../components/OAuthButtons'

type AuthMode = 'signup' | 'login'

export function AuthPage() {
  const { user, loading } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signup')

  if (loading) return null
  if (user) {
    // New user (no display_name) → onboarding; existing → module map
    return <Navigate to={user.display_name ? '/' : '/onboarding'} replace />
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
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/features/auth/pages/OnboardingPage.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ProfileSetup } from '../components/ProfileSetup'
import { ThemeSelector } from '../components/ThemeSelector'
import { WelcomeScreen } from '../components/WelcomeScreen'

type OnboardingStep = 'profile' | 'theme' | 'welcome'

export function OnboardingPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<OnboardingStep>('profile')

  useEffect(() => {
    // If user already has a display name (OAuth signup), skip profile step
    if (user?.display_name && step === 'profile') setStep('theme')
  }, [user, step])

  if (loading) return null
  if (!user) return <Navigate to="/auth" replace />

  const stepNumber = { profile: 1, theme: 2, welcome: 3 }[step]

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 gap-8">
      {/* Step indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map(n => (
          <div
            key={n}
            className={`w-2 h-2 rounded-full transition-colors ${
              n <= stepNumber ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-lg bg-card border border-border rounded-theme p-8">
        {step === 'profile' && <ProfileSetup onComplete={() => setStep('theme')} />}
        {step === 'theme' && <ThemeSelector onComplete={() => setStep('welcome')} />}
        {step === 'welcome' && <WelcomeScreen onComplete={() => navigate('/', { replace: true })} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/pages/
git commit -m "feat: add AuthPage and OnboardingPage"
```

---

## Task 11: Stub pages and App router

**Files:**
- Create: `src/pages/ModuleMapStub.tsx`
- Create: `src/pages/NotFoundPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx` (rename from .jsx and update)

- [ ] **Step 1: Rename `src/main.jsx` to `src/main.tsx` and update**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/theme/ThemeContext'
import { AuthProvider } from '@/features/auth/hooks/useAuth'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 2: Create `src/pages/ModuleMapStub.tsx`**

```typescript
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTheme } from '@/theme/ThemeContext'

export function ModuleMapStub() {
  const { user, signOut } = useAuth()
  const { theme, setTheme, tokens } = useTheme()

  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-base">React Academy</h1>
          <div className="flex items-center gap-4">
            <span className="text-text-muted text-sm">
              {user?.display_name} · {tokens.name}
            </span>
            <select
              value={theme}
              onChange={e => setTheme(e.target.value as typeof theme)}
              className="text-sm border border-border rounded-theme px-2 py-1 bg-bg text-text-base"
            >
              <option value="fun">Fun</option>
              <option value="pro">Pro</option>
              <option value="dev">Dev</option>
            </select>
            <button
              onClick={signOut}
              className="text-sm text-text-muted hover:text-error transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-theme p-8 text-center">
          <p className="text-4xl mb-4">🚧</p>
          <h2 className="text-xl font-semibold text-text-base">Module Map coming in Phase 2</h2>
          <p className="text-text-muted mt-2">
            Auth and theme system are working. The full curriculum will be built next.
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/pages/NotFoundPage.tsx`**

```typescript
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-text-base">404</h1>
      <p className="text-text-muted">Page not found.</p>
      <Link to="/" className="text-primary hover:underline">Go home</Link>
    </div>
  )
}
```

- [ ] **Step 4: Replace `src/App.tsx` with router**

```typescript
import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { AuthPage } from '@/features/auth/pages/AuthPage'
import { OnboardingPage } from '@/features/auth/pages/OnboardingPage'
import { ModuleMapStub } from '@/pages/ModuleMapStub'
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
            <ModuleMapStub />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
```

- [ ] **Step 5: Run the app and verify it starts**

```bash
npm run dev
```

Expected: App starts at http://localhost:5173. Visiting `/` without being logged in redirects to `/auth`. Sign up creates an account, triggers onboarding, lands on the stub module map.

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 7: Build to verify no TypeScript errors**

```bash
npm run build
```

Expected: `dist/` created with no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/main.tsx src/App.tsx src/pages/
git commit -m "feat: wire up router with auth, onboarding, and stub module map"
```

---

## Task 12: Netlify config and migrate data files to TypeScript

**Files:**
- Create: `netlify.toml`
- Create: `src/data/curriculum.ts`
- Create: `src/data/achievements.ts`

- [ ] **Step 1: Create `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "20"
```

- [ ] **Step 2: Create `src/data/achievements.ts`** (migrate + update for 19 modules)

```typescript
import type { Badge, UserProgressState } from '@/lib/types'

export const BADGES: Badge[] = [
  { id: 'first_steps', name: 'First Steps', description: 'Complete your first lesson', icon: '👶',
    condition: (p) => p.completedLessons.length >= 1 },
  { id: 'html_master', name: 'HTML Master', description: 'Complete HTML Fundamentals', icon: '🌐',
    condition: (p) => p.completedModules.includes('1') },
  { id: 'css_wizard', name: 'CSS Wizard', description: 'Complete CSS Fundamentals', icon: '🎨',
    condition: (p) => p.completedModules.includes('2') },
  { id: 'js_ninja', name: 'JS Ninja', description: 'Complete JavaScript Essentials', icon: '⚡',
    condition: (p) => p.completedModules.includes('3') },
  { id: 'git_pro', name: 'Git Pro', description: 'Complete Git & Version Control', icon: '🔀',
    condition: (p) => p.completedModules.includes('4') },
  { id: 'ts_dev', name: 'TypeScript Dev', description: 'Complete TypeScript Basics', icon: '🔷',
    condition: (p) => p.completedModules.includes('5') },
  { id: 'web_fundamentals', name: 'Web Wizard', description: 'Complete Web Fundamentals', icon: '🌍',
    condition: (p) => p.completedModules.includes('6') },
  { id: 'api_master', name: 'API Master', description: 'Complete JSON & APIs', icon: '🔌',
    condition: (p) => p.completedModules.includes('7') },
  { id: 'react_rookie', name: 'React Rookie', description: 'Complete React Fundamentals', icon: '⚛️',
    condition: (p) => p.completedModules.includes('8') },
  { id: 'hooks_master', name: 'Hooks Master', description: 'Complete React Hooks & State', icon: '🎣',
    condition: (p) => p.completedModules.includes('9') },
  { id: 'react_pro', name: 'React Pro', description: 'Complete Advanced React Patterns', icon: '🧩',
    condition: (p) => p.completedModules.includes('10') },
  { id: 'style_master', name: 'Style Master', description: 'Complete CSS Frameworks & Tailwind', icon: '💅',
    condition: (p) => p.completedModules.includes('11') },
  { id: 'db_architect', name: 'DB Architect', description: 'Complete Databases & SQL', icon: '🗄️',
    condition: (p) => p.completedModules.includes('12') },
  { id: 'node_dev', name: 'Node Dev', description: 'Complete Node.js & Backend', icon: '🟢',
    condition: (p) => p.completedModules.includes('13') },
  { id: 'supabase_dev', name: 'Supabase Dev', description: 'Complete Supabase Integration', icon: '⚡',
    condition: (p) => p.completedModules.includes('14') },
  { id: 'security_expert', name: 'Security Expert', description: 'Complete Auth & Security', icon: '🔒',
    condition: (p) => p.completedModules.includes('15') },
  { id: 'test_master', name: 'Test Master', description: 'Complete Testing Fundamentals', icon: '✅',
    condition: (p) => p.completedModules.includes('16') },
  { id: 'devops_engineer', name: 'DevOps Engineer', description: 'Complete Deployment & DevOps', icon: '🚀',
    condition: (p) => p.completedModules.includes('17') },
  { id: 'architect', name: 'Architect', description: 'Complete Full Stack Architecture', icon: '🏗️',
    condition: (p) => p.completedModules.includes('18') },
  { id: 'full_stack_dev', name: 'Full Stack Dev', description: 'Complete all 19 modules', icon: '🏆',
    condition: (p) => ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19']
      .every(m => p.completedModules.includes(m)) },
  { id: 'on_fire', name: 'On Fire', description: '3-day streak', icon: '🔥',
    condition: (p) => p.streak >= 3 },
  { id: 'dedicated', name: 'Dedicated', description: '7-day streak', icon: '💎',
    condition: (p) => p.streak >= 7 },
  { id: 'unstoppable', name: 'Unstoppable', description: '30-day streak', icon: '⚡',
    condition: (p) => p.streak >= 30 },
  { id: 'quiz_ace', name: 'Quiz Ace', description: '5 perfect quiz scores', icon: '🎯',
    condition: (p) => Object.values(p.quizScores).filter(s => s === 100).length >= 5 },
  { id: 'quiz_legend', name: 'Quiz Legend', description: '10 perfect quiz scores', icon: '🌟',
    condition: (p) => Object.values(p.quizScores).filter(s => s === 100).length >= 10 },
  { id: 'century', name: 'Century', description: 'Earn 1,000 XP', icon: '💯',
    condition: (p) => p.xp >= 1000 },
  { id: 'xp_5000', name: 'High Achiever', description: 'Earn 5,000 XP', icon: '🥇',
    condition: (p) => p.xp >= 5000 },
  { id: 'xp_10000', name: 'Elite', description: 'Earn 10,000 XP', icon: '👑',
    condition: (p) => p.xp >= 10000 },
  { id: 'speed_learner', name: 'Speed Learner', description: '5 lessons in one day', icon: '⚡',
    condition: (p) => (p.lessonsToday ?? 0) >= 5 },
]

export const LEVEL_TITLES = [
  'Apprentice', 'Learner', 'Student', 'Developer', 'Coder',
  'Engineer', 'Architect', 'Expert', 'Master', 'Grandmaster',
]

export function getLevelTitle(level: number): string {
  const index = Math.min(level - 1, LEVEL_TITLES.length - 1)
  return LEVEL_TITLES[index] ?? 'Legend'
}

export function getLevel(xp: number): number {
  return Math.floor(xp / 500) + 1
}

export function getXPForNextLevel(xp: number): number {
  return getLevel(xp) * 500
}

export function getXPProgress(xp: number): number {
  const currentLevel = getLevel(xp)
  const levelStart = (currentLevel - 1) * 500
  const levelEnd = currentLevel * 500
  return ((xp - levelStart) / (levelEnd - levelStart)) * 100
}

export function evaluateBadges(progress: UserProgressState): Badge[] {
  return BADGES.filter(badge => badge.condition(progress))
}
```

- [ ] **Step 3: Create `src/data/curriculum.ts`** — migrate existing JS and add stubs for modules 4–19

Rename `src/data/curriculum.js` to `src/data/curriculum.ts` and add this import at the top plus a type annotation, then append the new modules:

```typescript
import type { Module } from '@/lib/types'

export const MODULES: Module[] = [
  // ── Module 1: HTML Fundamentals (existing content) ────────────
  {
    id: '1',
    title: 'HTML Fundamentals',
    icon: '🌐',
    description: 'Learn the building blocks of every webpage.',
    lessons: [
      // ... (keep all existing lessons 1.1 through 1.x from curriculum.js exactly as-is, typed)
    ],
  },
  // ── Module 2: CSS Fundamentals (existing content) ─────────────
  {
    id: '2',
    title: 'CSS Fundamentals',
    icon: '🎨',
    description: 'Style and lay out web pages with CSS.',
    lessons: [
      // ... (keep all existing CSS lessons exactly as-is, typed)
    ],
  },
  // ── Module 3: JavaScript Essentials (existing content) ────────
  {
    id: '3',
    title: 'JavaScript Essentials',
    icon: '⚡',
    description: 'Add interactivity and logic to your pages.',
    lessons: [
      // ... (keep all existing JS lessons exactly as-is, typed)
    ],
  },
  // ── Module 4: Git & Version Control ───────────────────────────
  {
    id: '4',
    title: 'Git & Version Control',
    icon: '🔀',
    description: 'Track changes, collaborate, and manage your codebase with Git.',
    lessons: [
      {
        id: '4.1',
        title: 'What is Version Control?',
        duration: 10,
        xpReward: 100,
        content: [
          { type: 'text', content: 'Version control is a system that records changes to a file or set of files over time so you can recall specific versions later. Git is the most widely used version control system in the world.' },
          { type: 'heading', content: 'Why Git?' },
          { type: 'list', items: ['Track every change you make to your code', 'Collaborate with other developers without overwriting each other\'s work', 'Revert to a previous version if something breaks', 'Maintain multiple versions of your project simultaneously using branches'] },
          { type: 'heading', content: 'Installing Git' },
          { type: 'code', language: 'bash', content: '# Check if Git is installed\ngit --version\n\n# Download from https://git-scm.com if not installed' },
          { type: 'tip', content: 'Git and GitHub are not the same thing. Git is the version control tool; GitHub is a cloud hosting platform for Git repositories.' },
        ],
        quiz: [
          { question: 'What does version control allow you to do?', options: ['Style web pages', 'Track changes over time', 'Run JavaScript', 'Connect to databases'], correct: 1 },
          { question: 'Git and GitHub are the same thing.', options: ['True', 'False'], correct: 1, type: 'true-false' },
          { question: 'What command checks your Git version?', options: ['git status', 'git version', 'git --version', 'git check'], correct: 2 },
        ],
      },
      {
        id: '4.2',
        title: 'Core Git Commands',
        duration: 15,
        xpReward: 100,
        content: [
          { type: 'heading', content: 'The Basic Workflow' },
          { type: 'code', language: 'bash', content: '# Initialize a new repository\ngit init\n\n# Check the status of your files\ngit status\n\n# Stage files for commit\ngit add filename.txt     # stage one file\ngit add .                # stage all changes\n\n# Commit staged changes\ngit commit -m "Add homepage layout"\n\n# View commit history\ngit log --oneline' },
          { type: 'heading', content: 'The Three States' },
          { type: 'list', items: ['Working directory — where you edit files', 'Staging area — files you\'ve marked to include in the next commit', 'Repository — where commits are permanently stored'] },
          { type: 'tip', content: 'Write commit messages in the imperative: "Add login form", not "Added login form" or "Adding login form".' },
        ],
        quiz: [
          { question: 'What does `git add .` do?', options: ['Commits all changes', 'Stages all changes', 'Pushes to GitHub', 'Creates a new branch'], correct: 1 },
          { question: 'Which command saves staged changes to the repository?', options: ['git push', 'git add', 'git commit', 'git save'], correct: 2 },
          { question: 'Fill in the blank: `git ___` shows the state of your working directory.', options: ['log', 'check', 'status', 'diff'], correct: 2 },
        ],
      },
    ],
  },
  // ── Module 5: TypeScript Basics ───────────────────────────────
  {
    id: '5',
    title: 'TypeScript Basics',
    icon: '🔷',
    description: 'Add static types to JavaScript for safer, more maintainable code.',
    lessons: [
      {
        id: '5.1',
        title: 'Why TypeScript?',
        duration: 10,
        xpReward: 100,
        content: [
          { type: 'text', content: 'TypeScript is a superset of JavaScript that adds optional static typing. It compiles down to plain JavaScript, so it runs everywhere JS runs. TypeScript catches bugs at compile time — before your code ever runs.' },
          { type: 'heading', content: 'JavaScript vs TypeScript' },
          { type: 'code', language: 'typescript', content: '// JavaScript — no error until runtime\nfunction greet(name) {\n  return "Hello, " + name.toUpperCase()\n}\ngreet(42) // Runtime error: name.toUpperCase is not a function\n\n// TypeScript — error caught at compile time\nfunction greet(name: string): string {\n  return "Hello, " + name.toUpperCase()\n}\ngreet(42) // ✗ Argument of type \'number\' is not assignable to parameter of type \'string\'' },
          { type: 'tip', content: 'You don\'t need to add types to everything — TypeScript infers types where possible. Add explicit types at function boundaries and for complex data structures.' },
        ],
        quiz: [
          { question: 'TypeScript is a superset of which language?', options: ['Python', 'Java', 'JavaScript', 'CSS'], correct: 2 },
          { question: 'When does TypeScript catch type errors?', options: ['At runtime', 'At compile time', 'In the browser console', 'Never'], correct: 1 },
          { question: 'TypeScript code runs directly in the browser without compilation.', options: ['True', 'False'], correct: 1, type: 'true-false' },
        ],
      },
    ],
  },
  // ── Modules 6–19: Stub (one lesson each, full content added in later sprint) ──
  {
    id: '6', title: 'Web Fundamentals', icon: '🌍',
    description: 'Understand how the web works: HTTP, browsers, DNS, and networking.',
    lessons: [{ id: '6.1', title: 'How the Web Works', duration: 12, xpReward: 100, content: [{ type: 'text', content: 'Coming soon — full lesson content will be added in the curriculum content sprint.' }], quiz: [{ question: 'What does HTTP stand for?', options: ['HyperText Transfer Protocol', 'High Tech Text Program', 'HyperText Transmission Process', 'Hosting Transfer Tool'], correct: 0 }] }],
  },
  {
    id: '7', title: 'JSON & APIs', icon: '🔌',
    description: 'Fetch and work with data from external APIs using JSON.',
    lessons: [{ id: '7.1', title: 'What is JSON?', duration: 10, xpReward: 100, content: [{ type: 'text', content: 'Coming soon.' }], quiz: [{ question: 'What does JSON stand for?', options: ['JavaScript Object Notation', 'Java Standard Object Network', 'JavaScript Online Notation', 'Joint Standard Object Name'], correct: 0 }] }],
  },
  {
    id: '8', title: 'React Fundamentals', icon: '⚛️',
    description: 'Build user interfaces with components, JSX, and props.',
    lessons: [{ id: '8.1', title: 'What is React?', duration: 10, xpReward: 100, content: [{ type: 'text', content: 'Coming soon.' }], quiz: [{ question: 'React is maintained by which company?', options: ['Google', 'Microsoft', 'Meta (Facebook)', 'Amazon'], correct: 2 }] }],
  },
  {
    id: '9', title: 'React Hooks & State', icon: '🎣',
    description: 'Manage dynamic data and side effects with React hooks.',
    lessons: [{ id: '9.1', title: 'useState and useEffect', duration: 15, xpReward: 100, content: [{ type: 'text', content: 'Coming soon.' }], quiz: [{ question: 'Which hook manages component state?', options: ['useEffect', 'useContext', 'useState', 'useRef'], correct: 2 }] }],
  },
  {
    id: '10', title: 'Advanced React Patterns', icon: '🧩',
    description: 'Master context, custom hooks, code splitting, and performance.',
    lessons: [{ id: '10.1', title: 'Context API', duration: 15, xpReward: 100, content: [{ type: 'text', content: 'Coming soon.' }], quiz: [{ question: 'React Context solves what problem?', options: ['Routing', 'Prop drilling', 'Styling', 'Fetching data'], correct: 1 }] }],
  },
  {
    id: '11', title: 'CSS Frameworks & Tailwind', icon: '💅',
    description: 'Build beautiful UIs fast with utility-first Tailwind CSS.',
    lessons: [{ id: '11.1', title: 'Utility-First CSS', duration: 12, xpReward: 100, content: [{ type: 'text', content: 'Coming soon.' }], quiz: [{ question: 'Tailwind CSS is a utility-first framework.', options: ['True', 'False'], correct: 0, type: 'true-false' }] }],
  },
  {
    id: '12', title: 'Databases & SQL Basics', icon: '🗄️',
    description: 'Store and query structured data with PostgreSQL.',
    lessons: [{ id: '12.1', title: 'Relational Databases', duration: 12, xpReward: 100, content: [{ type: 'text', content: 'Coming soon.' }], quiz: [{ question: 'SQL stands for?', options: ['Structured Query Language', 'Simple Query Logic', 'Standard Query List', 'Server Query Language'], correct: 0 }] }],
  },
  {
    id: '13', title: 'Node.js & Backend Fundamentals', icon: '🟢',
    description: 'Run JavaScript on the server with Node.js and build REST APIs.',
    lessons: [{ id: '13.1', title: 'What is Node.js?', duration: 12, xpReward: 100, content: [{ type: 'text', content: 'Coming soon.' }], quiz: [{ question: 'Node.js runs JavaScript where?', options: ['In the browser', 'On the server', 'In a database', 'In CSS'], correct: 1 }] }],
  },
  {
    id: '14', title: 'Supabase & Backend Integration', icon: '⚡',
    description: 'Build a full backend with Supabase: auth, database, and storage.',
    lessons: [{ id: '14.1', title: 'What is Supabase?', duration: 10, xpReward: 100, content: [{ type: 'text', content: 'Coming soon.' }], quiz: [{ question: 'Supabase is an open-source alternative to which platform?', options: ['AWS Lambda', 'Firebase', 'Heroku', 'Vercel'], correct: 1 }] }],
  },
  {
    id: '15', title: 'Authentication & Security', icon: '🔒',
    description: 'Implement secure authentication and protect your applications.',
    lessons: [{ id: '15.1', title: 'Auth Fundamentals', duration: 12, xpReward: 100, content: [{ type: 'text', content: 'Coming soon.' }], quiz: [{ question: 'JWT stands for?', options: ['JavaScript Web Token', 'JSON Web Token', 'Java Web Transaction', 'JSON Web Transfer'], correct: 1 }] }],
  },
  {
    id: '16', title: 'Testing Fundamentals', icon: '✅',
    description: 'Write unit, integration, and end-to-end tests for your applications.',
    lessons: [{ id: '16.1', title: 'Why Test?', duration: 10, xpReward: 100, content: [{ type: 'text', content: 'Coming soon.' }], quiz: [{ question: 'Unit tests test what?', options: ['The whole application', 'Individual functions or components', 'The database', 'The network'], correct: 1 }] }],
  },
  {
    id: '17', title: 'Deployment & DevOps Basics', icon: '🚀',
    description: 'Deploy applications to the web with CI/CD, Netlify, and environment management.',
    lessons: [{ id: '17.1', title: 'What is Deployment?', duration: 10, xpReward: 100, content: [{ type: 'text', content: 'Coming soon.' }], quiz: [{ question: 'CI/CD stands for?', options: ['Code Integration / Code Deployment', 'Continuous Integration / Continuous Delivery', 'Central Integration / Central Deployment', 'None of the above'], correct: 1 }] }],
  },
  {
    id: '18', title: 'Full Stack Project Architecture', icon: '🏗️',
    description: 'Design scalable, maintainable full-stack applications from the ground up.',
    lessons: [{ id: '18.1', title: 'Architecture Patterns', duration: 15, xpReward: 100, content: [{ type: 'text', content: 'Coming soon.' }], quiz: [{ question: 'What does "separation of concerns" mean?', options: ['Using multiple databases', 'Each part of the code has one clear responsibility', 'Splitting your app across servers', 'Using microservices only'], correct: 1 }] }],
  },
  {
    id: '19', title: 'Capstone Project', icon: '🏆',
    description: 'Build a complete full-stack React application from scratch.',
    lessons: [{ id: '19.1', title: 'Capstone Introduction', duration: 10, xpReward: 100, content: [{ type: 'text', content: 'You\'ve made it to the Capstone! In this module you will build a complete full-stack React application using everything you\'ve learned.' }, { type: 'tip', content: 'The Capstone project is your portfolio piece. Take your time, write clean code, and make something you\'re proud to show.' }], quiz: [{ question: 'The Capstone project combines skills from all previous modules.', options: ['True', 'False'], correct: 0, type: 'true-false' }] }],
  },
]
```

- [ ] **Step 4: Delete `src/data/curriculum.js` and `src/data/achievements.js`**

```bash
rm "src/data/curriculum.js" "src/data/achievements.js"
```

- [ ] **Step 5: Run build to confirm no TypeScript errors**

```bash
npm run build
```

Expected: Clean build, no errors.

- [ ] **Step 6: Commit**

```bash
git add netlify.toml src/data/
git commit -m "feat: add Netlify config and migrate curriculum + achievements to TypeScript with 19 modules"
```

---

## Task 13: Final Phase 1 verification

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run a production build**

```bash
npm run build
```

Expected: No TypeScript errors. `dist/` folder created.

- [ ] **Step 3: Preview the production build locally**

```bash
npm run preview
```

Expected: App serves at http://localhost:4173. All auth flows work in the preview build.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: phase 1 complete — foundation, auth, themes, Supabase schema"
```

---

## Phase 1 Complete

At this point:
- ✅ TypeScript, Tailwind, Vitest all configured
- ✅ Supabase schema migration with all tables and RLS
- ✅ Three-theme system with CSS custom properties
- ✅ Full auth flow: email/password + Google + GitHub OAuth
- ✅ 4-step onboarding wizard
- ✅ Protected routing
- ✅ 19-module curriculum data (modules 1–5 with full lessons; 6–19 stubs)
- ✅ All tests passing, production build clean

**Next: Phase 2 — Core Learning (Module Map, Lesson Renderer, Quiz Engine, Project Validator)**
See `docs/superpowers/plans/2026-04-01-phase-2-core-learning.md`

---

## Cross-Phase Notes

**Quiz score format:** `quizScores` in `UserProgressState` stores scores as percentages (0–100). A perfect score is `100`. Badge conditions in `achievements.ts` check `s === 100`. The Phase 2 quiz engine must store scores as `Math.round((correct / total) * 100)` to match.
