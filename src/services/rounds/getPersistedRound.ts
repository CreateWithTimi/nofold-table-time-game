import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import type { PersistedGameRound } from "./types";

export async function getPersistedRound(roomId: string, roundNumber: number, sessionId?: string | null) {
  const client = requireSupabase();
  let query = client
    .from("game_rounds")
    .select("*")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);

  query = sessionId ? query.eq("session_id", sessionId) : query.is("session_id", null);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("NO FOLD getPersistedRound Supabase error", {
      table: "game_rounds",
      roomId,
      sessionId,
      roundNumber,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not load shared round", error);
  }

  return (data ?? null) as PersistedGameRound | null;
}
