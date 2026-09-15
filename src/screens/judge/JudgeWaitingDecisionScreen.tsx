import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName } from "../../game/demo/m01Demo";

export function JudgeWaitingDecisionScreen({ state }: { state: DemoState }) {
  const rows = Object.values(state.round.playerStates);
  const ready = rows.filter((row) => row.decision).length;

  return (
    <div className="judge-waiting-decisions-state">
      <header className="judge-waiting-decisions-header">
        <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
        <span>You're <strong>the Judge</strong></span>
      </header>

      <section className="judge-waiting-decisions-copy" aria-labelledby="judge-waiting-decisions-title">
        <h1 id="judge-waiting-decisions-title">
          The table is <span>deciding <span aria-hidden="true">👀</span></span>
        </h1>
        <span className="red-rule" aria-hidden="true" />
        <p>They've defended their choices.</p>
        <p>Now they're deciding whether to stand on them.</p>
      </section>

      <div className="judge-decision-status-list" aria-label={`${ready} of ${rows.length} decisions ready`}>
        {rows.map((row) => (
          <div
            className={`judge-decision-status-row${row.decision ? " is-locked" : " is-thinking"}`}
            key={row.playerId}
          >
            <span className="judge-decision-player">{getPlayerName(state, row.playerId)}</span>
            <span className="judge-decision-pill">
              {row.decision ? (
                <span className="judge-decision-check" aria-hidden="true">✓</span>
              ) : (
                <span className="judge-decision-spinner" aria-hidden="true" />
              )}
              <strong>{row.decision ? "Locked" : "Thinking..."}</strong>
            </span>
          </div>
        ))}
      </div>

      <p className="judge-decision-ready-count">
        <strong>{ready}</strong> / {rows.length} Ready
      </p>

      <div className="judge-decision-waiting-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="judge-decision-waiting-label">Waiting for decisions...</p>
    </div>
  );
}
