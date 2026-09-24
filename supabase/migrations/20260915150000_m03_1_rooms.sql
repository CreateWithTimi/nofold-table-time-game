create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_player_id uuid null,
  status text not null default 'LOBBY'
    check (status in ('LOBBY', 'PACK_SELECTION', 'GAME_READY', 'JUDGE_SELECTION', 'IN_GAME', 'FINISHED')),
  selected_pack_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  local_player_id uuid not null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 18),
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, local_player_id)
);

alter table public.rooms
  drop constraint if exists rooms_host_player_id_fkey;

alter table public.rooms
  add constraint rooms_host_player_id_fkey
  foreign key (host_player_id) references public.room_players(id) on delete set null;

create index if not exists rooms_code_idx on public.rooms(code);
create index if not exists room_players_room_id_idx on public.room_players(room_id);
create index if not exists room_players_local_player_id_idx on public.room_players(local_player_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

drop policy if exists "Prototype anon can read rooms" on public.rooms;
create policy "Prototype anon can read rooms"
on public.rooms for select
to anon
using (true);

drop policy if exists "Prototype anon can create rooms" on public.rooms;
create policy "Prototype anon can create rooms"
on public.rooms for insert
to anon
with check (true);

drop policy if exists "Prototype anon can update rooms" on public.rooms;
create policy "Prototype anon can update rooms"
on public.rooms for update
to anon
using (true)
with check (true);

drop policy if exists "Prototype anon can read room players" on public.room_players;
create policy "Prototype anon can read room players"
on public.room_players for select
to anon
using (true);

drop policy if exists "Prototype anon can join rooms" on public.room_players;
create policy "Prototype anon can join rooms"
on public.room_players for insert
to anon
with check (true);

drop policy if exists "Prototype anon can update room players" on public.room_players;
create policy "Prototype anon can update room players"
on public.room_players for update
to anon
using (true)
with check (true);

comment on policy "Prototype anon can update rooms" on public.rooms is
  'M03.1 prototype only: without authentication, anon clients cannot be securely constrained to one browser/player.';

comment on policy "Prototype anon can update room players" on public.room_players is
  'M03.1 prototype only: tighten with auth or signed room membership before production gameplay sync.';
