import type { GamePhase } from "../../game/constants/phases";
import type { DemoFlow } from "../../game/demo/m01Demo";

export interface PersistedGameRound {
  id: string;
  session_id: string | null;
  room_id: string;
  round_number: number;
  judge_player_id: string;
  phase: GamePhase;
  flow: DemoFlow | null;
  scenario_id: string | null;
  defense_order: string[];
  caller_ids: string[] | null;
  current_defender_index: number;
  defense_started_at: string | null;
  stand_alone_player_id: string | null;
  stand_alone_twist_id: string | null;
  stand_alone_defense_started_at: string | null;
  no_escape_player_id: string | null;
  no_escape_scenario_id: string | null;
  no_escape_response_id: string | null;
  no_escape_defense_started_at: string | null;
  verdict: "SURVIVED" | "CAUGHT" | null;
  verdict_player_id: string | null;
  winning_player_id: string | null;
  scores_applied_at: string | null;
  created_at: string;
  updated_at: string;
}
