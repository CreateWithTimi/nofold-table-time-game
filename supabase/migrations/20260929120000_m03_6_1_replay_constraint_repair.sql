begin;

-- M03.5 removed guessed names, but the original unnamed UNIQUE clauses produced
-- names such as game_scores_room_id_player_id_key. Identify the old keys by
-- their columns instead, preserving history and the session-scoped keys.
do $$
declare
  spec record;
  old_key record;
begin
  for spec in select * from (values
    ('game_sessions', array['room_id']::text[]),
    ('game_scores', array['room_id','player_id']::text[]),
    ('game_rounds', array['room_id','round_number']::text[]),
    ('game_round_responses', array['room_id','round_number','player_id']::text[]),
    ('game_round_decisions', array['room_id','round_number','player_id']::text[])
  ) as keys(table_name, columns) loop
    for old_key in
      select c.conname from pg_constraint c
      where c.conrelid = format('public.%I', spec.table_name)::regclass
        and c.contype = 'u'
        and (select array_agg(a.attname::text order by k.position)
          from unnest(c.conkey) with ordinality k(attnum, position)
          join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) = spec.columns
    loop
      execute format('alter table public.%I drop constraint %I', spec.table_name, old_key.conname);
    end loop;
  end loop;
end;
$$;

create unique index if not exists game_sessions_one_active_per_room_idx
  on public.game_sessions(room_id) where status = 'ACTIVE';
create unique index if not exists game_scores_session_player_unique
  on public.game_scores(session_id, player_id);
create unique index if not exists game_rounds_session_round_unique
  on public.game_rounds(session_id, round_number);
create unique index if not exists game_round_responses_session_round_player_unique
  on public.game_round_responses(session_id, round_number, player_id);
create unique index if not exists game_round_decisions_session_round_player_unique
  on public.game_round_decisions(session_id, round_number, player_id);

alter table public.game_sessions add column if not exists replaces_session_id uuid
  references public.game_sessions(id);
create unique index if not exists game_sessions_one_replacement_idx
  on public.game_sessions(replaces_session_id) where replaces_session_id is not null;

create or replace function public.replace_finished_session(
  p_room_id uuid, p_expected_session_id uuid, p_player_id uuid,
  p_initial_judge_id uuid, p_scenario_order text[], p_choose_pack boolean
) returns public.game_sessions
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  v_room public.rooms;
  v_previous public.game_sessions;
  v_current public.game_sessions;
  v_final public.game_rounds;
begin
  if p_choose_pack is null then raise exception 'Replay action is required'; end if;
  -- All callers serialize before checking or creating a replacement.
  select * into strict v_room from public.rooms where id = p_room_id for update;
  select * into strict v_previous from public.game_sessions
    where id = p_expected_session_id and room_id = p_room_id;
  select * into strict v_final from public.game_rounds
    where session_id = v_previous.id and round_number = v_previous.current_round;
  if v_previous.status <> 'FINISHED' or v_final.phase <> 'ROUND_RESULT'
     or v_final.scores_applied_at is null then
    raise exception 'Session is not ready to restart';
  end if;
  if (p_choose_pack and v_room.host_player_id is distinct from p_player_id)
     or (not p_choose_pack and v_final.judge_player_id is distinct from p_player_id) then
    raise exception 'Only the designated player can restart this table';
  end if;
  select * into v_current from public.game_sessions
    where room_id = p_room_id and replaces_session_id = v_previous.id;
  if found then return v_current; end if;

  -- Compatibility with replacements created before the explicit parent link.
  select * into v_current from public.game_sessions
    where room_id = p_room_id order by created_at desc, id desc limit 1;
  if v_current.id <> v_previous.id then return v_current; end if;

  if not exists (select 1 from public.room_players where id = p_initial_judge_id and room_id = p_room_id)
     or coalesce(cardinality(p_scenario_order), 0) = 0 then
    raise exception 'Missing initial Judge or scenario order';
  end if;
  insert into public.game_sessions(room_id, current_round, total_rounds, status, scenario_order, replaces_session_id)
    values (p_room_id, 1, v_previous.total_rounds, 'ACTIVE', p_scenario_order, v_previous.id)
    returning * into v_current;
  insert into public.game_scores(session_id, room_id, player_id, score)
    select v_current.id, p_room_id, id, 10 from public.room_players where room_id = p_room_id;
  insert into public.game_rounds(session_id, room_id, round_number, judge_player_id,
    phase, defense_order, current_defender_index, scenario_id)
    values (v_current.id, p_room_id, 1, p_initial_judge_id,
      'RESPONSE_SELECTION', '{}'::uuid[], 0, p_scenario_order[1]);
  update public.rooms set
    status = case when p_choose_pack then 'PACK_SELECTION' else 'IN_GAME' end,
    selected_pack_id = case when p_choose_pack then null else selected_pack_id end,
    updated_at = now() where id = p_room_id;
  return v_current;
end;
$$;
revoke all on function public.replace_finished_session(uuid, uuid, uuid, uuid, text[], boolean) from public;
grant execute on function public.replace_finished_session(uuid, uuid, uuid, uuid, text[], boolean) to anon, authenticated;
comment on column public.game_sessions.replaces_session_id is
  'One canonical replacement per finished session; retries return this same session without resetting scores.';

commit;
