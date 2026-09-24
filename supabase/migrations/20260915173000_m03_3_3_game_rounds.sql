create table if not exists public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  judge_player_id uuid not null references public.room_players(id) on delete cascade,
  phase text not null
    check (phase in (
      'RESPONSE_SELECTION',
      'DEFENSE',
      'CALL_FOLD',
      'JUDGE_PICK',
      'STAND_ALONE',
      'STAND_ALONE_DEFENSE',
      'STAND_ALONE_VERDICT',
      'COWARD_ROUND',
      'NO_ESCAPE_SELECTION',
      'NO_ESCAPE_DEFENSE',
      'NO_ESCAPE_VERDICT',
      'ROUND_RESULT'
    )),
  defense_order uuid[] not null default '{}',
  current_defender_index integer not null default 0 check (current_defender_index >= 0),
  defense_started_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, round_number)
);

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
end $$;

comment on table public.game_rounds is
  'M03.3.3 prototype round phase and normal-defense timer sync. No-auth RLS is intentionally permissive until authenticated membership is added.';
