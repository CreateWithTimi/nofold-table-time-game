import type { DemoState } from "../../game/demo/m01Demo";
import { getActiveTwist, getPlayerName, getSelectedResponse } from "../../game/demo/m01Demo";

export function StandAloneVerdictScreen({
  state,
  onVerdict,
}: {
  state: DemoState;
  onVerdict: (survived: boolean) => void;
}) {
  const playerId = state.round.standAlonePlayerId ?? state.viewerId;
  const playerName = getPlayerName(state, playerId);
  const response = getSelectedResponse(state, playerId);
  const twist = getActiveTwist(state);

  return (
    <div className="stand-alone-verdict-state">
      <header className="stand-alone-verdict-header">
        <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
        <span>You're <strong>the Judge</strong></span>
      </header>

      <section className="stand-alone-verdict-copy" aria-labelledby="stand-alone-verdict-title">
        <h1 id="stand-alone-verdict-title">Did they <span>survive?</span></h1>
        <span className="red-rule" aria-hidden="true" />
        <p>{playerName} stood alone. One last call.</p>
        <p className="stand-alone-verdict-subcopy">Judge the performance, not the morality.</p>
      </section>

      <article className="stand-alone-verdict-card" aria-label={`Selected response: ${response.text}`}>
        <span className="stand-alone-verdict-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <section className="stand-alone-verdict-twist" aria-label={`Twist: ${twist.text}`}>
        <span>Twist <span aria-hidden="true">👀</span></span>
        <strong>{twist.text}</strong>
      </section>

      <p className="stand-alone-verdict-tension">The table is waiting <span aria-hidden="true">👀</span></p>

      <div className="stand-alone-verdict-actions">
        <button className="stand-alone-verdict-action survived" type="button" onClick={() => onVerdict(true)}>
          <strong>Survived <span aria-hidden="true">🔥</span></strong>
          <span>They sold it.</span>
        </button>

        <button className="stand-alone-verdict-action caught" type="button" onClick={() => onVerdict(false)}>
          <strong>Caught <span aria-hidden="true">😭</span></strong>
          <span>The bluff collapsed.</span>
        </button>
      </div>
    </div>
  );
}
