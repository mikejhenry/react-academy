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
