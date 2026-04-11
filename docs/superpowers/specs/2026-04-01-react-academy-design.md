# React Academy — Full Stack Learning Platform Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Project:** React Academy (`react-academy`)

---

## 1. Overview

React Academy is an immersive, gamified full-stack web development learning platform built with React. Students progress through 19 structured modules covering HTML through Capstone deployment, earning XP, badges, and leaderboard rankings along the way. The platform offers three selectable visual themes — each providing a distinct experience with identical curriculum content underneath.

**Target audience:** Learners at all levels and ages who want to learn full-stack React development from the ground up.

**Hosting:** Netlify (static deploy)
**Database:** Supabase (PostgreSQL + Auth + Row Level Security)
**Repository:** GitHub (user to provide repo URL and token)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 |
| Build tool | Vite 5 |
| Routing | React Router v6 |
| Language | TypeScript (migrated from JS) |
| Styling | Tailwind CSS with custom theme tokens |
| Global UI state | Zustand |
| Auth & DB state | React Context + Supabase client |
| Backend | Supabase (Auth, PostgreSQL, RLS) |
| OAuth providers | Google, GitHub |
| Hosting | Netlify |
| File storage | Supabase Storage (avatars) |
| Unit testing | Vitest (validator logic) |

---

## 3. Folder Structure

```
src/
  features/
    auth/           # login, signup, OAuth, account creation flow
    curriculum/     # module map, lesson renderer, content types
    quiz/           # question types, submission, scoring engine
    projects/       # practice projects, validator engine
    leaderboard/    # multi-metric ranking boards
    comments/       # per-lesson comments, report flow
    admin/          # content management, user management, analytics
    moderator/      # moderation queue, inbox, timeout management
    gamification/   # XP engine, level calc, badge evaluation, streaks
    profile/        # student stats, badge display, progress overview, inbox
  theme/            # ThemeContext, three theme config objects
  shared/           # reusable UI components, hooks, utilities
  data/             # curriculum.ts, achievements.ts (migrated from JS)
  lib/              # supabase client, auth helpers, type definitions
```

Each feature folder owns its own components, hooks, and types. Cross-feature communication goes through shared hooks or Supabase queries — never direct imports between feature internals.

---

## 4. Database Schema

### `users` (extends `auth.users`)
```sql
id            uuid primary key references auth.users
email         text
display_name  text
avatar_url    text
theme         text check (theme in ('fun', 'pro', 'dev')) default 'pro'
role          text check (role in ('student', 'moderator', 'admin')) default 'student'
created_at    timestamptz default now()
last_active_at timestamptz
```

### `progress`
```sql
id            uuid primary key
user_id       uuid references users
module_id     text
lesson_id     text
completed_at  timestamptz default now()
xp_earned     integer
```

### `quiz_attempts`
```sql
id            uuid primary key
user_id       uuid references users
lesson_id     text
score         integer
max_score     integer
answers       jsonb
completed_at  timestamptz default now()
```

### `project_submissions`
```sql
id                uuid primary key
user_id           uuid references users
project_id        text
submitted_code    text
passed            boolean
validator_results jsonb
submitted_at      timestamptz default now()
```

### `streaks`
```sql
id                 uuid primary key
user_id            uuid references users unique
current_streak     integer default 0
longest_streak     integer default 0
last_activity_date date
```

### `badges`
```sql
id          uuid primary key
user_id     uuid references users
badge_id    text
earned_at   timestamptz default now()
```

### `leaderboard_cache`
```sql
id                 uuid primary key
user_id            uuid references users unique
total_xp           integer default 0
current_streak     integer default 0
quiz_accuracy      numeric(5,2) default 0
lessons_completed  integer default 0
updated_at         timestamptz default now()
```

### `comments`
```sql
id          uuid primary key
user_id     uuid references users
lesson_id   text
content     text
is_hidden   boolean default false
created_at  timestamptz default now()
```

### `comment_reports`
```sql
id            uuid primary key
comment_id    uuid references comments
reported_by   uuid references users
reason        text check (reason in ('spam', 'inappropriate', 'gives_away_answer', 'other'))
resolved      boolean default false
created_at    timestamptz default now()
```

### `comment_timeouts`
```sql
id          uuid primary key
user_id     uuid references users
issued_by   uuid references users
expires_at  timestamptz
reason      text
created_at  timestamptz default now()
```

### `moderator_messages`
```sql
id               uuid primary key
from_user_id     uuid references users
subject          text
message          text
moderator_reply  text
replied_by       uuid references users
created_at       timestamptz default now()
resolved         boolean default false
```

### `bug_reports`
```sql
id                   uuid primary key
reported_by          uuid references users
page_url             text
description          text
expected_behavior    text
status               text check (status in ('new', 'in_progress', 'resolved')) default 'new'
created_at           timestamptz default now()
```

### Row Level Security Summary

| Table | Student | Moderator | Admin |
|---|---|---|---|
| `users` | Read/write own row | Read/write own row | Full |
| `progress` | Read/write own | Read/write own | Full |
| `quiz_attempts` | Read/write own | Read/write own | Full |
| `project_submissions` | Read/write own | Read/write own | Full |
| `streaks` | Read/write own | Read/write own | Full |
| `badges` | Read own | Read own | Full |
| `leaderboard_cache` | Read all | Read all | Full |
| `comments` | Read all, write own, delete own | Read all, delete any | Full |
| `comment_reports` | Write only | Read all, update resolved | Full |
| `comment_timeouts` | Read own | Read/write all | Full |
| `moderator_messages` | Write, read own | Read all, write reply | Full |
| `bug_reports` | Write, read own | No access | Full |

---

## 5. Auth & Account Creation Flow

Admin and moderator accounts are created directly in Supabase — not via public signup.

### Student onboarding (4 steps):

1. **Sign Up** — email + password form, or one-click Google / GitHub OAuth. Standard email verification sent for email/password signups.

2. **Profile Setup** — choose a display name; optionally upload or select an avatar.

3. **Choose Your Experience** — theme selector showing live mini-previews of all three themes. Selection saved to `users.theme`. Changeable at any time from profile settings.

4. **Welcome Screen** — theme-specific welcome animation, then redirect to the Module Map. A first-time tooltip overlay guides the student to begin Module 1.

---

## 6. Curriculum Structure

### 19 Modules (in order)

| # | Module |
|---|---|
| 1 | HTML Fundamentals |
| 2 | CSS Fundamentals |
| 3 | JavaScript Essentials |
| 4 | Git & Version Control |
| 5 | TypeScript Basics |
| 6 | Web Fundamentals (HTTP, Browser, Networking) |
| 7 | JSON & APIs |
| 8 | React Fundamentals |
| 9 | React Hooks & State |
| 10 | Advanced React Patterns |
| 11 | CSS Frameworks & Tailwind |
| 12 | Databases & SQL Basics |
| 13 | Node.js & Backend Fundamentals |
| 14 | Supabase & Backend Integration |
| 15 | Authentication & Security |
| 16 | Testing Fundamentals |
| 17 | Deployment & DevOps Basics |
| 18 | Full Stack Project Architecture |
| 19 | Capstone Project |

Modules unlock sequentially. Admins can override lock state per module.

### Lesson Structure

```
Module
  └── Lesson
        ├── Content blocks (text, heading, code, list, tip, warning)
        ├── Quiz (3–5 questions)
        └── Practice Project (select lessons only, ~1 per module)
```

### Content Block Types

| Type | Description |
|---|---|
| `text` | Paragraph content |
| `heading` | Section heading |
| `code` | Syntax-highlighted code block with language |
| `list` | Bulleted list of items |
| `tip` | Highlighted tip callout |
| `warning` | Highlighted warning callout |

### Question Types

| Type | Validation |
|---|---|
| Multiple choice | Index of correct answer |
| True / False | Boolean correct value |
| Fill-in-blank | Case-insensitive exact match or regex pattern |
| Code validator | Paste-to-verify; checked against `validators` array (see below) |

### Practice Project Validators

Each project defines a `validators` array. Each validator has:
- `id` — unique string
- `description` — human-readable rule shown to student
- `type` — `contains` / `regex` / `element` / `property`
- `value` — the pattern or value to check against
- `required` — boolean (must pass to mark complete)
- `bonusXP` — integer (0 if not a bonus rule)

Example:
```ts
validators: [
  { id: 'has-nav', description: 'Page includes a <nav> element', type: 'element', value: 'nav', required: true, bonusXP: 0 },
  { id: 'uses-flex', description: 'Uses display: flex in CSS', type: 'contains', value: 'display: flex', required: true, bonusXP: 0 },
  { id: 'has-media-query', description: 'Includes a media query for responsiveness', type: 'regex', value: '@media\\s*\\(', required: false, bonusXP: 50 },
]
```

Students paste their code; results show pass/fail per rule inline.

---

## 7. Theme System

Three user-selectable themes. Theme is stored in `users.theme` and applied globally via `ThemeContext`. All three share identical curriculum, XP, badges, and leaderboard data.

### Fun & Gamified (`fun`)
- Bright, saturated color palette (coral, yellow, sky blue)
- Rounded corners, bubbly typography
- Animated mascot character on celebration screens
- Confetti burst on lesson complete / badge earned
- Playful microcopy ("Nailed it!", "You're on fire!", "Level up!")

### Clean & Professional (`pro`)
- Muted light palette (slate, white, near-black)
- Crisp sans-serif typography, generous whitespace
- Subtle slide-in toast notifications for completions
- Smooth progress bar fill animations
- Direct microcopy ("Lesson complete", "Quiz passed", "Badge earned")

### Dark Developer (`dev`)
- Dark background (#0d1117), GitHub-inspired palette
- Monospace font for UI elements and feedback
- Terminal-style completion output printed line by line
- Green accent (#3fb950) for success states
- Technical microcopy (`✓ lesson.complete()`, `✓ +100 XP awarded`)

### Theme Implementation
- `ThemeContext` provides `theme`, `setTheme`, and a `tokens` object (colors, fonts, animation config)
- Tailwind configured with theme-aware CSS custom properties
- Celebration components are theme-aware — same trigger, different presentation
- Theme changeable at any time from profile settings, persisted to Supabase immediately

---

## 8. Gamification System

### XP Awards
| Event | XP |
|---|---|
| Lesson complete | 100 |
| Perfect quiz score | +50 bonus |
| Practice project complete (required validators) | 150 |
| Practice project bonus validator passed | +50 each |

### Levels
- `level = floor(totalXP / 500) + 1`
- Level titles (1–10): Apprentice, Learner, Student, Developer, Coder, Engineer, Architect, Expert, Master, Grandmaster
- Beyond level 10: "Legend"

### Streaks
- Activity day = completing at least one lesson, quiz, or project
- Streak increments at midnight UTC if previous day had activity
- Broken streak resets `current_streak` to 0; `longest_streak` preserved
- Moderators/admins can manually adjust streaks via the Supabase dashboard (no dedicated UI in MVP)

### Badges
- 19 module completion badges (one per module)
- Streak badges: 3-day, 7-day, 30-day
- Quiz badges: 5 perfect scores, 10 perfect scores
- XP badges: 1,000 XP, 5,000 XP, 10,000 XP
- Speed badge: 5 lessons in one day
- Full Stack Dev: all 19 modules complete

Badge evaluation runs client-side on each XP/progress update against the `BADGES` config in `achievements.ts`. Newly earned badges are written to the `badges` table and trigger a theme-appropriate celebration.

---

## 9. Leaderboard

Four ranked boards, all reading from `leaderboard_cache`. The cache row for the current user is updated client-side immediately after each XP event, streak update, quiz completion, or lesson completion — the same function that writes to the primary table also upserts the corresponding `leaderboard_cache` field. Top 100 shown per board; current user's rank always visible even outside top 100.

| Board | Metric | Period |
|---|---|---|
| Top Learners | Total XP | All-time |
| Longest Streak | Current streak | Live |
| Quiz Masters | Quiz accuracy % (min 10 attempts to qualify) | All-time |
| Most Active | Lessons completed | Weekly + all-time toggle |

**Future leaderboard ideas (not in MVP):** per-module boards, monthly reset boards, cohort/class boards.

Each row shows: rank, avatar, display name, level title, metric value.

---

## 10. Comments System

- Per-lesson comment section, **collapsed by default**
- Student clicks "Show Discussion" to expand
- Flat structure (no threading) for MVP
- Each comment shows: avatar, display name, level title, relative timestamp, content
- Comment author can delete their own comment
- Any authenticated user can report a comment via a flag icon → reason selection → submits to `comment_reports`
- Reported comments remain visible until a moderator reviews them
- Users under an active `comment_timeouts` record see a "You are temporarily restricted from commenting" message with expiry time

---

## 11. User Contact & Bug Reporting

### Contact a Moderator
- Accessible from user profile and a persistent help menu
- Form: subject + message → saved to `moderator_messages`
- User sees moderator reply in a simple inbox on their profile page
- One reply per thread (not a full chat system) — keeps it auditable and simple

### Bug Reporting
- Persistent "Report a Bug" button in the site footer
- Form: page URL (auto-captured), description, expected behavior
- Submitted to `bug_reports` with status `new`
- Admins manage and update bug report status in the admin dashboard
- Moderators have no access to bug reports

---

## 12. Role Permissions Summary

| Capability | Student | Moderator | Admin |
|---|---|---|---|
| Take lessons / quizzes / projects | ✅ | ✅ | ✅ |
| View leaderboard | ✅ | ✅ | ✅ |
| Post / delete own comments | ✅ | ✅ | ✅ |
| Report comments | ✅ | ✅ | ✅ |
| Contact moderators | ✅ | ✅ | ✅ |
| Report bugs | ✅ | ✅ | ✅ |
| Delete any comment | ❌ | ✅ | ✅ |
| Issue comment timeouts | ❌ | ✅ | ✅ |
| View / reply moderator messages | ❌ | ✅ | ✅ |
| Manage content (modules/lessons/quizzes) | ❌ | ❌ | ✅ |
| Manage users (suspend/reset/promote) | ❌ | ❌ | ✅ |
| View analytics dashboard | ❌ | ❌ | ✅ |
| Manage bug reports | ❌ | ❌ | ✅ |

---

## 13. Admin Dashboard

### Content Management
- Add / edit / delete modules, lessons, quiz questions, practice projects
- Reorder modules and lessons via drag-and-drop
- Preview any lesson in any theme before publishing

### User Management
- Search and filter all student/moderator accounts
- View individual student progress, XP, badges, streak
- Reset student progress, suspend accounts, change roles
- Review and resolve comment reports (keep or remove + optional notify)

### Analytics
- Active users (daily / weekly / monthly charts)
- Module completion rates and drop-off points
- Average quiz score per lesson
- New signups over time
- XP distribution across user base
- Bug reports queue with status management

---

## 14. Moderator Dashboard

- Comment moderation queue (unresolved `comment_reports`)
- Recent comments feed across all lessons
- Comment timeout management (issue / view / revoke)
- Moderator messages inbox (read and reply to student contact requests)

---

## 15. Profile Page

- Display name, avatar, level title, current theme
- XP total and level progress bar
- Current streak and longest streak
- Badges earned (grid display)
- Module/lesson progress overview
- Learning statistics (quiz accuracy, lessons completed, projects passed)
- Inbox (moderator message replies)
- Settings (change display name, avatar, theme, password)

---

## 16. Deployment & Repository

### Netlify
- Static deploy from `dist/` output of `vite build`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Redirect rule: `/* → /index.html 200` for SPA routing
- README includes step-by-step Netlify setup instructions

### Supabase
- Project setup: create project, run schema SQL migrations
- Storage: create an `avatars` bucket (public read, authenticated write) for user avatar uploads
- Auth: enable Email, Google OAuth, GitHub OAuth providers
- RLS: enable on all tables, apply policies as defined in Section 4
- README includes step-by-step Supabase configuration instructions

### GitHub
- Repository pushed with full source (no `.env` files committed)
- `.gitignore` includes `.env`, `node_modules`, `.superpowers/`
- README documents all technologies with links to official docs

---

## 17. README Contents

The project README will include:
- Project overview and feature summary
- Technologies used with links to official documentation
- Prerequisites (Node.js version, accounts needed)
- Local development setup instructions
- Supabase configuration walkthrough (schema, auth providers, RLS)
- Netlify deployment walkthrough (build settings, env vars, redirect rules)
- GitHub setup instructions
- Folder structure overview
- Contributing guidelines

---

## 18. Future Enhancements (Out of Scope for MVP)

- Per-module and weekly/monthly leaderboard boards
- Streak freeze mechanic
- Comment threading
- In-browser code editor (currently paste-to-verify)
- Mobile app
- Cohort / classroom grouping
- Email notifications for badge achievements
- Instructor accounts (between moderator and admin)
