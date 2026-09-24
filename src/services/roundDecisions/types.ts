import type { PlayerDecision } from "../../game/types/game";

export interface PersistedRoundDecision {
  id: string;
  session_id: string | null;
  room_id: string;
  round_number: number;
  player_id: string;
  decision: PlayerDecision;
  locked_at: string;
  created_at: string;
  updated_at: string;
}
