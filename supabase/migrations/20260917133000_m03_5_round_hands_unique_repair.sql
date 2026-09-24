-- Repair for M03.5 live projects that only have the partial index from the
-- first session-replay migration. Supabase/PostgREST upsert uses:
--   onConflict: "session_id,round_number,player_id"
-- and requires an inferable unique/exclusion constraint on those exact columns.

alter table public.game_round_hands
  add column if not exists session_id uuid null references public.game_sessions(id) on delete cascade;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.game_round_hands'::regclass
      and conname = 'game_round_hands_session_round_player_unique'
  ) then
    alter table public.game_round_hands
      add constraint game_round_hands_session_round_player_unique unique (session_id, round_number, player_id);
  end if;
end $$;

create unique index if not exists game_round_hands_session_round_player_key
  on public.game_round_hands(session_id, round_number, player_id)
  where session_id is not null;

create index if not exists game_round_hands_room_round_idx
  on public.game_round_hands(room_id, round_number);

do $$
begin
  alter publication supabase_realtime add table public.game_round_hands;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

comment on constraint game_round_hands_session_round_player_unique on public.game_round_hands is
  'Matches client upsert onConflict=session_id,round_number,player_id for replay-safe persisted private hands.';
