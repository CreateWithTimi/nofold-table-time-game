import { DangerButton, PrimaryButton } from "../../components/game/Buttons";
import { ResponseCard } from "../../components/game/ResponseCard";
import { ScenarioPanel } from "../../components/game/ScenarioPanel";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName, getSelectedResponse } from "../../game/demo/m01Demo";

export function NoEscapeVerdictScreen({
  state,
  onVerdict,
}: {
  state: DemoState;
  onVerdict: (survived: boolean) => void;
}) {
  const playerId = state.round.noEscapePlayerId ?? state.viewerId;

  return (
    <>
      <SectionHeadline eyebrow="Judge verdict" title="Did they survive?" copy={getPlayerName(state, playerId)} />
      <ScenarioPanel text={state.noEscapeScenario.text} />
      <ResponseCard card={getSelectedResponse(state, playerId)} selected locked />
      <div className="action-row stacked">
        <PrimaryButton onClick={() => onVerdict(true)}>Survived</PrimaryButton>
        <DangerButton onClick={() => onVerdict(false)}>Caught</DangerButton>
      </div>
    </>
  );
}
