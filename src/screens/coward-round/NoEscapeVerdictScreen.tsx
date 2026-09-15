import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName, getSelectedResponse } from "../../game/demo/m01Demo";

export function NoEscapeVerdictScreen({
  state,
  onVerdict,
}: {
  state: DemoState;
  onVerdict: (survived: boolean) => void;
}) {
  const playerId = state.round.noEscapePlayerId ?? state.viewerId;
  const playerName = getPlayerName(state, playerId);
  const response = getSelectedResponse(state, playerId);

  return (
    <div className="no-escape-verdict-state">
      <header className="no-escape-verdict-header">
        <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
        <span>You're <strong>the Judge</strong></span>
      </header>

      <section className="no-escape-verdict-copy" aria-labelledby="no-escape-verdict-title">
        <h1 id="no-escape-verdict-title">Did they <span>survive?</span></h1>
        <span className="red-rule" aria-hidden="true" />
        <p>{playerName} faced the table. One final call.</p>
        <p className="no-escape-verdict-subcopy">Judge the performance, not the morality.</p>
      </section>

      <section className="no-escape-verdict-scenario" aria-label={`Scenario: ${state.noEscapeScenario.text}`}>
        <span>Scenario</span>
        <strong>{state.noEscapeScenario.text}</strong>
      </section>

      <article className="no-escape-verdict-card" aria-label={`Forced response: ${response.text}`}>
        <span className="no-escape-verdict-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <p className="no-escape-verdict-tension">The table is waiting <span aria-hidden="true">👀</span></p>

      <div className="no-escape-verdict-actions">
        <button className="no-escape-verdict-action survived" type="button" onClick={() => onVerdict(true)}>
          <strong>Survived <span aria-hidden="true">🔥</span></strong>
          <span>They sold it.</span>
        </button>

        <button className="no-escape-verdict-action caught" type="button" onClick={() => onVerdict(false)}>
          <strong>Caught <span aria-hidden="true">😭</span></strong>
          <span>The bluff collapsed.</span>
        </button>
      </div>
    </div>
  );
}
