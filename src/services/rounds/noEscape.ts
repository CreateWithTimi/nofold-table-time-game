import { tableTroubleScenarios } from "../../data/packs/table-trouble";
import { GAME_PHASES } from "../../game/constants/phases";
import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import { getPersistedRound } from "./getPersistedRound";
import type { PersistedGameRound } from "./types";

const noEscapeScenario = tableTroubleScenarios[1] ?? tableTroubleScenarios[0];
const noEscapeResponse = noEscapeScenario.responses[0];
const NO_ESCAPE_SECONDS = 15;

export async function startNoEscape(params: {
  roundId: string;
  roomId: string;
  sessionId?: string | null;
  roundNumber: number;
  activePlayerIds: string[];
  currentPlayerId?: string | null;
}) {
  const client = requireSupabase();

  if (!params.sessionId) {
    console.error("NO FOLD startNoEscape missing session id", params);
    throw new Error("Cannot start No Escape before the active session is loaded.");
  }

  const { data: session, error: sessionError } = await client
    .from("game_sessions")
    .select("id, room_id, current_round, status")
    .eq("id", params.sessionId)
    .eq("room_id", params.roomId)
    .maybeSingle();

  if (sessionError) {
    console.error("NO FOLD startNoEscape session fetch error", {
      ...params,
      error: describeSupabaseError(sessionError),
    });
    throw createSupabaseServiceError("Could not start No Escape", sessionError);
  }

  if (!session || session.status !== "ACTIVE" || session.current_round !== params.roundNumber) {
    console.error("NO FOLD startNoEscape active session mismatch", {
      ...params,
      sessionFound: Boolean(session),
      sessionId: session?.id ?? null,
      sessionRoomId: session?.room_id ?? null,
      sessionStatus: session?.status ?? null,
      sessionCurrentRound: session?.current_round ?? null,
    });
    throw new Error("Cannot start No Escape outside the active current round.");
  }

  const { data: existingData, error: roundError } = await client
    .from("game_rounds")
    .select("*")
    .eq("id", params.roundId)
    .eq("room_id", params.roomId)
    .eq("session_id", session.id)
    .eq("round_number", params.roundNumber)
    .maybeSingle();

  if (roundError) {
    console.error("NO FOLD startNoEscape round fetch error", {
      ...params,
      sessionId: session.id,
      error: describeSupabaseError(roundError),
    });
    throw createSupabaseServiceError("Could not start No Escape", roundError);
  }

  const existing = existingData as PersistedGameRound | null;

  if (!existing) {
    throw new Error("Cannot start No Escape before the shared round exists.");
  }

  console.info("NO FOLD startNoEscape attempt", {
    roomId: params.roomId,
    sessionId: session.id,
    roundNumber: params.roundNumber,
    roundId: params.roundId,
    roundSessionId: existing.session_id,
    phase: existing.phase,
    flow: existing.flow,
    judgePlayerId: existing.judge_player_id,
    noEscapePlayerId: existing.no_escape_player_id,
    currentPlayerId: params.currentPlayerId ?? null,
    providedActivePlayerIds: params.activePlayerIds,
  });

  if (existing.phase !== GAME_PHASES.COWARD_ROUND || existing.flow !== "COWARD") {
    return existing;
  }

  if (existing.no_escape_player_id) {
    return existing;
  }

  const { data: candidatePlayers, error: candidatesError } = await client
    .from("room_players")
    .select("id")
    .eq("room_id", params.roomId)
    .neq("id", existing.judge_player_id)
    .order("joined_at", { ascending: true })
    .order("id", { ascending: true });

  if (candidatesError) {
    console.error("NO FOLD startNoEscape candidate fetch error", {
      ...params,
      sessionId: session.id,
      judgePlayerId: existing.judge_player_id,
      error: describeSupabaseError(candidatesError),
    });
    throw createSupabaseServiceError("Could not start No Escape", candidatesError);
  }

  const candidatePlayerIds = (candidatePlayers ?? []).map((player) => player.id);

  if (candidatePlayerIds.length === 0) {
    throw new Error("Cannot start No Escape without active players.");
  }

  const noEscapePlayerId = candidatePlayerIds[Math.floor(Math.random() * candidatePlayerIds.length)];
  const { data, error } = await client
    .from("game_rounds")
    .update({
      phase: GAME_PHASES.NO_ESCAPE_DEFENSE,
      no_escape_player_id: noEscapePlayerId,
      no_escape_scenario_id: noEscapeScenario.id,
      no_escape_response_id: noEscapeResponse.id,
      no_escape_defense_started_at: new Date().toISOString(),
      verdict: null,
      verdict_player_id: null,
    })
    .eq("id", params.roundId)
    .eq("session_id", session.id)
    .eq("phase", GAME_PHASES.COWARD_ROUND)
    .eq("flow", "COWARD")
    .is("no_escape_player_id", null)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("NO FOLD startNoEscape Supabase error", {
      ...params,
      noEscapePlayerId,
      noEscapeScenarioId: noEscapeScenario.id,
      noEscapeResponseId: noEscapeResponse.id,
      candidatePlayerIds,
      currentPlayerId: params.currentPlayerId ?? null,
      roundSessionId: existing.session_id,
      phase: existing.phase,
      flow: existing.flow,
      judgePlayerId: existing.judge_player_id,
      existingNoEscapePlayerId: existing.no_escape_player_id,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not start No Escape", error);
  }

  if (!data) {
    console.info("NO FOLD startNoEscape guarded update did not win; refetching canonical row", {
      roomId: params.roomId,
      sessionId: session.id,
      roundNumber: params.roundNumber,
      roundId: params.roundId,
      candidatePlayerIds,
    });
  }

  return (data as PersistedGameRound | null) ?? getPersistedRound(params.roomId, params.roundNumber, session.id);
}

export async function completeNoEscapeDefense(params: {
  roundId: string;
  roomId: string;
  sessionId?: string | null;
  roundNumber: number;
  noEscapePlayerId: string;
}) {
  const earliestCompletedAt = new Date(Date.now() - NO_ESCAPE_SECONDS * 1000).toISOString();
  const client = requireSupabase();
  let query = client
    .from("game_rounds")
    .update({ phase: GAME_PHASES.NO_ESCAPE_VERDICT })
    .eq("id", params.roundId)
    .eq("flow", "COWARD")
    .eq("phase", GAME_PHASES.NO_ESCAPE_DEFENSE)
    .eq("no_escape_player_id", params.noEscapePlayerId)
    .not("no_escape_defense_started_at", "is", null)
    .lte("no_escape_defense_started_at", earliestCompletedAt);

  query = params.sessionId ? query.eq("session_id", params.sessionId) : query.is("session_id", null);

  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    console.error("NO FOLD completeNoEscapeDefense Supabase error", {
      ...params,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not complete No Escape defense", error);
  }

  if (!data) {
    console.info("NO FOLD completeNoEscapeDefense ignored before canonical timer elapsed", {
      ...params,
      earliestCompletedAt,
    });
  }

  return (data as PersistedGameRound | null) ?? getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
}

export async function resolveNoEscapeVerdict(params: {
  roundId: string;
  roomId: string;
  sessionId?: string | null;
  roundNumber: number;
  judgePlayerId: string;
  noEscapePlayerId: string;
  survived: boolean;
}) {
  const client = requireSupabase();
  let query = client
    .from("game_rounds")
    .update({
      phase: GAME_PHASES.ROUND_RESULT,
      verdict: params.survived ? "SURVIVED" : "CAUGHT",
      verdict_player_id: params.noEscapePlayerId,
    })
    .eq("id", params.roundId)
    .eq("flow", "COWARD")
    .eq("phase", GAME_PHASES.NO_ESCAPE_VERDICT)
    .eq("judge_player_id", params.judgePlayerId)
    .eq("no_escape_player_id", params.noEscapePlayerId);

  query = params.sessionId ? query.eq("session_id", params.sessionId) : query.is("session_id", null);

  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    console.error("NO FOLD resolveNoEscapeVerdict Supabase error", {
      roomId: params.roomId,
      roundNumber: params.roundNumber,
      roundId: params.roundId,
      judgePlayerId: params.judgePlayerId,
      noEscapePlayerId: params.noEscapePlayerId,
      survived: params.survived,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not resolve No Escape verdict", error);
  }

  return (data as PersistedGameRound | null) ?? getPersistedRound(params.roomId, params.roundNumber, params.sessionId);
}
