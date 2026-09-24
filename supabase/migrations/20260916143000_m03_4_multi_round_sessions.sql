create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.rooms(id) on delete cascade,
  current_round integer not null default 1 check (current_round > 0),
  total_rounds integer not null default 8 check (total_rounds > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'FINISHED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.room_players(id) on delete cascade,
  score integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (room_id, player_id)
);

alter table public.game_rounds
  add column if not exists scenario_id text null,
  add column if not exists scores_applied_at timestamptz null;

create index if not exists game_scores_room_id_idx
  on public.game_scores(room_id);

create index if not exists game_sessions_room_id_idx
  on public.game_sessions(room_id);

alter table public.game_sessions enable row level security;
alter table public.game_scores enable row level security;

drop policy if exists "Prototype anon can read game sessions" on public.game_sessions;
create policy "Prototype anon can read game sessions"
on public.game_sessions for select
to anon
using (true);

drop policy if exists "Prototype anon can create game sessions" on public.game_sessions;
create policy "Prototype anon can create game sessions"
on public.game_sessions for insert
to anon
with check (true);

drop policy if exists "Prototype anon can update game sessions" on public.game_sessions;
create policy "Prototype anon can update game sessions"
on public.game_sessions for update
to anon
using (true)
with check (true);

drop policy if exists "Prototype anon can read game scores" on public.game_scores;
create policy "Prototype anon can read game scores"
on public.game_scores for select
to anon
using (true);

drop policy if exists "Prototype anon can create game scores" on public.game_scores;
create policy "Prototype anon can create game scores"
on public.game_scores for insert
to anon
with check (true);

drop policy if exists "Prototype anon can update game scores" on public.game_scores;
create policy "Prototype anon can update game scores"
on public.game_scores for update
to anon
using (true)
with check (true);

do $$
begin
  alter publication supabase_realtime add table public.game_sessions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.game_scores;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.game_rounds;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

comment on table public.game_sessions is
  'M03.4 canonical persisted game session state: current round, total rounds, and finished status.';

comment on table public.game_scores is
  'M03.4 cumulative per-player score table for a NO FOLD room.';

comment on column public.game_rounds.scenario_id is
  'M03.4 canonical scenario id for this persisted round.';

comment on column public.game_rounds.scores_applied_at is
  'M03.4 idempotency marker for applying this round result to cumulative game_scores.';
