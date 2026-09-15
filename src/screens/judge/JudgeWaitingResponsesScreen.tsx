import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName } from "../../game/demo/m01Demo";

export function JudgeWaitingResponsesScreen({ state }: { state: DemoState }) {
  const rows = Object.values(state.round.playerStates);
  const ready = rows.filter((row) => row.responseLocked).length;

  return (
    <div className="judge-waiting-responses-state">
      <header className="judge-waiting-responses-header">
        <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
        <span>You're <strong>the Judge</strong></span>
      </header>

      <section className="judge-waiting-responses-copy" aria-labelledby="judge-waiting-responses-title">
        <h1 id="judge-waiting-responses-title">
          They're <span>choosing <span aria-hidden="true">👀</span></span>
        </h1>
        <span className="red-rule" aria-hidden="true" />
        <p>Responses are private until everyone locks in.</p>
      </section>

      <div className="judge-response-status-list" aria-label={`${ready} of ${rows.length} responses ready`}>
        {rows.map((row) => (
          <div
            className={`judge-response-status-row${row.responseLocked ? " is-locked" : " is-choosing"}`}
            key={row.playerId}
          >
            <span className="judge-response-player">{getPlayerName(state, row.playerId)}</span>
            <span className="judge-response-pill">
              {row.responseLocked ? (
                <span className="judge-response-check" aria-hidden="true">✓</span>
              ) : (
                <span className="judge-response-spinner" aria-hidden="true" />
              )}
              <strong>{row.responseLocked ? "Locked" : "Choosing"}</strong>
            </span>
          </div>
        ))}
      </div>

      <p className="judge-response-ready-count">
        <strong>{ready}</strong> / {rows.length} Ready
      </p>

      <div className="judge-response-waiting-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="judge-response-waiting-label">Waiting for responses...</p>
    </div>
  );
}
