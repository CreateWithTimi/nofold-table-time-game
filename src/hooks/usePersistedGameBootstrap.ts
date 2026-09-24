import { tableTroublePack } from "../data/packs/table-trouble";
import { usePersistedRoom } from "./usePersistedRoom";

export function usePersistedGameBootstrap(roomCode?: string) {
  const persistedRoom = usePersistedRoom(roomCode);
  const room = persistedRoom.room;
  const currentPlayer = room?.players.find((player) => player.id === room.currentViewerId) ?? null;
  const currentJudge = room?.players.find((player) => player.id === room.judgeId) ?? null;

  return {
    ...persistedRoom,
    players: room?.players ?? [],
    currentPlayer,
    currentJudge,
    isJudge: Boolean(currentPlayer && currentJudge && currentPlayer.id === currentJudge.id),
    roundNumber: room?.roundNumber ?? 1,
    selectedPack: room?.selectedPackId === tableTroublePack.id || !room?.selectedPackId ? tableTroublePack : null,
  };
}
