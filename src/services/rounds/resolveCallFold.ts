import { GAME_PHASES } from "../../game/constants/phases";
import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import { getRoundDecisions } from "../roundDecisions";
import { getPersistedRound } from "./getPersistedRound";
import type { PersistedGameRound } from "./types";

export async function ensureCallFoldResolved(params: {
  sessionId?: string | null;
  roomId: string;
  roundNumber: number;
  roundId: string;
  activePlayerIds: string[];
  standAloneTwistId: string | null;
}) {
  const decisions = await getRoundDecisions(params.roomId, params.roundNumber, params.sessionId);
  const lockedDecisions = decisions.filter((decision) => Boolean(decision.locked_at));
  const lockedPlayerIds = new Set(lockedDecisions.map((decision) => decision.player_id));
  const allLocked =
    params.activePlayerIds.length > 0 &&
    params.activePlayerIds.every((playerId) => lockedPlayerIds.has(playerId));

  console.info("NO FOLD ensureCallFoldResolved readiness", {
    roomId: params.roomId,
    sessionId: params.sessionId ?? null,
    roundNumber: params.roundNumber,
    roundId: params.roundId,
    activePlayerIds: params.activePlayerIds,
    decisionRows: decisions.map((decision) => ({
      playerId: decision.player_id,
      locked: Boolean(decision.locked_at),
    })),
    allLocked,
  });

  const existing = await getPersistedRound(params.roomId, params.roundNumber, params.sessionId);

  if (!allLocked) {
    return existing;
  }

  if (!existing) {
    throw new Error("Cannot resolve CALL/FOLD before the shared round exists.");
  }

  if (existing.phase !== GAME_PHASES.CALL_FOLD) {
    return existing;
  }

  const callerIds = lockedDecisions
    .filter((decision) => decision.decision === "CALL")
    .map((decision) => decision.player_id);
  const patch =
    callerIds.length >= 2
      ? {
          phase: GAME_PHASES.JUDGE_PICK,
          flow: "NORMAL",
          caller_ids: callerIds,
          stand_alone_player_id: null,
          no_escape_player_id: null,
        }
      : callerIds.length === 1
        ? {
            phase: GAME_PHASES.STAND_ALONE,
            flow: "STAND_ALONE",
            caller_ids: callerIds,
            stand_alone_player_id: callerIds[0],
            stand_alone_twist_id: params.standAloneTwistId,
            stand_alone_defense_started_at: null,
            verdict: null,
            verdict_player_id: null,
            no_escape_player_id: null,
          }
        : {
            phase: GAME_PHASES.COWARD_ROUND,
            flow: "COWARD",
            caller_ids: [],
            stand_alone_player_id: null,
            no_escape_player_id: null,
          };

  const client = requireSupabase();
  const { data, error } = await client
    .from("game_rounds")
    .update(patch)
    .eq("id", params.roundId)
    .eq("phase", GAME_PHASES.CALL_FOLD)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("NO FOLD CALL/FOLD resolution Supabase error", {
      roomId: params.roomId,
      roundNumber: params.roundNumber,
      roundId: params.roundId,
      activePlayerIds: params.activePlayerIds,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not resolve CALL/FOLD branch", error);
  }

  if (!data) {
    return getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
  }

  console.info("NO FOLD resolved CALL/FOLD branch", {
    roomId: params.roomId,
    roundNumber: params.roundNumber,
    roundId: params.roundId,
    phase: data.phase,
    flow: data.flow,
    callerIds,
  });

  return data as PersistedGameRound;
}
