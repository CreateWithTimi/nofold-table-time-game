alter table public.game_sessions
  add column if not exists scenario_order text[] null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.game_sessions'::regclass
      and conname = 'game_sessions_room_id_key'
  ) then
    alter table public.game_sessions drop constraint game_sessions_room_id_key;
  end if;
end $$;

create unique index if not exists game_sessions_one_active_per_room_idx
  on public.game_sessions(room_id)
  where status = 'ACTIVE';

alter table public.game_rounds
  add column if not exists session_id uuid null references public.game_sessions(id) on delete cascade;

alter table public.game_round_responses
  add column if not exists session_id uuid null references public.game_sessions(id) on delete cascade;

alter table public.game_round_decisions
  add column if not exists session_id uuid null references public.game_sessions(id) on delete cascade;

alter table public.game_scores
  add column if not exists session_id uuid null references public.game_sessions(id) on delete cascade;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_rounds'::regclass
      and conname = 'game_rounds_room_round_key'
  ) then
    alter table public.game_rounds drop constraint game_rounds_room_round_key;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_round_responses'::regclass
      and conname = 'game_round_responses_room_round_player_key'
  ) then
    alter table public.game_round_responses drop constraint game_round_responses_room_round_player_key;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_round_decisions'::regclass
      and conname = 'game_round_decisions_room_round_player_key'
  ) then
    alter table public.game_round_decisions drop constraint game_round_decisions_room_round_player_key;
  end if;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_scores'::regclass
      and conname = 'game_scores_room_player_key'
  ) then
    alter table public.game_scores drop constraint game_scores_room_player_key;
  end if;
end $$;

create unique index if not exists game_rounds_session_round_key
  on public.game_rounds(session_id, round_number)
  where session_id is not null;

create unique index if not exists game_rounds_legacy_room_round_key
  on public.game_rounds(room_id, round_number)
  where session_id is null;

create unique index if not exists game_round_responses_session_round_player_key
  on public.game_round_responses(session_id, round_number, player_id)
  where session_id is not null;

create unique index if not exists game_round_responses_legacy_room_round_player_key
  on public.game_round_responses(room_id, round_number, player_id)
  where session_id is null;

create unique index if not exists game_round_decisions_session_round_player_key
  on public.game_round_decisions(session_id, round_number, player_id)
  where session_id is not null;

create unique index if not exists game_round_decisions_legacy_room_round_player_key
  on public.game_round_decisions(room_id, round_number, player_id)
  where session_id is null;

create unique index if not exists game_scores_session_player_key
  on public.game_scores(session_id, player_id)
  where session_id is not null;

create unique index if not exists game_scores_legacy_room_player_key
  on public.game_scores(room_id, player_id)
  where session_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_rounds'::regclass
      and conname = 'game_rounds_session_round_unique'
  ) then
    alter table public.game_rounds
      add constraint game_rounds_session_round_unique unique (session_id, round_number);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_round_responses'::regclass
      and conname = 'game_round_responses_session_round_player_unique'
  ) then
    alter table public.game_round_responses
      add constraint game_round_responses_session_round_player_unique unique (session_id, round_number, player_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_round_decisions'::regclass
      and conname = 'game_round_decisions_session_round_player_unique'
  ) then
    alter table public.game_round_decisions
      add constraint game_round_decisions_session_round_player_unique unique (session_id, round_number, player_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_scores'::regclass
      and conname = 'game_scores_session_player_unique'
  ) then
    alter table public.game_scores
      add constraint game_scores_session_player_unique unique (session_id, player_id);
  end if;
end $$;

create table if not exists public.game_round_hands (
  id uuid primary key default gen_random_uuid(),
  session_id uuid null references public.game_sessions(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number integer not null,
  player_id uuid not null references public.room_players(id) on delete cascade,
  local_player_id text not null,
  response_ids text[] not null,
  created_at timestamptz default now()
);

create unique index if not exists game_round_hands_session_round_player_key
  on public.game_round_hands(session_id, round_number, player_id)
  where session_id is not null;

create unique index if not exists game_round_hands_legacy_room_round_player_key
  on public.game_round_hands(room_id, round_number, player_id)
  where session_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_round_hands'::regclass
      and conname = 'game_round_hands_session_round_player_unique'
  ) then
    alter table public.game_round_hands
      add constraint game_round_hands_session_round_player_unique unique (session_id, round_number, player_id);
  end if;
end $$;

create index if not exists game_round_hands_room_round_idx
  on public.game_round_hands(room_id, round_number);

alter table public.game_round_hands enable row level security;

drop policy if exists "Prototype local player can read own round hand" on public.game_round_hands;
create policy "Prototype local player can read own round hand"
on public.game_round_hands for select
to anon
using (
  local_player_id = coalesce(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-nofold-player-id', ''),
    '__missing__'
  )
);

drop policy if exists "Prototype local player can create own round hand" on public.game_round_hands;
create policy "Prototype local player can create own round hand"
on public.game_round_hands for insert
to anon
with check (
  local_player_id = coalesce(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-nofold-player-id', ''),
    '__missing__'
  )
);

do $$
begin
  alter publication supabase_realtime add table public.game_round_hands;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

comment on column public.game_sessions.scenario_order is
  'Canonical shuffled scenario id order for this session. Replays get a fresh order.';

comment on table public.game_round_hands is
  'Persisted response hand per player for refresh-safe private card dealing. Prototype local-player header is spoofable and must be replaced by auth-backed RLS before production.';
