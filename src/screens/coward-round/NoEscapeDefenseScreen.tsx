import { ScenarioPanel } from "../../components/game/ScenarioPanel";
import type { DemoState } from "../../game/demo/m01Demo";
import { getSelectedResponse } from "../../game/demo/m01Demo";
import { DefenseScreen } from "../gameplay/DefenseScreen";

export function NoEscapeDefenseScreen({ state, onComplete }: { state: DemoState; onComplete: () => void }) {
  const playerId = state.round.noEscapePlayerId ?? state.viewerId;

  return (
    <DefenseScreen
      response={getSelectedResponse(state, playerId)}
      seconds={15}
      title="No Escape"
      copy="No CALL. No FOLD. Just defend the forced card."
      liveLabel="No Escape live"
      onComplete={onComplete}
    >
      <ScenarioPanel text={state.noEscapeScenario.text} />
    </DefenseScreen>
  );
}
