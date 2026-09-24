create table if not exists public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  round_number integer check (round_number > 0),
  judge_player_id uuid references public.room_players(id) on delete cascade,
  phase text,
  flow text null,
  defense_order uuid[] default '{}',
  caller_ids uuid[] null,
  current_defender_index integer default 0 check (current_defender_index >= 0),
  defense_started_at timestamptz null,
  winning_player_id uuid null references public.room_players(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_rounds
  add column if not exists winning_player_id uuid null references public.room_players(id) on delete set null;

alter table public.game_rounds enable row level security;

drop policy if exists "Prototype anon can read game rounds" on public.game_rounds;
create policy "Prototype anon can read game rounds"
on public.game_rounds for select
to anon
using (true);

drop policy if exists "Prototype anon can create game rounds" on public.game_rounds;
create policy "Prototype anon can create game rounds"
on public.game_rounds for insert
to anon
with check (true);

drop policy if exists "Prototype anon can update game rounds" on public.game_rounds;
create policy "Prototype anon can update game rounds"
on public.game_rounds for update
to anon
using (true)
with check (true);

do $$
begin
  alter publication supabase_realtime add table public.game_rounds;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

comment on column public.game_rounds.winning_player_id is
  'M03.3.5N canonical winner for persisted realtime normal Judge Pick results.';
