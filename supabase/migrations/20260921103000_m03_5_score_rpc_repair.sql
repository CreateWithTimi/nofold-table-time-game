-- M03.5 hotfix: make round score application idempotent and avoid
-- ON CONFLICT dependency for live schemas that may have partial/legacy indexes.

create or replace function public.apply_round_score_deltas(
  p_round_id uuid,
  p_session_id uuid,
  p_room_id uuid,
  p_deltas jsonb
)
returns table (
  applied boolean,
  scores_applied_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_applied_at timestamptz := now();
  v_existing_applied_at timestamptz;
  v_score record;
begin
  if p_round_id is null or p_session_id is null or p_room_id is null then
    raise exception 'round_id, session_id, and room_id are required';
  end if;

  select round.scores_applied_at
  into v_existing_applied_at
  from public.game_rounds round
  where round.id = p_round_id
    and round.session_id = p_session_id
    and round.room_id = p_room_id
    and round.phase = 'ROUND_RESULT'
  for update;

  if not found then
    raise exception 'round % is not a ROUND_RESULT for session % and room %',
      p_round_id,
      p_session_id,
      p_room_id;
  end if;

  if v_existing_applied_at is not null then
    return query select true, v_existing_applied_at;
    return;
  end if;

  for v_score in
    select key::uuid as player_id,
           value::integer as delta
    from jsonb_each_text(coalesce(p_deltas, '{}'::jsonb))
  loop
    update public.game_scores
    set score = score + v_score.delta,
        updated_at = now()
    where session_id = p_session_id
      and room_id = p_room_id
      and player_id = v_score.player_id;

    if not found then
      insert into public.game_scores (
        session_id,
        room_id,
        player_id,
        score,
        updated_at
      )
      values (
        p_session_id,
        p_room_id,
        v_score.player_id,
        10 + v_score.delta,
        now()
      );
    end if;
  end loop;

  update public.game_rounds
  set scores_applied_at = v_applied_at
  where id = p_round_id
    and session_id = p_session_id
    and room_id = p_room_id;

  return query select true, v_applied_at;
end;
$$;

grant execute on function public.apply_round_score_deltas(uuid, uuid, uuid, jsonb)
  to anon, authenticated;

comment on function public.apply_round_score_deltas(uuid, uuid, uuid, jsonb) is
  'Prototype scoring RPC repair: locks a ROUND_RESULT row, returns success if already applied, otherwise atomically increments session-scoped game_scores and then marks scores_applied_at. Missing rows start from 10 table points.';
