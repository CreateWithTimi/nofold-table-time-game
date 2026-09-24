create table if not exists public.game_round_decisions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  player_id uuid not null references public.room_players(id) on delete cascade,
  decision text not null check (decision in ('CALL', 'FOLD')),
  locked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_round_decisions
  add column if not exists decision text,
  add column if not exists locked_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.game_round_decisions'::regclass
      and conname = 'game_round_decisions_decision_check'
  ) then
    alter table public.game_round_decisions
      add constraint game_round_decisions_decision_check
      check (decision in ('CALL', 'FOLD'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.game_round_decisions'::regclass
      and conname = 'game_round_decisions_room_round_player_key'
  ) then
    alter table public.game_round_decisions
      add constraint game_round_decisions_room_round_player_key
      unique (room_id, round_number, player_id);
  end if;
end $$;

create index if not exists game_round_decisions_room_round_idx
  on public.game_round_decisions(room_id, round_number);

create index if not exists game_round_decisions_player_idx
  on public.game_round_decisions(player_id);

drop trigger if exists game_round_decisions_set_updated_at on public.game_round_decisions;
create trigger game_round_decisions_set_updated_at
before update on public.game_round_decisions
for each row execute function public.set_updated_at();

alter table public.game_round_decisions enable row level security;

drop policy if exists "Prototype anon can read round decisions" on public.game_round_decisions;
create policy "Prototype anon can read round decisions"
on public.game_round_decisions for select
to anon
using (true);

drop policy if exists "Prototype anon can create round decisions" on public.game_round_decisions;
create policy "Prototype anon can create round decisions"
on public.game_round_decisions for insert
to anon
with check (true);

drop policy if exists "Prototype anon can update round decisions" on public.game_round_decisions;
create policy "Prototype anon can update round decisions"
on public.game_round_decisions for update
to anon
using (true)
with check (true);

create table if not exists public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  round_number integer check (round_number > 0),
  judge_player_id uuid references public.room_players(id) on delete cascade,
  phase text,
  defense_order uuid[] default '{}',
  current_defender_index integer default 0 check (current_defender_index >= 0),
  defense_started_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_rounds
  add column if not exists flow text null,
  add column if not exists caller_ids uuid[] null,
  add column if not exists stand_alone_player_id uuid null references public.room_players(id) on delete set null,
  add column if not exists no_escape_player_id uuid null references public.room_players(id) on delete set null;

do $$
begin
  alter publication supabase_realtime add table public.game_round_decisions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

comment on table public.game_round_decisions is
  'M03.3.4 prototype CALL/FOLD decision sync. No-auth RLS is intentionally permissive; UI must not reveal decision values before branch resolution.';
