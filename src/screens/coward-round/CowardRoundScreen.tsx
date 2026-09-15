import { PrimaryButton } from "../../components/game/Buttons";
import { GameHeader } from "../../components/game/GameHeader";
import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName, getViewerPlayer } from "../../game/demo/m01Demo";

export function CowardRoundScreen({ state, onStartNoEscape }: { state: DemoState; onStartNoEscape: () => void }) {
  const judgeName = getPlayerName(state, state.round.judgeId);
  const score = getViewerPlayer(state).score;

  return (
    <div className="coward-round-state">
      <GameHeader roundNumber={state.round.roundNumber} judgeName={judgeName} score={score} />

      <section className="coward-round-copy" aria-labelledby="coward-round-title">
        <h1 id="coward-round-title">Coward Round <span aria-hidden="true">😭</span></h1>
        <span className="red-rule" aria-hidden="true" />
        <p>Everybody folded. Now everybody pays.</p>
        <p className="coward-round-subcopy">All active players take -2.</p>
      </section>

      <section className="coward-no-escape-panel" aria-labelledby="coward-no-escape-title">
        <h2 id="coward-no-escape-title">No Escape</h2>
        <strong>One player will be chosen to face the table.</strong>
        <p>No CALL. No FOLD. Just survive it.</p>
      </section>

      <section className="coward-penalty" aria-label="Score penalty">
        <strong>-2 Each</strong>
        <p>You all folded. The table remembered.</p>
      </section>

      <section className="coward-suspense" aria-label="Choosing who can't escape">
        <div className="coward-suspense-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p>Choosing who can't escape...</p>
      </section>

      <PrimaryButton onClick={onStartNoEscape}>Start No Escape →</PrimaryButton>
    </div>
  );
}
