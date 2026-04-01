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
