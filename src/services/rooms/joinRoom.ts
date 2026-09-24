import { requireSupabase } from "../../lib/supabase";
import { getOrCreateLocalPlayerIdentity } from "../playerIdentity/localPlayerIdentity";
import { normalizeRoomCode } from "./roomCode";
import { getRoomPlayers } from "./getRoomPlayers";
import { mapPersistedRoomToRoomState, type PersistedRoom, type PersistedRoomPlayer } from "./types";

const MAX_PLAYERS = 6;

export async function joinRoom(code: string, nickname: string) {
  const client = requireSupabase();
  const identity = getOrCreateLocalPlayerIdentity(nickname);
  const displayName = identity.name ?? "Player";
  const normalizedCode = normalizeRoomCode(code);

  const { data: room, error: roomError } = await client
    .from("rooms")
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle<PersistedRoom>();

  if (roomError) {
    throw roomError;
  }

  if (!room) {
    return null;
  }

  const currentPlayers = await getRoomPlayers(room.id);
  const existingPlayer = currentPlayers.find((player) => player.local_player_id === identity.id);

  if (existingPlayer) {
    const { error: updateError } = await client
      .from("room_players")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", existingPlayer.id)
      .select("id")
      .single();

    if (updateError) {
      throw updateError;
    }

    return mapPersistedRoomToRoomState({ room, players: await getRoomPlayers(room.id) }, identity.id);
  }

  if (currentPlayers.length >= MAX_PLAYERS) {
    throw new Error("This table is full.");
  }

  const { data: newPlayer, error: playerError } = await client
    .from("room_players")
    .insert({
      room_id: room.id,
      local_player_id: identity.id,
      display_name: displayName,
      is_host: false,
    })
    .select("*")
    .single<PersistedRoomPlayer>();

  if (playerError) {
    if (playerError.code === "23505") {
      return joinRoom(code, nickname);
    }

    throw playerError;
  }

  return mapPersistedRoomToRoomState({ room, players: await getRoomPlayers(room.id) }, identity.id);
}
