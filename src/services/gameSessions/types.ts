export type GameSessionStatus = "ACTIVE" | "FINISHED";

export interface PersistedGameSession {
  id: string;
  room_id: string;
  current_round: number;
  total_rounds: number;
  status: GameSessionStatus;
  scenario_order: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PersistedGameScore {
  id: string;
  session_id: string | null;
  room_id: string;
  player_id: string;
  score: number;
  updated_at: string;
}
