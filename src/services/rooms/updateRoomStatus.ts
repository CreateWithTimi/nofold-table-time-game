import { requireSupabase } from "../../lib/supabase";
import type { RoomStatus } from "../../room/types";
import { getRoomPlayers } from "./getRoomPlayers";
import { mapPersistedRoomToRoomState, type PersistedRoom } from "./types";
import { getLocalPlayerIdentity } from "../playerIdentity/localPlayerIdentity";

export async function updateRoomStatus(
  code: string,
  status: RoomStatus,
  options: { selectedPackId?: string | null } = {},
) {
  const client = requireSupabase();
  const patch: Partial<PersistedRoom> = { status };

  if ("selectedPackId" in options) {
    patch.selected_pack_id = options.selectedPackId ?? null;
  }

  const { data: room, error } = await client
    .from("rooms")
    .update(patch)
    .eq("code", code)
    .select("*")
    .single<PersistedRoom>();

  if (error) {
    throw error;
  }

  const players = await getRoomPlayers(room.id);
  const identity = getLocalPlayerIdentity();

  return mapPersistedRoomToRoomState({ room, players }, identity?.id ?? null);
}
