import { GameHeader } from "../../components/game/GameHeader";
import { PrimaryButton } from "../../components/game/Buttons";
import { ResponseHand } from "../../components/game/ResponseHand";
import { ScenarioPanel } from "../../components/game/ScenarioPanel";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName, getViewerPlayer, getViewerRoundState } from "../../game/demo/m01Demo";

interface ResponseSelectionScreenProps {
  state: DemoState;
  onSelectResponse: (responseId: string) => void;
  onLockResponse: () => void;
}

export function ResponseSelectionScreen({
  state,
  onSelectResponse,
  onLockResponse,
}: ResponseSelectionScreenProps) {
  const viewer = getViewerPlayer(state);
  const playerRound = getViewerRoundState(state);

  return (
    <>
      <GameHeader
        roundNumber={state.round.roundNumber}
        judgeName={getPlayerName(state, state.round.judgeId)}
        score={viewer.score}
      />
      <SectionHeadline
        eyebrow="Choose your defense"
        title="Pick a card"
        copy="This is private until everyone locks."
      />
      <ScenarioPanel text={state.scenario.text} />
      <ResponseHand
        cards={playerRound.hand}
        selectedResponseId={playerRound.selectedResponseId}
        locked={playerRound.responseLocked}
        onSelect={onSelectResponse}
      />
      <PrimaryButton disabled={!playerRound.selectedResponseId} onClick={onLockResponse}>
        Lock Response
      </PrimaryButton>
    </>
  );
}
