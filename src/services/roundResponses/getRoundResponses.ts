import { requireSupabase } from "../../lib/supabase";
import type { PersistedRoundResponse } from "./types";

export async function getRoundResponses(
  roomId: string,
  roundNumber: number,
  sessionId?: string | null,
): Promise<PersistedRoundResponse[]> {
  const client = requireSupabase();
  let query = client
    .from("game_round_responses")
    .select("*")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);

  query = sessionId ? query.eq("session_id", sessionId) : query.is("session_id", null);

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as PersistedRoundResponse[];
}
