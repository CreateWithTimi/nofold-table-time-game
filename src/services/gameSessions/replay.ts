import { requireSupabase } from "../../lib/supabase";
import { createSupabaseServiceError, describeSupabaseError } from "../../lib/supabaseDiagnostics";
import type { RoomPlayer } from "../../room/types";
import { buildScenarioOrder } from "./session";
import type { PersistedGameSession } from "./types";

interface ReplayParams {
  roomId: string;
  sessionId: string;
  roomCode: string;
  players: RoomPlayer[];
  currentPlayerId: string;
  initialJudgeId: string;
  totalRounds?: number;
}

async function replaceSession(params: ReplayParams, choosePack: boolean) {
  const { data, error } = await requireSupabase().rpc("replace_finished_session", {
    p_room_id: params.roomId,
    p_expected_session_id: params.sessionId,
    p_player_id: params.currentPlayerId,
    p_initial_judge_id: params.initialJudgeId,
    p_scenario_order: buildScenarioOrder(),
    p_choose_pack: choosePack,
  }).single();
  if (error) {
    console.error("NO FOLD session replacement failed", {
      roomId: params.roomId, sessionId: params.sessionId, error: describeSupabaseError(error),
    });
    throw createSupabaseServiceError("Could not restart the table", error);
  }
  return data as PersistedGameSession;
}

export function restartSession(params: ReplayParams) {
  return replaceSession(params, false);
}

export function returnToPackSelection(params: ReplayParams & { hostPlayerId: string }) {
  return replaceSession(params, true);
}
