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
  add column if not exists room_id uuid references public.rooms(id) on delete cascade,
  add column if not exists round_number integer,
  add column if not exists judge_player_id uuid references public.room_players(id) on delete cascade,
  add column if not exists phase text,
  add column if not exists defense_order uuid[] default '{}',
  add column if not exists current_defender_index integer default 0,
  add column if not exists defense_started_at timestamptz null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.game_rounds
  alter column defense_order set default '{}',
  alter column current_defender_index set default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.game_rounds'::regclass
      and conname = 'game_rounds_room_round_key'
  ) then
    alter table public.game_rounds
      add constraint game_rounds_room_round_key
      unique (room_id, round_number);
  end if;
end $$;

create index if not exists game_rounds_room_round_idx
  on public.game_rounds(room_id, round_number);

drop trigger if exists game_rounds_set_updated_at on public.game_rounds;
create trigger game_rounds_set_updated_at
before update on public.game_rounds
for each row execute function public.set_updated_at();

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

comment on table public.game_rounds is
  'M03.3.3 prototype round phase and normal-defense timer sync. No-auth RLS is intentionally permissive until authenticated membership is added.';
