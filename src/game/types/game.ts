import type { GamePhase } from "../constants/phases";
import type { ResponseCard } from "./content";
import type { Player } from "./player";

export type PlayerDecision = "CALL" | "FOLD";

export interface PlayerRoundState {
  playerId: string;
  hand: ResponseCard[];
  selectedResponseId: string | null;
  responseLocked: boolean;
  defenseComplete: boolean;
  decision: PlayerDecision | null;
}

export interface RoundState {
  roundNumber: number;
  judgeId: string;
  scenarioId: string | null;
  phase: GamePhase;
  defenseOrder: string[];
  currentDefenderIndex: number;
  playerStates: Record<string, PlayerRoundState>;
  winningPlayerId: string | null;
  standAlonePlayerId: string | null;
  noEscapePlayerId: string | null;
  activeTwistId: string | null;
}

export interface GameState {
  id: string;
  roomCode: string;
  packId: string | null;
  players: Player[];
  currentRound: RoundState | null;
  phase: GamePhase;
  maxRounds: number;
}
