import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import type { PersistedRoundDecision } from "./types";

export async function getRoundDecisions(roomId: string, roundNumber: number, sessionId?: string | null) {
  const client = requireSupabase();
  let query = client
    .from("game_round_decisions")
    .select("*")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);

  query = sessionId ? query.eq("session_id", sessionId) : query.is("session_id", null);

  const { data, error } = await query;

  if (error) {
    console.error("NO FOLD getRoundDecisions Supabase error", {
      table: "game_round_decisions",
      roomId,
      sessionId,
      roundNumber,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not load CALL/FOLD decisions", error);
  }

  return (data ?? []) as PersistedRoundDecision[];
}
