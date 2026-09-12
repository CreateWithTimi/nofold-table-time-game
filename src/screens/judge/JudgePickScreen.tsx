import { PrimaryButton } from "../../components/game/Buttons";
import { JudgeOptionCard } from "../../components/game/JudgeOptionCard";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import type { DemoState } from "../../game/demo/m01Demo";
import { getCallers, getPlayerName, getSelectedResponse } from "../../game/demo/m01Demo";

interface JudgePickScreenProps {
  state: DemoState;
  onSelectWinner: (playerId: string) => void;
  onLockWinner: () => void;
}

export function JudgePickScreen({ state, onSelectWinner, onLockWinner }: JudgePickScreenProps) {
  const callers = getCallers(state);

  return (
    <>
      <SectionHeadline eyebrow="Judge pick" title="Who survived?" copy="Pick one caller whose defense held up." />
      <div className="judge-options">
        {callers.map((playerId) => (
          <JudgeOptionCard
            key={playerId}
            playerName={getPlayerName(state, playerId)}
            card={getSelectedResponse(state, playerId)}
            selected={state.selectedJudgeWinnerId === playerId}
            onSelect={() => onSelectWinner(playerId)}
          />
        ))}
      </div>
      <PrimaryButton disabled={!state.selectedJudgeWinnerId} onClick={onLockWinner}>
        Lock Winner
      </PrimaryButton>
    </>
  );
}
