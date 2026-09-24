import { requireSupabase } from "../../lib/supabase";
import { getOrCreateLocalPlayerIdentity } from "../playerIdentity/localPlayerIdentity";
import { generateRoomCode } from "./roomCode";
import { mapPersistedRoomToRoomState, type PersistedRoom, type PersistedRoomPlayer } from "./types";

const MAX_CODE_ATTEMPTS = 8;

export async function createRoom(nickname: string) {
  const client = requireSupabase();
  const identity = getOrCreateLocalPlayerIdentity(nickname);
  const displayName = identity.name ?? "Player";

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateRoomCode();
    const { data: room, error: roomError } = await client
      .from("rooms")
      .insert({ code, status: "LOBBY", selected_pack_id: null })
      .select("*")
      .single<PersistedRoom>();

    if (roomError) {
      if (roomError.code === "23505") {
        continue;
      }

      throw roomError;
    }

    const { data: hostPlayer, error: playerError } = await client
      .from("room_players")
      .insert({
        room_id: room.id,
        local_player_id: identity.id,
        display_name: displayName,
        is_host: true,
      })
      .select("*")
      .single<PersistedRoomPlayer>();

    if (playerError) {
      throw playerError;
    }

    const { data: updatedRoom, error: updateError } = await client
      .from("rooms")
      .update({ host_player_id: hostPlayer.id })
      .eq("id", room.id)
      .select("*")
      .single<PersistedRoom>();

    if (updateError) {
      throw updateError;
    }

    return mapPersistedRoomToRoomState({ room: updatedRoom, players: [hostPlayer] }, identity.id);
  }

  throw new Error("Could not create a unique room code. Please try again.");
}
