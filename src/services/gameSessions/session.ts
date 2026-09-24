import { tableTroubleScenarios } from "../../data/packs/table-trouble";
import { GAME_PHASES } from "../../game/constants/phases";
import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import type { RoomPlayer } from "../../room/types";
import { getPersistedRound } from "../rounds";
import type { PersistedGameRound } from "../rounds";
import type { PersistedGameScore, PersistedGameSession } from "./types";

const DEFAULT_TOTAL_ROUNDS = 8;
const INITIAL_TABLE_POINTS = 10;

export function buildScenarioOrder() {
  const ids = tableTroubleScenarios.map((scenario) => scenario.id);

  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
  }

  return ids;
}

export function selectScenarioIdForRound(roundNumber: number, scenarioOrder?: string[] | null) {
  const ids = scenarioOrder && scenarioOrder.length > 0
    ? scenarioOrder
    : tableTroubleScenarios.map((scenario) => scenario.id);
  const scenarioId = ids[(roundNumber - 1) % ids.length];
  return scenarioId ?? tableTroubleScenarios[0]?.id ?? null;
}

export async function getGameSession(roomId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("game_sessions")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("NO FOLD getGameSession Supabase error", {
      roomId,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not load game session", error);
  }

  return (data ?? null) as PersistedGameSession | null;
}

export async function getActiveGameSession(roomId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("game_sessions")
    .select("*")
    .eq("room_id", roomId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("NO FOLD getActiveGameSession Supabase error", {
      roomId,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not load active game session", error);
  }

  return (data ?? null) as PersistedGameSession | null;
}

export async function getGameScores(roomId: string, sessionId?: string | null) {
  const client = requireSupabase();
  let query = client
    .from("game_scores")
    .select("*")
    .eq("room_id", roomId);

  query = sessionId ? query.eq("session_id", sessionId) : query.is("session_id", null);

  const { data, error } = await query;

  if (error) {
    console.error("NO FOLD getGameScores Supabase error", {
      roomId,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not load game scores", error);
  }

  return (data ?? []) as PersistedGameScore[];
}

export async function ensureGameSession(params: {
  roomId: string;
  players: RoomPlayer[];
  initialJudgeId: string;
  totalRounds?: number;
}) {
  const totalRounds = params.totalRounds ?? DEFAULT_TOTAL_ROUNDS;
  let session = await getGameSession(params.roomId);

  if (!session) {
    session = await createFreshGameSession({
      roomId: params.roomId,
      players: params.players,
      initialJudgeId: params.initialJudgeId,
      totalRounds,
    });
  }

  if (!session) {
    throw new Error("Could not create or load game session.");
  }

  await ensureScoreRows(params.roomId, params.players.map((player) => player.id), session.id);
  await ensureRoundOne(params.roomId, params.initialJudgeId, session);

  return {
    session,
    scores: await getGameScores(params.roomId, session.id),
    currentRound: await getPersistedRound(params.roomId, session.current_round, session.id),
  };
}

export async function createFreshGameSession(params: {
  roomId: string;
  players: RoomPlayer[];
  initialJudgeId: string;
  totalRounds?: number;
}) {
  const totalRounds = params.totalRounds ?? DEFAULT_TOTAL_ROUNDS;
  const client = requireSupabase();
  // Bootstrap must never retire a session concurrently created by another tab.

  const { data, error } = await client
    .from("game_sessions")
    .insert({
      room_id: params.roomId,
      current_round: 1,
      total_rounds: totalRounds,
      status: "ACTIVE",
      scenario_order: buildScenarioOrder(),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const active = await getActiveGameSession(params.roomId);

      if (active) {
        await ensureScoreRows(params.roomId, params.players.map((player) => player.id), active.id);
        await ensureRoundOne(params.roomId, params.initialJudgeId, active);
        return active;
      }
    }

    console.error("NO FOLD createFreshGameSession insert error", {
      roomId: params.roomId,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not create fresh game session", error);
  }

  const session = data as PersistedGameSession;
  await ensureScoreRows(params.roomId, params.players.map((player) => player.id), session.id);
  await ensureRoundOne(params.roomId, params.initialJudgeId, session);

  return session;
}

export async function ensureScoreRows(roomId: string, playerIds: string[], sessionId?: string | null) {
  if (playerIds.length === 0) {
    return [];
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("game_scores")
    .upsert(
      playerIds.map((playerId) => ({
        session_id: sessionId ?? null,
        room_id: roomId,
        player_id: playerId,
        score: INITIAL_TABLE_POINTS,
      })),
      {
        onConflict: sessionId ? "session_id,player_id" : "room_id,player_id",
        ignoreDuplicates: true,
      },
    )
    .select("*");

  if (error) {
    console.error("NO FOLD ensureScoreRows Supabase error", {
      roomId,
      playerIds,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not initialize game scores", error);
  }

  return (data ?? []) as PersistedGameScore[];
}

async function ensureRoundOne(roomId: string, judgePlayerId: string, session: PersistedGameSession) {
  const existing = await getPersistedRound(roomId, 1, session.id);

  if (existing) {
    return existing;
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("game_rounds")
    .insert({
      room_id: roomId,
      session_id: session.id,
      round_number: 1,
      judge_player_id: judgePlayerId,
      phase: GAME_PHASES.RESPONSE_SELECTION,
      flow: null,
      defense_order: [],
      current_defender_index: 0,
      defense_started_at: null,
      scenario_id: selectScenarioIdForRound(1, session.scenario_order),
      scores_applied_at: null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return getPersistedRound(roomId, 1, session.id);
    }

    console.error("NO FOLD ensureRoundOne Supabase error", {
      roomId,
      judgePlayerId,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not create Round 1", error);
  }

  return data as PersistedGameRound;
}
