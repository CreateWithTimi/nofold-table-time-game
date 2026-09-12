import { PrimaryButton } from "../../components/game/Buttons";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import { ScenarioPanel } from "../../components/game/ScenarioPanel";
import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName } from "../../game/demo/m01Demo";

export function CowardRoundScreen({ state, onStartNoEscape }: { state: DemoState; onStartNoEscape: () => void }) {
  const playerName = getPlayerName(state, state.round.noEscapePlayerId ?? state.viewerId);

  return (
    <>
      <SectionHeadline
        eyebrow="Everybody folded"
        title="Coward Round"
        copy={`-2 each. ${playerName} is pulled into No Escape.`}
      />
      <ScenarioPanel
        label="No Escape"
        text="Coward Round has already applied the penalty. No Escape adds pressure, not extra point loss."
      />
      <PrimaryButton onClick={onStartNoEscape}>Start No Escape</PrimaryButton>
    </>
  );
}
