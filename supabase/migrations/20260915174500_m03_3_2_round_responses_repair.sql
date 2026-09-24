create table if not exists public.game_round_responses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  player_id uuid not null references public.room_players(id) on delete cascade,
  selected_response_id text null,
  locked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_round_responses
  add column if not exists selected_response_id text null,
  add column if not exists locked_at timestamptz null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.game_round_responses'::regclass
      and conname = 'game_round_responses_room_round_player_key'
  ) then
    alter table public.game_round_responses
      add constraint game_round_responses_room_round_player_key
      unique (room_id, round_number, player_id);
  end if;
end $$;

create index if not exists game_round_responses_room_round_idx
  on public.game_round_responses(room_id, round_number);

create index if not exists game_round_responses_player_idx
  on public.game_round_responses(player_id);

drop trigger if exists game_round_responses_set_updated_at on public.game_round_responses;
create trigger game_round_responses_set_updated_at
before update on public.game_round_responses
for each row execute function public.set_updated_at();

alter table public.game_round_responses enable row level security;

drop policy if exists "Prototype anon can read round responses" on public.game_round_responses;
create policy "Prototype anon can read round responses"
on public.game_round_responses for select
to anon
using (true);

drop policy if exists "Prototype anon can lock own round response" on public.game_round_responses;
create policy "Prototype anon can lock own round response"
on public.game_round_responses for insert
to anon
with check (true);

drop policy if exists "Prototype anon can update round response locks" on public.game_round_responses;
create policy "Prototype anon can update round response locks"
on public.game_round_responses for update
to anon
using (true)
with check (true);

do $$
begin
  alter publication supabase_realtime add table public.game_round_responses;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

comment on table public.game_round_responses is
  'M03.3.2 prototype response-lock sync. No-auth RLS cannot enforce per-player secrecy yet; UI must avoid rendering other players selected_response_id.';
