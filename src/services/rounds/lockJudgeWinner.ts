import { GAME_PHASES } from "../../game/constants/phases";
import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import { getPersistedRound } from "./getPersistedRound";
import type { PersistedGameRound } from "./types";

export async function lockJudgeWinner(params: {
  roundId: string;
  roomId: string;
  sessionId?: string | null;
  roundNumber: number;
  judgePlayerId: string;
  winningPlayerId: string;
}) {
  if (params.sessionId) {
    const client = requireSupabase();
    const { data: session, error: sessionError } = await client
      .from("game_sessions")
      .select("id, room_id, current_round, status")
      .eq("id", params.sessionId)
      .eq("room_id", params.roomId)
      .maybeSingle();

    if (sessionError) {
      console.error("NO FOLD lockJudgeWinner session lookup error", {
        roundId: params.roundId,
        sessionId: params.sessionId,
        roomId: params.roomId,
        roundNumber: params.roundNumber,
        judgePlayerId: params.judgePlayerId,
        winningPlayerId: params.winningPlayerId,
        error: describeSupabaseError(sessionError),
      });
      throw createSupabaseServiceError("Could not verify current game session", sessionError);
    }

    if (!session || session.current_round !== params.roundNumber || session.status !== "ACTIVE") {
      console.error("NO FOLD lockJudgeWinner session mismatch", {
        roundId: params.roundId,
        sessionId: params.sessionId,
        roomId: params.roomId,
        roundNumber: params.roundNumber,
        judgePlayerId: params.judgePlayerId,
        winningPlayerId: params.winningPlayerId,
        session,
      });
      throw new Error("Cannot lock winner for a stale session.");
    }
  }

  const existing = await getPersistedRound(params.roomId, params.roundNumber, params.sessionId);

  if (!existing) {
    console.error("NO FOLD lockJudgeWinner missing round", {
      roundId: params.roundId,
      sessionId: params.sessionId ?? null,
      roomId: params.roomId,
      roundNumber: params.roundNumber,
      judgePlayerId: params.judgePlayerId,
      winningPlayerId: params.winningPlayerId,
    });
    throw new Error("Cannot lock a winner before the shared round exists.");
  }

  if (existing.phase === GAME_PHASES.ROUND_RESULT && existing.winning_player_id) {
    return existing;
  }

  if (existing.id !== params.roundId) {
    console.error("NO FOLD lockJudgeWinner stale round id", {
      expectedRoundId: params.roundId,
      canonicalRoundId: existing.id,
      sessionId: params.sessionId ?? null,
      canonicalSessionId: existing.session_id,
      roomId: params.roomId,
      roundNumber: params.roundNumber,
      judgePlayerId: params.judgePlayerId,
      winningPlayerId: params.winningPlayerId,
      phase: existing.phase,
      flow: existing.flow,
    });
    throw new Error("Cannot lock winner for a stale round.");
  }

  if (existing.flow !== "NORMAL" || existing.phase !== GAME_PHASES.JUDGE_PICK) {
    console.error("NO FOLD lockJudgeWinner wrong phase", {
      roundId: params.roundId,
      sessionId: params.sessionId ?? null,
      roomId: params.roomId,
      roundNumber: params.roundNumber,
      judgePlayerId: params.judgePlayerId,
      winningPlayerId: params.winningPlayerId,
      phase: existing.phase,
      flow: existing.flow,
    });
    throw new Error("Winner can only be locked during a normal Judge Pick round.");
  }

  if (existing.judge_player_id !== params.judgePlayerId) {
    throw new Error("Only the current Judge can lock the winner.");
  }

  if (params.winningPlayerId === existing.judge_player_id) {
    throw new Error("Judge cannot select themself as winner.");
  }

  if (!existing.defense_order.includes(params.winningPlayerId)) {
    throw new Error("Winner must be an active player in this round.");
  }

  if (!existing.caller_ids?.includes(params.winningPlayerId)) {
    throw new Error("Winner must be one of the players who called.");
  }

  const client = requireSupabase();
  let query = client
    .from("game_rounds")
    .update({
      phase: GAME_PHASES.ROUND_RESULT,
      winning_player_id: params.winningPlayerId,
    })
    .eq("id", params.roundId)
    .eq("room_id", params.roomId)
    .eq("phase", GAME_PHASES.JUDGE_PICK)
    .eq("flow", "NORMAL")
    .eq("judge_player_id", params.judgePlayerId);

  query = params.sessionId ? query.eq("session_id", params.sessionId) : query.is("session_id", null);

  const { data, error } = await query
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("NO FOLD lockJudgeWinner Supabase error", {
      roomId: params.roomId,
      sessionId: params.sessionId ?? null,
      roundNumber: params.roundNumber,
      roundId: params.roundId,
      judgePlayerId: params.judgePlayerId,
      winningPlayerId: params.winningPlayerId,
      currentPhase: existing.phase,
      flow: existing.flow,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not lock Judge winner", error);
  }

  if (!data) {
    console.error("NO FOLD lockJudgeWinner guarded update returned no row", {
      roomId: params.roomId,
      sessionId: params.sessionId ?? null,
      roundNumber: params.roundNumber,
      roundId: params.roundId,
      judgePlayerId: params.judgePlayerId,
      winningPlayerId: params.winningPlayerId,
      currentPhase: existing.phase,
      flow: existing.flow,
    });
  }

  return (data as PersistedGameRound | null) ?? getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
}
