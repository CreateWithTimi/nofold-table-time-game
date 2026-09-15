import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName } from "../../game/demo/m01Demo";

export function JudgeCowardRoundScreen({ state }: { state: DemoState }) {
  const activePlayerIds = Object.keys(state.round.playerStates);
  const activeNames = activePlayerIds.map((playerId) => getPlayerName(state, playerId)).join(", ");

  return (
    <div className="judge-coward-round-state" aria-live="polite">
      <header className="judge-coward-round-header">
        <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
        <span>You're <strong>the Judge</strong></span>
      </header>

      <section className="judge-coward-round-copy" aria-labelledby="judge-coward-round-title">
        <h1 id="judge-coward-round-title">
          Coward Round <span aria-hidden="true">😭</span>
        </h1>
        <span className="red-rule" aria-hidden="true" />
        <p>Everybody folded.</p>
        <p className="judge-coward-round-subcopy">The table remembers.</p>
      </section>

      <section className="judge-coward-penalty" aria-label={`${activeNames} took minus two points`}>
        <strong>-2 Each</strong>
        <p>{activeNames} took the hit.</p>
      </section>

      <section className="judge-coward-no-escape" aria-labelledby="judge-coward-no-escape-title">
        <h2 id="judge-coward-no-escape-title">No Escape</h2>
        <strong>One player will be chosen to face the table.</strong>
        <p>No CALL. No FOLD. Just survive it.</p>
      </section>

      <div className="judge-coward-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="judge-coward-label">Waiting for No Escape...</p>
    </div>
  );
}
