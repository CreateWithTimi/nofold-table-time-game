import { SCORING } from "../../game/constants/scoring";
import { GAME_PHASES } from "../../game/constants/phases";
import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import { getRoundDecisions } from "../roundDecisions";
import { getPersistedRound, type PersistedGameRound } from "../rounds";
import { getGameScores } from "./session";

export async function applyRoundScoresOnce(params: {
  sessionId?: string | null;
  roomId: string;
  roundNumber: number;
}) {
  const round = await getPersistedRound(params.roomId, params.roundNumber, params.sessionId);

  if (!round || round.phase !== GAME_PHASES.ROUND_RESULT) {
    return { round, scores: await getGameScores(params.roomId, params.sessionId), applied: false };
  }

  if (round.scores_applied_at) {
    return { round, scores: await getGameScores(params.roomId, params.sessionId), applied: false };
  }

  const deltas = await deriveRoundScoreDeltas(params.roomId, params.roundNumber, round, params.sessionId);
  const client = requireSupabase();

  console.info("NO FOLD applyRoundScoresOnce RPC attempt", {
    roomId: params.roomId,
    sessionId: params.sessionId ?? null,
    roundNumber: params.roundNumber,
    roundId: round.id,
    phase: round.phase,
    flow: round.flow,
    scoresAppliedAt: round.scores_applied_at,
    playerIds: Object.keys(deltas),
    deltas,
  });

  const { data: applyResult, error: claimError } = await client.rpc("apply_round_score_deltas", {
    p_round_id: round.id,
    p_session_id: params.sessionId,
    p_room_id: params.roomId,
    p_deltas: deltas,
  });

  if (claimError) {
    console.error("NO FOLD applyRoundScoresOnce claim error", {
      roomId: params.roomId,
      sessionId: params.sessionId ?? null,
      roundNumber: params.roundNumber,
      roundId: round.id,
      phase: round.phase,
      flow: round.flow,
      scoresAppliedAt: round.scores_applied_at,
      playerIds: Object.keys(deltas),
      deltas,
      error: describeSupabaseError(claimError),
    });
    throw createSupabaseServiceError("Could not claim round score application", claimError);
  }

  const applied = Array.isArray(applyResult) ? Boolean(applyResult[0]?.applied) : false;

  if (!applied) {
    console.info("NO FOLD applyRoundScoresOnce RPC returned not-applied", {
      roomId: params.roomId,
      sessionId: params.sessionId ?? null,
      roundNumber: params.roundNumber,
      roundId: round.id,
      phase: round.phase,
      flow: round.flow,
      scoresAppliedAt: round.scores_applied_at,
      playerIds: Object.keys(deltas),
      deltas,
      applyResult,
    });

    return {
      round: await getPersistedRound(params.roomId, params.roundNumber, params.sessionId),
      scores: await getGameScores(params.roomId, params.sessionId),
      applied: false,
    };
  }

  return {
    round: await getPersistedRound(params.roomId, params.roundNumber, params.sessionId) as PersistedGameRound,
    scores: await getGameScores(params.roomId, params.sessionId),
    applied: true,
  };
}

export async function deriveRoundScoreDeltas(
  roomId: string,
  roundNumber: number,
  round: PersistedGameRound,
  sessionId?: string | null,
) {
  const decisions = await getRoundDecisions(roomId, roundNumber, sessionId);
  const decisionByPlayerId = new Map(decisions.map((decision) => [decision.player_id, decision.decision]));
  const activePlayerIds = round.defense_order ?? [];
  const deltas: Record<string, number> = {};

  if (round.flow === "NORMAL") {
    for (const playerId of activePlayerIds) {
      if (playerId === round.winning_player_id) {
        deltas[playerId] = SCORING.CALL_WIN;
      } else if (decisionByPlayerId.get(playerId) === "CALL") {
        deltas[playerId] = SCORING.CALL_LOSE;
      } else if (decisionByPlayerId.get(playerId) === "FOLD") {
        deltas[playerId] = SCORING.FOLD;
      }
    }

    return deltas;
  }

  if (round.flow === "STAND_ALONE") {
    for (const playerId of activePlayerIds) {
      if (playerId === round.stand_alone_player_id) {
        deltas[playerId] = round.verdict === "SURVIVED"
          ? SCORING.STAND_ALONE_SURVIVE
          : SCORING.STAND_ALONE_FAIL;
      } else if (decisionByPlayerId.get(playerId) === "FOLD") {
        deltas[playerId] = SCORING.FOLD;
      }
    }

    return deltas;
  }

  if (round.flow === "COWARD") {
    for (const playerId of activePlayerIds) {
      deltas[playerId] = SCORING.EVERYBODY_FOLDS;
    }
  }

  return deltas;
}
