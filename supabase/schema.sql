create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  status text not null,
  next_action text,
  deadline date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  type text not null,
  distance_km numeric,
  duration_min numeric,
  pace_min_km numeric,
  feel int,
  notes text,
  created_at timestamptz default now()
);

create table if not exists macros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  body_weight_goal_kg numeric,
  protein_g numeric,
  carbs_g numeric,
  fats_g numeric,
  created_at timestamptz default now()
);

create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  gym_done boolean default false,
  macros_logged boolean default false,
  run_logged boolean default false,
  focus text,
  created_at timestamptz default now()
);

create table if not exists writing_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  word_count int,
  notes text,
  created_at timestamptz default now()
);

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  book text not null,
  chapter_number int not null,
  title text,
  status text not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists substack_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  publication text,
  draft_link text,
  publish_date date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists learning_phases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  week_range text not null,
  status text not null,
  notes text,
  tasks jsonb,
  created_at timestamptz default now()
);

create table if not exists travel_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  leg text not null,
  dates text,
  accommodation text,
  budget_cad numeric,
  spent_cad numeric,
  todo text,
  packing text,
  visa_notes text,
  created_at timestamptz default now()
);

create table if not exists daily_captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  created_at timestamptz default now(),
  content text not null,
  tag text not null
);

create table if not exists oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  provider text not null,
  email text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz default now()
);

create unique index if not exists oauth_tokens_user_provider_idx
  on oauth_tokens (user_id, provider);

alter table projects enable row level security;
alter table runs enable row level security;
alter table macros enable row level security;
alter table daily_logs enable row level security;
alter table writing_sessions enable row level security;
alter table chapters enable row level security;
alter table substack_drafts enable row level security;
alter table learning_phases enable row level security;
alter table travel_notes enable row level security;
alter table daily_captures enable row level security;
alter table oauth_tokens enable row level security;

create policy "user_access_projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_access_runs"
  on runs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_access_macros"
  on macros for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_access_daily_logs"
  on daily_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_access_writing_sessions"
  on writing_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_access_chapters"
  on chapters for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_access_substack_drafts"
  on substack_drafts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_access_learning_phases"
  on learning_phases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_access_travel_notes"
  on travel_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_access_daily_captures"
  on daily_captures for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_access_oauth_tokens"
  on oauth_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
