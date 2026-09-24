export interface PersistedRoundResponse {
  id: string;
  session_id: string | null;
  room_id: string;
  round_number: number;
  player_id: string;
  selected_response_id: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}
