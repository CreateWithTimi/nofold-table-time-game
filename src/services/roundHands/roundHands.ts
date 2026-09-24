import { tableTroubleScenarios } from "../../data/packs/table-trouble";
import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import type { PersistedRoundHand } from "./types";

const HAND_SIZE = 4;
const EXPECTED_HAND_SIZE = 4;

interface RoundHandPlayer {
  id: string;
  localPlayerId?: string;
}

export async function getOwnRoundHand(params: {
  sessionId: string;
  roomId: string;
  roundNumber: number;
  playerId: string;
}) {
  const client = requireSupabase();
  let query = client
    .from("game_round_hands")
    .select("*")
    .eq("room_id", params.roomId)
    .eq("round_number", params.roundNumber)
    .eq("player_id", params.playerId);

  query = query.eq("session_id", params.sessionId);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("NO FOLD getOwnRoundHand Supabase error", {
      roomId: params.roomId,
      sessionId: params.sessionId ?? null,
      roundNumber: params.roundNumber,
      playerId: params.playerId,
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not load your response hand", error);
  }

  return (data ?? null) as PersistedRoundHand | null;
}

export async function ensureOwnRoundHand(params: {
  sessionId: string;
  roomId: string;
  roundNumber: number;
  playerId: string;
  scenarioId: string | null;
  activePlayers?: RoundHandPlayer[];
}) {
  const existing = await getOwnRoundHand(params);

  if (existing && existing.response_ids.length === EXPECTED_HAND_SIZE) {
    return existing;
  }

  await ensureRoundHands(params);
  const ensured = await getOwnRoundHand(params);

  if (!ensured || ensured.response_ids.length !== EXPECTED_HAND_SIZE) {
    console.error("NO FOLD own round hand unavailable after ensure", {
      roomId: params.roomId,
      sessionId: params.sessionId,
      roundNumber: params.roundNumber,
      playerId: params.playerId,
      ownHandFound: Boolean(ensured),
      ownHandPlayerId: ensured?.player_id ?? null,
      responseIdsLength: ensured?.response_ids.length ?? 0,
      activePlayerIds: params.activePlayers?.map((player) => player.id) ?? [],
    });
    return ensured;
  }

  return ensured;
}

export async function ensureRoundHands(params: {
  sessionId: string;
  roomId: string;
  roundNumber: number;
  scenarioId: string | null;
  activePlayers?: RoundHandPlayer[];
}) {
  const scenario = tableTroubleScenarios.find((candidate) => candidate.id === params.scenarioId);

  if (!scenario) {
    return null;
  }

  const activePlayerIds = params.activePlayers?.map((player) => player.id) ?? [];
  const responseIds = scenario.responses.map((response) => response.id);
  const client = requireSupabase();
  const { data, error } = await client.rpc("ensure_round_hands", {
    p_session_id: params.sessionId,
    p_room_id: params.roomId,
    p_round_number: params.roundNumber,
    p_scenario_id: params.scenarioId,
    p_response_ids: responseIds,
    p_hand_size: HAND_SIZE,
  });

  if (error) {
    console.error("NO FOLD ensureRoundHands Supabase error", {
      roomId: params.roomId,
      sessionId: params.sessionId,
      roundNumber: params.roundNumber,
      scenarioId: params.scenarioId,
      activePlayerIds,
      rpcName: "ensure_round_hands",
      error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not deal response hands", error);
  }

  console.info("NO FOLD ensured round hands", {
    roomId: params.roomId,
    sessionId: params.sessionId,
    roundNumber: params.roundNumber,
    scenarioId: params.scenarioId,
    activePlayerIds,
    rpcName: "ensure_round_hands",
    result: data,
  });

  return null;
}
