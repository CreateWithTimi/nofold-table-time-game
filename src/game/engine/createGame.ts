import { GAME_PHASES } from "../constants/phases";
import type { GameState } from "../types/game";
import type { Player } from "../types/player";

export function createGame(params: {
  id: string;
  roomCode: string;
  players?: Player[];
  maxRounds?: number;
}): GameState {
  return {
    id: params.id,
    roomCode: params.roomCode,
    packId: null,
    players: params.players ?? [],
    currentRound: null,
    phase: GAME_PHASES.LOBBY,
    maxRounds: params.maxRounds ?? 8,
  };
}
