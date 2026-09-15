import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName, getSelectedResponse } from "../../game/demo/m01Demo";

export function NoEscapeJudgeDefenseScreen({
  state,
  remainingSeconds,
}: {
  state: DemoState;
  remainingSeconds: number;
}) {
  const playerId = state.round.noEscapePlayerId ?? state.viewerId;
  const playerName = getPlayerName(state, playerId);
  const response = getSelectedResponse(state, playerId);

  return (
    <div className="no-escape-judge-defense-state" aria-live="polite">
      <header className="no-escape-judge-defense-header">
        <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
        <span>You're <strong>the Judge</strong></span>
      </header>

      <section className="no-escape-judge-defense-copy" aria-labelledby="no-escape-judge-defense-title">
        <h1 id="no-escape-judge-defense-title">
          {playerName} is <span>facing the table</span>
        </h1>
        <span className="red-rule" aria-hidden="true" />
        <p>Listen carefully. This is No Escape.</p>
      </section>

      <section className="no-escape-judge-scenario-panel" aria-label={`Scenario: ${state.noEscapeScenario.text}`}>
        <span>Scenario</span>
        <strong>{state.noEscapeScenario.text}</strong>
      </section>

      <article className="no-escape-judge-defense-card" aria-label={`${playerName}'s forced response: ${response.text}`}>
        <span className="no-escape-judge-defense-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <section className="no-escape-judge-defense-timer">
        <p>You have 15 seconds.</p>
        <strong role="timer" aria-live="polite">{formatClock(remainingSeconds)}</strong>
      </section>

      <p className="no-escape-judge-defense-reminder">Judge the performance, not the morality.</p>

      <div className="no-escape-judge-defense-live-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="no-escape-judge-defense-live-label">Watching {playerName}...</p>
    </div>
  );
}

function formatClock(seconds: number) {
  return `00:${String(seconds).padStart(2, "0")}`;
}
