import { tableTroubleScenarios } from "../../data/packs/table-trouble";
import { GAME_PHASES } from "../../game/constants/phases";
import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import type { RoomPlayer } from "../../room/types";
import { getPersistedRound, type PersistedGameRound } from "../rounds";
import { getGameSession, selectScenarioIdForRound } from "./session";
import type { PersistedGameSession } from "./types";

export async function advanceToNextRound(params: {
  sessionId?: string | null;
  roomId: string;
  roomCode: string;
  roundNumber: number;
  judgePlayerId: string;
  players: RoomPlayer[];
}) {
  const [session, round] = await Promise.all([
    getGameSession(params.roomId),
    getPersistedRound(params.roomId, params.roundNumber, params.sessionId),
  ]);

  if (!session) {
    throw new Error("Cannot advance round before the game session exists.");
  }
  if (session.id !== params.sessionId || round?.session_id !== session.id) {
    throw new Error("This round belongs to an earlier session.");
  }

  if (!round) {
    throw new Error("Cannot advance round before the current round exists.");
  }

  if (round.phase !== GAME_PHASES.ROUND_RESULT) {
    throw new Error("Next round is only available after the round result.");
  }

  if (!round.scores_applied_at) {
    throw new Error("Scores must be applied before advancing.");
  }

  if (round.judge_player_id !== params.judgePlayerId) {
    throw new Error("Only the current Judge can advance the round.");
  }

  if (session.status === "FINISHED") {
    return { session, round };
  }

  if (session.current_round !== params.roundNumber) {
    return {
      session,
      round: await getPersistedRound(params.roomId, session.current_round, session.id),
    };
  }

  if (params.roundNumber >= session.total_rounds) {
    const finishedSession = await finishSession(params.roomId, params.roomCode, session.current_round, session.id);
    return { session: finishedSession, round };
  }

  const nextRoundNumber = params.roundNumber + 1;
  const nextJudgeId = selectRotatedJudge(params.players, round.judge_player_id);

  if (!nextJudgeId) {
    throw new Error("Cannot advance without a next Judge.");
  }

  await ensureNextRound({
    roomId: params.roomId,
    sessionId: session.id,
    roundNumber: nextRoundNumber,
    judgePlayerId: nextJudgeId,
    scenarioId: selectScenarioIdForRound(nextRoundNumber, session.scenario_order),
  });

  const client = requireSupabase();
  const { data, error } = await client
    .from("game_sessions")
    .update({ current_round: nextRoundNumber, status: "ACTIVE", updated_at: new Date().toISOString() })
    .eq("room_id", params.roomId)
    .eq("id", session.id)
    .eq("current_round", params.roundNumber)
    .eq("status", "ACTIVE")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("NO FOLD advanceToNextRound session update error", {
      roomId: params.roomId,
      roundNumber: params.roundNumber,
      nextRoundNumber,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not advance to next round", error);
  }

  const nextSession = (data as PersistedGameSession | null) ?? await getGameSession(params.roomId);

  return {
    session: nextSession,
    round: await getPersistedRound(params.roomId, nextRoundNumber, session.id),
  };
}

function selectRotatedJudge(players: RoomPlayer[], currentJudgeId: string) {
  if (players.length === 0) {
    return null;
  }

  const currentIndex = players.findIndex((player) => player.id === currentJudgeId);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % players.length : 0;
  return players[nextIndex]?.id ?? null;
}

async function ensureNextRound(params: {
  roomId: string;
  sessionId: string;
  roundNumber: number;
  judgePlayerId: string;
  scenarioId: string | null;
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
      session_id: params.sessionId,
      round_number: params.roundNumber,
      judge_player_id: params.judgePlayerId,
      phase: GAME_PHASES.RESPONSE_SELECTION,
      flow: null,
      defense_order: [],
      caller_ids: null,
      current_defender_index: 0,
      defense_started_at: null,
      stand_alone_player_id: null,
      stand_alone_twist_id: null,
      stand_alone_defense_started_at: null,
      no_escape_player_id: null,
      no_escape_scenario_id: null,
      no_escape_response_id: null,
      no_escape_defense_started_at: null,
      verdict: null,
      verdict_player_id: null,
      winning_player_id: null,
      scenario_id: params.scenarioId,
      scores_applied_at: null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
    }

    console.error("NO FOLD ensureNextRound Supabase error", {
      ...params,
      scenarioIdsAvailable: tableTroubleScenarios.map((scenario) => scenario.id),
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not create next round", error);
  }

  return data as PersistedGameRound;
}

async function finishSession(roomId: string, roomCode: string, expectedRound: number, sessionId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("game_sessions")
    .update({ status: "FINISHED", updated_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("id", sessionId)
    .eq("current_round", expectedRound)
    .eq("status", "ACTIVE")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("NO FOLD finishSession Supabase error", {
      roomId,
      expectedRound,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not finish game session", error);
  }

  const { error: roomError } = await client
    .from("rooms")
    .update({ status: "FINISHED", updated_at: new Date().toISOString() })
    .eq("id", roomId)
    .eq("code", roomCode);

  if (roomError) {
    console.error("NO FOLD finishSession room status error", {
      roomId,
      roomCode,
      error: describeSupabaseError(roomError),
    });
  }

  return (data as PersistedGameSession | null) ?? getGameSession(roomId);
}
