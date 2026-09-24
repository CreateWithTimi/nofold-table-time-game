import type { RoomPlayer, RoomState, RoomStatus } from "../../room/types";

export type PersistedRoomStatus = RoomStatus;

export interface PersistedRoom {
  id: string;
  code: string;
  host_player_id: string | null;
  status: PersistedRoomStatus;
  selected_pack_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersistedRoomPlayer {
  id: string;
  room_id: string;
  local_player_id: string;
  display_name: string;
  is_host: boolean;
  joined_at: string;
  last_seen_at: string;
}

export interface RoomWithPlayers {
  room: PersistedRoom;
  players: PersistedRoomPlayer[];
}

export function mapPersistedRoomToRoomState(
  { room, players }: RoomWithPlayers,
  localPlayerId: string | null,
): RoomState {
  const mappedPlayers: RoomPlayer[] = players.map((player) => ({
    id: player.id,
    localPlayerId: player.local_player_id,
    name: player.display_name,
    isHost: player.id === room.host_player_id,
  }));
  const currentViewer = mappedPlayers.find((player) => player.localPlayerId === localPlayerId);
  const host = mappedPlayers.find((player) => player.id === room.host_player_id);

  return {
    persistedRoomId: room.id,
    code: room.code,
    hostPlayerId: host?.id ?? room.host_player_id ?? "",
    players: mappedPlayers,
    selectedPackId: room.selected_pack_id,
    status: room.status,
    currentViewerId: currentViewer?.id ?? "",
    roundNumber: 1,
    judgeId: mappedPlayers.find((player) => !player.isHost)?.id ?? mappedPlayers[0]?.id ?? null,
  };
}
