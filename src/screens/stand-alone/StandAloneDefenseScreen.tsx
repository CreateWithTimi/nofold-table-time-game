import { TwistPanel } from "../../components/game/TwistPanel";
import type { DemoState } from "../../game/demo/m01Demo";
import { getActiveTwist, getSelectedResponse } from "../../game/demo/m01Demo";
import { DefenseScreen } from "../gameplay/DefenseScreen";

export function StandAloneDefenseScreen({ state, onComplete }: { state: DemoState; onComplete: () => void }) {
  const playerId = state.round.standAlonePlayerId ?? state.viewerId;

  return (
    <DefenseScreen
      response={getSelectedResponse(state, playerId)}
      seconds={15}
      title="Second defense"
      copy="The twist is live. Make it survive."
      liveLabel="Second defense live"
      onComplete={onComplete}
    >
      <TwistPanel text={getActiveTwist(state).text} />
    </DefenseScreen>
  );
}
