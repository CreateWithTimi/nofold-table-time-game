export type RoomStatus = "LOBBY" | "PACK_SELECTION" | "GAME_READY" | "JUDGE_SELECTION" | "IN_GAME" | "FINISHED";

export interface RoomPlayer {
  id: string;
  localPlayerId?: string;
  name: string;
  isHost: boolean;
}

export interface RoomState {
  persistedRoomId?: string;
  code: string;
  hostPlayerId: string;
  players: RoomPlayer[];
  selectedPackId: string | null;
  status: RoomStatus;
  currentViewerId: string;
  roundNumber: number;
  judgeId: string | null;
}
