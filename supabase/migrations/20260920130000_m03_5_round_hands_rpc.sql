-- M03.5 hotfix: move multi-player private-hand creation behind a
-- SECURITY DEFINER RPC. Browser clients should only read their own hand through
-- the owner-scoped SELECT policy; they should not upsert hand rows for other
-- players directly.

create or replace function public.ensure_round_hands(
  p_session_id uuid,
  p_room_id uuid,
  p_round_number integer,
  p_scenario_id text,
  p_response_ids text[],
  p_hand_size integer default 4
)
returns table (
  success boolean,
  expected_hand_count integer,
  repaired_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_round record;
  v_response_count integer;
  v_repaired_count integer := 0;
begin
  if p_session_id is null or p_room_id is null or p_round_number is null then
    raise exception 'session_id, room_id, and round_number are required';
  end if;

  if p_hand_size is null or p_hand_size <= 0 then
    raise exception 'hand_size must be positive';
  end if;

  v_response_count := coalesce(cardinality(p_response_ids), 0);

  if v_response_count < p_hand_size then
    raise exception 'response pool must contain at least % ids', p_hand_size;
  end if;

  perform 1
  from public.game_sessions session
  where session.id = p_session_id
    and session.room_id = p_room_id;

  if not found then
    raise exception 'session % does not belong to room %', p_session_id, p_room_id;
  end if;

  select round.id,
         round.room_id,
         round.session_id,
         round.round_number,
         round.judge_player_id,
         round.scenario_id
  into v_round
  from public.game_rounds round
  where round.session_id = p_session_id
    and round.room_id = p_room_id
    and round.round_number = p_round_number;

  if not found then
    raise exception 'round % not found for session %', p_round_number, p_session_id;
  end if;

  if v_round.scenario_id is distinct from p_scenario_id then
    raise exception 'scenario mismatch for round %. Expected %, got %',
      p_round_number,
      v_round.scenario_id,
      p_scenario_id;
  end if;

  with active_players as (
    select player.id as player_id,
           player.local_player_id::text as local_player_id,
           row_number() over (order by player.joined_at, player.id) - 1 as player_index
    from public.room_players player
    where player.room_id = p_room_id
      and player.id <> v_round.judge_player_id
  ),
  ordered_responses as (
    select response_id,
           row_number() over (
             order by md5(p_session_id::text || ':' || p_round_number::text || ':' || response_id),
                      response_id
           ) - 1 as response_index
    from unnest(p_response_ids) as response_id
  ),
  dealt_hands as (
    select active_players.player_id,
           active_players.local_player_id,
           array_agg(ordered_responses.response_id order by draw.draw_index) as response_ids
    from active_players
    cross join generate_series(0, p_hand_size - 1) as draw(draw_index)
    join ordered_responses
      on ordered_responses.response_index = mod(
        (active_players.player_index::integer * p_hand_size + draw.draw_index)::integer,
        v_response_count
      )
    group by active_players.player_id,
             active_players.local_player_id,
             active_players.player_index
  )
  select count(*)::integer
  into v_repaired_count
  from dealt_hands dealt
  left join public.game_round_hands hand
    on hand.session_id = p_session_id
   and hand.round_number = p_round_number
   and hand.player_id = dealt.player_id
  where hand.id is null
     or cardinality(hand.response_ids) <> p_hand_size;

  with active_players as (
    select player.id as player_id,
           player.local_player_id::text as local_player_id,
           row_number() over (order by player.joined_at, player.id) - 1 as player_index
    from public.room_players player
    where player.room_id = p_room_id
      and player.id <> v_round.judge_player_id
  ),
  ordered_responses as (
    select response_id,
           row_number() over (
             order by md5(p_session_id::text || ':' || p_round_number::text || ':' || response_id),
                      response_id
           ) - 1 as response_index
    from unnest(p_response_ids) as response_id
  ),
  dealt_hands as (
    select active_players.player_id,
           active_players.local_player_id,
           array_agg(ordered_responses.response_id order by draw.draw_index) as response_ids
    from active_players
    cross join generate_series(0, p_hand_size - 1) as draw(draw_index)
    join ordered_responses
      on ordered_responses.response_index = mod(
        (active_players.player_index::integer * p_hand_size + draw.draw_index)::integer,
        v_response_count
      )
    group by active_players.player_id,
             active_players.local_player_id,
             active_players.player_index
  )
  insert into public.game_round_hands (
    session_id,
    room_id,
    round_number,
    player_id,
    local_player_id,
    response_ids
  )
  select p_session_id,
         p_room_id,
         p_round_number,
         dealt.player_id,
         dealt.local_player_id,
         dealt.response_ids
  from dealt_hands dealt
  on conflict (session_id, round_number, player_id)
  do update set
    room_id = excluded.room_id,
    local_player_id = excluded.local_player_id,
    response_ids = case
      when cardinality(public.game_round_hands.response_ids) = p_hand_size
        then public.game_round_hands.response_ids
      else excluded.response_ids
    end;

  return query
  with active_players as (
    select player.id
    from public.room_players player
    where player.room_id = p_room_id
      and player.id <> v_round.judge_player_id
  )
  select true,
         count(*)::integer,
         v_repaired_count
  from active_players;
end;
$$;

grant execute on function public.ensure_round_hands(uuid, uuid, integer, text, text[], integer)
  to anon, authenticated;

alter table public.game_round_hands enable row level security;

grant select on table public.game_round_hands to anon, authenticated;
revoke insert, update on table public.game_round_hands from anon, authenticated;

drop policy if exists "Prototype local player can read own round hand" on public.game_round_hands;
create policy "Prototype local player can read own round hand"
on public.game_round_hands for select
to anon, authenticated
using (
  local_player_id = coalesce(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-nofold-player-id', ''),
    '__missing__'
  )
);

drop policy if exists "Prototype local player can create own round hand" on public.game_round_hands;
drop policy if exists "Prototype client can ensure round hands" on public.game_round_hands;
drop policy if exists "Prototype client can repair round hands" on public.game_round_hands;
drop policy if exists "Prototype anon can insert round hands" on public.game_round_hands;
drop policy if exists "Prototype anon can update round hands" on public.game_round_hands;

comment on function public.ensure_round_hands(uuid, uuid, integer, text, text[], integer) is
  'Prototype SECURITY DEFINER RPC that creates or repairs private hand rows for all active non-Judge players without exposing other players response_ids to browser clients. It derives session, round, Judge, and active players from canonical tables; response ids come from the app seed for the canonical scenario.';

comment on policy "Prototype local player can read own round hand" on public.game_round_hands is
  'Prototype privacy: clients may only SELECT private hands matching their x-nofold-player-id header. This header is spoofable and must be replaced with auth-backed membership before production.';
