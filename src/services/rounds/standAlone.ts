import { GAME_PHASES } from "../../game/constants/phases";
import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import { getPersistedRound } from "./getPersistedRound";
import type { PersistedGameRound } from "./types";

export async function startStandAloneDefense(params: {
  roundId: string;
  roomId: string;
  sessionId?: string | null;
  roundNumber: number;
  playerId: string;
}) {
  const client = requireSupabase();
  let query = client
    .from("game_rounds")
    .update({
      phase: GAME_PHASES.STAND_ALONE_DEFENSE,
      stand_alone_defense_started_at: new Date().toISOString(),
    })
    .eq("id", params.roundId)
    .eq("phase", GAME_PHASES.STAND_ALONE)
    .eq("stand_alone_player_id", params.playerId);

  query = params.sessionId ? query.eq("session_id", params.sessionId) : query.is("session_id", null);

  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    console.error("NO FOLD startStandAloneDefense Supabase error", {
      ...params,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not start Stand Alone defense", error);
  }

  return (data as PersistedGameRound | null) ?? getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
}

export async function completeStandAloneDefense(params: {
  roundId: string;
  roomId: string;
  sessionId?: string | null;
  roundNumber: number;
  playerId: string;
}) {
  const client = requireSupabase();
  let query = client
    .from("game_rounds")
    .update({ phase: GAME_PHASES.STAND_ALONE_VERDICT })
    .eq("id", params.roundId)
    .eq("phase", GAME_PHASES.STAND_ALONE_DEFENSE)
    .eq("stand_alone_player_id", params.playerId)
    .not("stand_alone_defense_started_at", "is", null)
    .lte("stand_alone_defense_started_at", new Date(Date.now() - 15_000).toISOString());

  query = params.sessionId ? query.eq("session_id", params.sessionId) : query.is("session_id", null);

  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    console.error("NO FOLD completeStandAloneDefense Supabase error", {
      ...params,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not complete Stand Alone defense", error);
  }

  return (data as PersistedGameRound | null) ?? getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
}

export async function resolveStandAloneVerdict(params: {
  roundId: string;
  roomId: string;
  sessionId?: string | null;
  roundNumber: number;
  judgePlayerId: string;
  standAlonePlayerId: string;
  survived: boolean;
}) {
  const client = requireSupabase();
  let query = client
    .from("game_rounds")
    .update({
      phase: GAME_PHASES.ROUND_RESULT,
      verdict: params.survived ? "SURVIVED" : "CAUGHT",
      verdict_player_id: params.standAlonePlayerId,
    })
    .eq("id", params.roundId)
    .eq("phase", GAME_PHASES.STAND_ALONE_VERDICT)
    .eq("judge_player_id", params.judgePlayerId)
    .eq("stand_alone_player_id", params.standAlonePlayerId);

  query = params.sessionId ? query.eq("session_id", params.sessionId) : query.is("session_id", null);

  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    console.error("NO FOLD resolveStandAloneVerdict Supabase error", {
      roomId: params.roomId,
      roundNumber: params.roundNumber,
      roundId: params.roundId,
      judgePlayerId: params.judgePlayerId,
      standAlonePlayerId: params.standAlonePlayerId,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not resolve Stand Alone verdict", error);
  }

  return (data as PersistedGameRound | null) ?? getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
}
