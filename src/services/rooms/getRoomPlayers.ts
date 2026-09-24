import { requireSupabase } from "../../lib/supabase";
import type { PersistedRoomPlayer } from "./types";

export async function getRoomPlayers(roomId: string): Promise<PersistedRoomPlayer[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}
