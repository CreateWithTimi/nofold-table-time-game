import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName, getSelectedResponse } from "../../game/demo/m01Demo";

export function JudgeWatchingDefenseScreen({ state, remainingSeconds }: { state: DemoState; remainingSeconds: number }) {
  const defenderId = state.round.defenseOrder[state.round.currentDefenderIndex] ?? state.round.defenseOrder[0];
  const defenderName = getPlayerName(state, defenderId);
  const response = getSelectedResponse(state, defenderId);

  return (
    <div className="judge-watching-defense-state">
      <header className="judge-watching-defense-header">
        <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
        <span>You're <strong>the Judge</strong></span>
      </header>

      <section className="judge-watching-defense-copy" aria-labelledby="judge-watching-defense-title">
        <h1 id="judge-watching-defense-title">
          {defenderName} is <span>defending</span>
        </h1>
        <span className="red-rule" aria-hidden="true" />
        <p>Listen carefully. You'll decide who sold it best.</p>
      </section>

      <article className="judge-watching-defense-card" aria-label={`${defenderName}'s locked response: ${response.text}`}>
        <span className="judge-watching-defense-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <section className="judge-watching-defense-timer">
        <p>You have 20 seconds.</p>
        <strong role="timer" aria-live="polite">{formatClock(remainingSeconds)}</strong>
      </section>

      <p className="judge-watching-defense-reminder">Judge the performance, not the morality.</p>
      <p className="judge-watching-defense-label">Watching {defenderName}...</p>
      <div className="judge-watching-defense-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function formatClock(seconds: number) {
  return `00:${String(seconds).padStart(2, "0")}`;
}
