import { PrimaryButton } from "../../components/game/Buttons";
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
    <div className="judge-pick-state">
      <div className="judge-pick-inner">
        <header className="judge-pick-header">
          <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
          <span>You're <strong>the Judge</strong></span>
        </header>

        <section className="judge-pick-copy" aria-labelledby="judge-pick-title">
          <h1 id="judge-pick-title">Who survived?</h1>
          <span className="red-rule" aria-hidden="true" />
          <p>Pick the defense that sold you most.</p>
          <p className="judge-pick-subcopy">Judge the performance, not the morality.</p>
        </section>

        <div className={`judge-pick-options has-${Math.min(callers.length, 3)}-callers`}>
          {callers.map((playerId) => {
            const selected = state.selectedJudgeWinnerId === playerId;
            const playerName = getPlayerName(state, playerId);
            const response = getSelectedResponse(state, playerId);

            return (
              <button
                key={playerId}
                className={`judge-pick-option${selected ? " is-selected" : ""}`}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectWinner(playerId)}
              >
                <span className="judge-pick-player">{playerName}</span>
                <span className="judge-pick-card">
                  <span className="judge-pick-called">Called <span aria-hidden="true">🔥</span></span>
                  <strong>{response.text}</strong>
                  <span className="judge-pick-check" aria-hidden="true">{selected ? "✓" : ""}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="judge-pick-tension">The table is waiting <span aria-hidden="true">👀</span></p>

        <PrimaryButton disabled={!state.selectedJudgeWinnerId} onClick={onLockWinner}>
          Lock Winner →
        </PrimaryButton>
      </div>
    </div>
  );
}
