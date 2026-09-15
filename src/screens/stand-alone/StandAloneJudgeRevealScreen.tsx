import type { DemoState } from "../../game/demo/m01Demo";
import { getActiveTwist, getPlayerName, getSelectedResponse } from "../../game/demo/m01Demo";

export function StandAloneJudgeRevealScreen({ state }: { state: DemoState }) {
  const playerId = state.round.standAlonePlayerId ?? state.viewerId;
  const playerName = getPlayerName(state, playerId);
  const response = getSelectedResponse(state, playerId);
  const twist = getActiveTwist(state);

  return (
    <div className="stand-alone-judge-reveal-state" aria-live="polite">
      <header className="stand-alone-judge-reveal-header">
        <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
        <span>You're <strong>the Judge</strong></span>
      </header>

      <section className="stand-alone-judge-reveal-copy" aria-labelledby="stand-alone-judge-reveal-title">
        <h1 id="stand-alone-judge-reveal-title">Stand Alone <span aria-hidden="true">🔥</span></h1>
        <span className="red-rule" aria-hidden="true" />
        <p>{playerName} is the only one still standing.</p>
        <p className="stand-alone-judge-reveal-subcopy">They have to face the twist.</p>
      </section>

      <article className="stand-alone-judge-reveal-card" aria-label={`${playerName}'s selected response: ${response.text}`}>
        <span className="stand-alone-judge-reveal-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <section className="stand-alone-judge-reveal-twist" aria-label={`Twist: ${twist.text}`}>
        <span>Twist <span aria-hidden="true">👀</span></span>
        <strong>{twist.text}</strong>
      </section>

      <div className="stand-alone-judge-reveal-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="stand-alone-judge-reveal-label">Waiting for {playerName}...</p>
    </div>
  );
}
