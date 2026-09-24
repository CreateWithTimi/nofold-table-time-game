-- M03.5 readiness: apply round score deltas atomically inside Postgres.
-- This prevents browser-side read/modify/write from using stale or legacy score
-- rows when sessions rotate across multiple rounds.

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
  v_score record;
begin
  if p_round_id is null or p_session_id is null or p_room_id is null then
    raise exception 'round_id, session_id, and room_id are required';
  end if;

  update public.game_rounds
  set scores_applied_at = v_applied_at
  where id = p_round_id
    and session_id = p_session_id
    and room_id = p_room_id
    and phase = 'ROUND_RESULT'
    and scores_applied_at is null;

  if not found then
    return query
    select false,
           round.scores_applied_at
    from public.game_rounds round
    where round.id = p_round_id
      and round.session_id = p_session_id
      and round.room_id = p_room_id;
    return;
  end if;

  for v_score in
    select key::uuid as player_id,
           value::integer as delta
    from jsonb_each_text(coalesce(p_deltas, '{}'::jsonb))
  loop
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
    )
    on conflict (session_id, player_id)
    do update set
      score = public.game_scores.score + excluded.score - 10,
      updated_at = now();
  end loop;

  return query select true, v_applied_at;
end;
$$;

grant execute on function public.apply_round_score_deltas(uuid, uuid, uuid, jsonb)
  to anon, authenticated;

comment on function public.apply_round_score_deltas(uuid, uuid, uuid, jsonb) is
  'Prototype scoring RPC: claims a ROUND_RESULT once, then atomically increments session-scoped game_scores by player delta. Missing score rows start from 10 table points.';
