export interface PersistedRoundHand {
  id: string;
  session_id: string | null;
  room_id: string;
  round_number: number;
  player_id: string;
  local_player_id: string;
  response_ids: string[];
  created_at: string;
}
