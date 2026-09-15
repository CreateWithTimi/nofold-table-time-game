import { GameHeader } from "../../components/game/GameHeader";
import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName, getSelectedResponse, getViewerPlayer } from "../../game/demo/m01Demo";
import { useCountdown } from "../../hooks/useCountdown";

export function NoEscapeDefenseScreen({
  state,
  remainingSeconds,
  onComplete,
}: {
  state: DemoState;
  remainingSeconds?: number;
  onComplete: () => void;
}) {
  const playerId = state.round.noEscapePlayerId ?? state.viewerId;
  const playerName = getPlayerName(state, playerId);
  const judgeName = getPlayerName(state, state.round.judgeId);
  const score = getViewerPlayer(state).score;
  const response = getSelectedResponse(state, playerId);
  const localRemaining = useCountdown(15, remainingSeconds === undefined, onComplete);
  const remaining = remainingSeconds ?? localRemaining;

  return (
    <div className="no-escape-defense-state">
      <GameHeader roundNumber={state.round.roundNumber} judgeName={judgeName} score={score} />

      <section className="no-escape-defense-copy" aria-labelledby="no-escape-defense-title">
        <h1 id="no-escape-defense-title">No Escape</h1>
        <span className="red-rule" aria-hidden="true" />
        <strong>{playerName}, you're up.</strong>
        <p>The table chose you. No CALL. No FOLD. Just survive it.</p>
      </section>

      <section className="no-escape-scenario-panel" aria-label={`Scenario: ${state.noEscapeScenario.text}`}>
        <span>Scenario</span>
        <strong>{state.noEscapeScenario.text}</strong>
      </section>

      <article className="no-escape-response-card" aria-label={`Forced response: ${response.text}`}>
        <span className="no-escape-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <section className="no-escape-defense-prompt">
        <h2>Defend it.</h2>
        <p>No CALL. No FOLD. Just talk your way out.</p>
      </section>

      <section className="no-escape-timer-area">
        <div className="no-escape-timer" role="timer" aria-live="polite">
          {formatClock(remaining)}
        </div>
        <p>Speak now.</p>
      </section>

      <div className="no-escape-live-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="no-escape-live-label">No Escape Live...</p>
    </div>
  );
}

function formatClock(seconds: number) {
  return `00:${String(seconds).padStart(2, "0")}`;
}
