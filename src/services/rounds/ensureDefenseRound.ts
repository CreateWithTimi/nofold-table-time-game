import { GAME_PHASES } from "../../game/constants/phases";
import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import { getRoundResponses } from "../roundResponses";
import { getPersistedRound } from "./getPersistedRound";
import type { PersistedGameRound } from "./types";

const PRE_DEFENSE_PHASES = new Set<string>([
  GAME_PHASES.RESPONSE_SELECTION,
  "RESPONSE",
  "CHOOSING",
  "LOCKED",
]);

export function isPreDefenseRoundPhase(phase: string | null | undefined) {
  return !phase || PRE_DEFENSE_PHASES.has(phase);
}

export async function ensureDefenseRoundStarted(params: {
  sessionId?: string | null;
  roomId: string;
  roundNumber: number;
  judgePlayerId: string;
  defenseOrder: string[];
}) {
  const responses = await getRoundResponses(params.roomId, params.roundNumber, params.sessionId);
  const lockedPlayerIds = new Set(
    responses.filter((response) => Boolean(response.locked_at)).map((response) => response.player_id),
  );
  const allLocked =
    params.defenseOrder.length > 0 &&
    params.defenseOrder.every((playerId) => lockedPlayerIds.has(playerId));

  console.info("NO FOLD ensureDefenseRoundStarted readiness", {
    roomId: params.roomId,
    sessionId: params.sessionId ?? null,
    roundNumber: params.roundNumber,
    judgePlayerId: params.judgePlayerId,
    defenseOrder: params.defenseOrder,
    responseRows: responses.map((response) => ({
      playerId: response.player_id,
      locked: Boolean(response.locked_at),
    })),
    lockedPlayerIds: Array.from(lockedPlayerIds),
    allLocked,
  });

  if (!allLocked) {
    return getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
  }

  const existing = await getPersistedRound(params.roomId, params.roundNumber, params.sessionId);

  if (existing) {
    if (!isPreDefenseRoundPhase(existing.phase)) {
      console.info("NO FOLD defense round already exists", {
        roomId: params.roomId,
        roundNumber: params.roundNumber,
        roundId: existing.id,
        phase: existing.phase,
      });
      return existing;
    }

    const client = requireSupabase();
    let updateQuery = client
      .from("game_rounds")
      .update({
        phase: GAME_PHASES.DEFENSE,
        judge_player_id: params.judgePlayerId,
        defense_order: params.defenseOrder,
        current_defender_index: 0,
        defense_started_at: null,
      })
      .eq("id", existing.id);

    updateQuery = existing.phase ? updateQuery.eq("phase", existing.phase) : updateQuery.is("phase", null);

    const { data, error } = await updateQuery
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("NO FOLD failed to update existing round to DEFENSE", {
        roomId: params.roomId,
        roundNumber: params.roundNumber,
        roundId: existing.id,
        existingPhase: existing.phase,
        error: describeSupabaseError(error),
      });
      throw createSupabaseServiceError("Could not update shared round to defense", error);
    }

    console.info("NO FOLD updated existing round to DEFENSE", {
      roomId: params.roomId,
      roundNumber: params.roundNumber,
      roundId: existing.id,
      defenseOrder: params.defenseOrder,
    });

    return (data as PersistedGameRound | null) ?? getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("game_rounds")
    .insert({
      room_id: params.roomId,
      session_id: params.sessionId ?? null,
      round_number: params.roundNumber,
      judge_player_id: params.judgePlayerId,
      phase: GAME_PHASES.DEFENSE,
      defense_order: params.defenseOrder,
      current_defender_index: 0,
      defense_started_at: null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      console.info("NO FOLD defense round insert raced; refetching canonical round", {
        roomId: params.roomId,
        roundNumber: params.roundNumber,
      });
      return getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
    }

    console.error("NO FOLD failed to create shared DEFENSE round", {
      roomId: params.roomId,
      roundNumber: params.roundNumber,
      judgePlayerId: params.judgePlayerId,
      defenseOrder: params.defenseOrder,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not create shared defense round", error);
  }

  console.info("NO FOLD created shared DEFENSE round", {
    roomId: params.roomId,
    roundNumber: params.roundNumber,
    roundId: data.id,
    defenseOrder: params.defenseOrder,
  });

  return data as PersistedGameRound;
}

export async function ensureDefenseRound(params: {
  sessionId?: string | null;
  roomId: string;
  roundNumber: number;
  judgePlayerId: string;
  defenseOrder: string[];
}) {
  const existing = await getPersistedRound(params.roomId, params.roundNumber, params.sessionId);

  if (existing) {
    return existing;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("game_rounds")
    .insert({
      room_id: params.roomId,
      session_id: params.sessionId ?? null,
      round_number: params.roundNumber,
      judge_player_id: params.judgePlayerId,
      phase: GAME_PHASES.DEFENSE,
      defense_order: params.defenseOrder,
      current_defender_index: 0,
      defense_started_at: null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
    }

    throw error;
  }

  return data as PersistedGameRound;
}
