-- Concurrency guards. All functions retain caller permissions and existing RLS.
-- Browser identity remains unauthenticated in this prototype.
create or replace function public.preserve_locked_round_choice()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if old.locked_at is not null then return old; end if;
  return new;
end;
$$;
drop trigger if exists preserve_locked_response on public.game_round_responses;
create trigger preserve_locked_response before update on public.game_round_responses
for each row execute function public.preserve_locked_round_choice();
drop trigger if exists preserve_locked_decision on public.game_round_decisions;
create trigger preserve_locked_decision before update on public.game_round_decisions
for each row execute function public.preserve_locked_round_choice();

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
    where room_id = p_room_id order by created_at desc, id desc limit 1;
  if v_current.id <> v_previous.id then return v_current; end if;
  if not exists (select 1 from public.room_players where id = p_initial_judge_id and room_id = p_room_id)
     or coalesce(cardinality(p_scenario_order), 0) = 0 then
    raise exception 'Missing initial Judge or scenario order';
  end if;
  insert into public.game_sessions(room_id, current_round, total_rounds, status, scenario_order)
    values (p_room_id, 1, v_previous.total_rounds, 'ACTIVE', p_scenario_order)
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
