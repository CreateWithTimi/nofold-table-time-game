import { GAME_PHASES } from "../../game/constants/phases";
import { requireSupabase } from "../../lib/supabase";
import { getPersistedRound } from "./getPersistedRound";
import type { PersistedGameRound } from "./types";

export async function advanceDefenseTurn(params: {
  roundId: string;
  roomId: string;
  sessionId?: string | null;
  roundNumber: number;
  currentDefenderIndex: number;
  defenseOrderLength: number;
}) {
  const client = requireSupabase();
  const isLastDefender = params.currentDefenderIndex >= params.defenseOrderLength - 1;
  const patch = isLastDefender
    ? { phase: GAME_PHASES.CALL_FOLD, defense_started_at: null }
    : {
        current_defender_index: params.currentDefenderIndex + 1,
        defense_started_at: null,
      };

  let query = client
    .from("game_rounds")
    .update(patch)
    .eq("id", params.roundId)
    .eq("phase", GAME_PHASES.DEFENSE)
    .eq("current_defender_index", params.currentDefenderIndex)
    .not("defense_started_at", "is", null)
    .lte("defense_started_at", new Date(Date.now() - 20_000).toISOString());

  query = params.sessionId ? query.eq("session_id", params.sessionId) : query.is("session_id", null);

  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PersistedGameRound | null) ?? getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
}
