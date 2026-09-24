import type { PlayerDecision } from "../../game/types/game";
import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import type { PersistedRoundDecision } from "./types";

export async function lockRoundDecision(params: {
  sessionId?: string | null;
  roomId: string;
  roundNumber: number;
  playerId: string;
  decision: PlayerDecision;
}) {
  const client = requireSupabase();
  const payload = {
    session_id: params.sessionId ?? null,
    room_id: params.roomId,
    round_number: params.roundNumber,
    player_id: params.playerId,
    decision: params.decision,
    locked_at: new Date().toISOString(),
  };

  console.info("NO FOLD lockRoundDecision payload", {
    table: "game_round_decisions",
    onConflict: params.sessionId ? "session_id,round_number,player_id" : "room_id,round_number,player_id",
    payload: {
      room_id: payload.room_id,
      round_number: payload.round_number,
      player_id: payload.player_id,
      decision: payload.decision,
      locked_at: payload.locked_at,
    },
    payloadTypes: {
      room_id: typeof payload.room_id,
      round_number: typeof payload.round_number,
      player_id: typeof payload.player_id,
      decision: typeof payload.decision,
    },
  });

  const { data, error } = await client
    .from("game_round_decisions")
    .upsert(payload, {
      onConflict: params.sessionId ? "session_id,round_number,player_id" : "room_id,round_number,player_id",
    })
    .select("*")
    .single();

  if (error) {
    console.error("NO FOLD lockRoundDecision Supabase error", {
      table: "game_round_decisions",
      onConflict: params.sessionId ? "session_id,round_number,player_id" : "room_id,round_number,player_id",
      payload,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not lock CALL/FOLD decision", error);
  }

  return data as PersistedRoundDecision;
}
