import type { DemoState } from "../../game/demo/m01Demo";
import { getActiveTwist, getPlayerName, getSelectedResponse } from "../../game/demo/m01Demo";

export function StandAloneJudgeDefenseScreen({
  state,
  remainingSeconds,
}: {
  state: DemoState;
  remainingSeconds: number;
}) {
  const playerId = state.round.standAlonePlayerId ?? state.viewerId;
  const playerName = getPlayerName(state, playerId);
  const response = getSelectedResponse(state, playerId);
  const twist = getActiveTwist(state);

  return (
    <div className="stand-alone-judge-defense-state">
      <header className="stand-alone-judge-defense-header">
        <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
        <span>You're <strong>the Judge</strong></span>
      </header>

      <section className="stand-alone-judge-defense-copy" aria-labelledby="stand-alone-judge-defense-title">
        <h1 id="stand-alone-judge-defense-title">
          {playerName} is <span>defending again</span>
        </h1>
        <span className="red-rule" aria-hidden="true" />
        <p>Listen carefully. This is the final defense.</p>
      </section>

      <article className="stand-alone-judge-defense-card" aria-label={`${playerName}'s selected response: ${response.text}`}>
        <span className="stand-alone-judge-defense-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <section className="stand-alone-judge-defense-twist" aria-label={`Twist: ${twist.text}`}>
        <span>Twist <span aria-hidden="true">👀</span></span>
        <strong>{twist.text}</strong>
      </section>

      <section className="stand-alone-judge-defense-timer">
        <p>You have 15 seconds.</p>
        <strong role="timer" aria-live="polite">{formatClock(remainingSeconds)}</strong>
      </section>

      <p className="stand-alone-judge-defense-reminder">Judge the performance, not the morality.</p>

      <div className="stand-alone-judge-defense-live-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="stand-alone-judge-defense-live-label">Second Defense Live...</p>
    </div>
  );
}

function formatClock(seconds: number) {
  return `00:${String(seconds).padStart(2, "0")}`;
}
