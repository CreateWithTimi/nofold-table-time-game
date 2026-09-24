import { GAME_PHASES } from "../../game/constants/phases";
import { requireSupabase } from "../../lib/supabase";
import { getPersistedRound } from "./getPersistedRound";
import type { PersistedGameRound } from "./types";

export async function startDefenseTimer(params: {
  roundId: string;
  roomId: string;
  sessionId?: string | null;
  roundNumber: number;
  currentDefenderIndex: number;
}) {
  const client = requireSupabase();
  let query = client
    .from("game_rounds")
    .update({ defense_started_at: new Date().toISOString() })
    .eq("id", params.roundId)
    .eq("phase", GAME_PHASES.DEFENSE)
    .eq("current_defender_index", params.currentDefenderIndex)
    .is("defense_started_at", null);

  query = params.sessionId ? query.eq("session_id", params.sessionId) : query.is("session_id", null);

  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PersistedGameRound | null) ?? getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
}
