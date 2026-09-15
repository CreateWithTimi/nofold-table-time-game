import { GameHeader } from "../../components/game/GameHeader";
import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName, getSelectedResponse, getViewerPlayer } from "../../game/demo/m01Demo";

interface CallFoldScreenProps {
  state: DemoState;
  onDecision: (decision: "CALL" | "FOLD") => void;
}

export function CallFoldScreen({ state, onDecision }: CallFoldScreenProps) {
  const response = getSelectedResponse(state, state.viewerId);
  const judgeName = getPlayerName(state, state.round.judgeId);
  const score = getViewerPlayer(state).score;

  return (
    <div className="call-fold-state">
      <GameHeader roundNumber={state.round.roundNumber} judgeName={judgeName} score={score} />

      <section className="call-fold-copy" aria-labelledby="call-fold-title">
        <h1 id="call-fold-title">Still standing on it?</h1>
        <p>You've heard the table. Make your call.</p>
        <span className="red-rule" aria-hidden="true" />
      </section>

      <article className="call-fold-response-card" aria-label={`Selected response: ${response.text}`}>
        <span className="call-fold-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <div className="call-fold-actions">
        <button className="call-fold-action call" type="button" onClick={() => onDecision("CALL")}>
          <strong>Call <span aria-hidden="true">🔥</span></strong>
          <span>Stand on it</span>
          <em>+2 if you win <b aria-hidden="true">•</b> -2 if you lose</em>
        </button>

        <button className="call-fold-action fold" type="button" onClick={() => onDecision("FOLD")}>
          <strong>Fold <span aria-hidden="true">👀</span></strong>
          <span>Get out now</span>
          <em>-1</em>
        </button>
      </div>
    </div>
  );
}
