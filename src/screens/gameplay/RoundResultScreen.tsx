import { PrimaryButton } from "../../components/game/Buttons";
import { ResultScore } from "../../components/game/ResultScore";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import type { DemoFlow, DemoState } from "../../game/demo/m01Demo";
import { getViewerPlayer } from "../../game/demo/m01Demo";

interface RoundResultScreenProps {
  state: DemoState;
  onReset: (flow: DemoFlow) => void;
}

export function RoundResultScreen({ state, onReset }: RoundResultScreenProps) {
  const viewer = getViewerPlayer(state);
  const result = state.resultByPlayerId[state.viewerId] ?? {
    title: "JUDGE ROUND",
    delta: 0,
    copy: "You judged the table and stayed out of scoring.",
  };

  return (
    <>
      <SectionHeadline eyebrow="Round result" title="The table has spoken" copy={`${viewer.name}: ${viewer.score} pts`} />
      <ResultScore title={result.title} delta={result.delta} copy={result.copy} />
      <PrimaryButton onClick={() => onReset(state.flow)}>Next Round</PrimaryButton>
    </>
  );
}
