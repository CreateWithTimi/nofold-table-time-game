import { requireSupabase } from "../../lib/supabase";
import { getLocalPlayerIdentity } from "../playerIdentity/localPlayerIdentity";
import { normalizeRoomCode } from "./roomCode";
import { getRoomPlayers } from "./getRoomPlayers";
import { mapPersistedRoomToRoomState, type PersistedRoom } from "./types";

export async function getRoomByCode(code: string) {
  const client = requireSupabase();
  const normalizedCode = normalizeRoomCode(code);
  const { data: room, error } = await client
    .from("rooms")
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle<PersistedRoom>();

  if (error) {
    throw error;
  }

  if (!room) {
    return null;
  }

  const players = await getRoomPlayers(room.id);
  const identity = getLocalPlayerIdentity();

  return mapPersistedRoomToRoomState({ room, players }, identity?.id ?? null);
}
