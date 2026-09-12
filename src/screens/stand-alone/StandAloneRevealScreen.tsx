import { PrimaryButton } from "../../components/game/Buttons";
import { ResponseCard } from "../../components/game/ResponseCard";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import { TwistPanel } from "../../components/game/TwistPanel";
import type { DemoState } from "../../game/demo/m01Demo";
import { getActiveTwist, getSelectedResponse } from "../../game/demo/m01Demo";

export function StandAloneRevealScreen({ state, onFaceTwist }: { state: DemoState; onFaceTwist: () => void }) {
  const playerId = state.round.standAlonePlayerId ?? state.viewerId;

  return (
    <>
      <SectionHeadline eyebrow="One caller" title="Stand Alone" copy="The table folded. You face the twist alone." />
      <ResponseCard card={getSelectedResponse(state, playerId)} selected locked />
      <TwistPanel text={getActiveTwist(state).text} />
      <PrimaryButton onClick={onFaceTwist}>Face the Twist</PrimaryButton>
    </>
  );
}
