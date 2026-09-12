import { DangerButton, PrimaryButton } from "../../components/game/Buttons";
import { ResponseCard } from "../../components/game/ResponseCard";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import { TwistPanel } from "../../components/game/TwistPanel";
import type { DemoState } from "../../game/demo/m01Demo";
import { getActiveTwist, getPlayerName, getSelectedResponse } from "../../game/demo/m01Demo";

export function StandAloneVerdictScreen({
  state,
  onVerdict,
}: {
  state: DemoState;
  onVerdict: (survived: boolean) => void;
}) {
  const playerId = state.round.standAlonePlayerId ?? state.viewerId;

  return (
    <>
      <SectionHeadline eyebrow="Judge verdict" title="Did they survive?" copy={getPlayerName(state, playerId)} />
      <ResponseCard card={getSelectedResponse(state, playerId)} selected locked />
      <TwistPanel text={getActiveTwist(state).text} />
      <div className="action-row stacked">
        <PrimaryButton onClick={() => onVerdict(true)}>Survived</PrimaryButton>
        <DangerButton onClick={() => onVerdict(false)}>Caught</DangerButton>
      </div>
    </>
  );
}
