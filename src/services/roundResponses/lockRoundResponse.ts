import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import type { PersistedRoundResponse } from "./types";

export async function lockRoundResponse(params: {
  sessionId?: string | null;
  roomId: string;
  roundNumber: number;
  playerId: string;
  selectedResponseId: string;
}): Promise<PersistedRoundResponse> {
  const client = requireSupabase();
  const payload = {
    session_id: params.sessionId ?? null,
    room_id: params.roomId,
    round_number: params.roundNumber,
    player_id: params.playerId,
    selected_response_id: params.selectedResponseId,
    locked_at: new Date().toISOString(),
  };
  const payloadTypes = {
    room_id: typeof payload.room_id,
    round_number: typeof payload.round_number,
    player_id: typeof payload.player_id,
    selected_response_id: typeof payload.selected_response_id,
  };

  console.info("NO FOLD lockRoundResponse payload", {
    table: "game_round_responses",
    onConflict: params.sessionId ? "session_id,round_number,player_id" : "room_id,round_number,player_id",
    payload,
    payloadTypes,
  });

  const { data, error } = await client
    .from("game_round_responses")
    .upsert(payload, {
      onConflict: params.sessionId ? "session_id,round_number,player_id" : "room_id,round_number,player_id",
    })
    .select("*")
    .single();

  if (error) {
    console.error("NO FOLD lockRoundResponse Supabase error", {
      table: "game_round_responses",
      onConflict: params.sessionId ? "session_id,round_number,player_id" : "room_id,round_number,player_id",
      payload,
      payloadTypes,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not lock round response", error);
  }

  return data as PersistedRoundResponse;
}
