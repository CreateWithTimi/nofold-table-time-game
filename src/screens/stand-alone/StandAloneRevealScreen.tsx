import { PrimaryButton } from "../../components/game/Buttons";
import { GameHeader } from "../../components/game/GameHeader";
import type { DemoState } from "../../game/demo/m01Demo";
import { getActiveTwist, getPlayerName, getSelectedResponse, getViewerPlayer } from "../../game/demo/m01Demo";

export function StandAloneRevealScreen({ state, onFaceTwist }: { state: DemoState; onFaceTwist: () => void }) {
  const playerId = state.round.standAlonePlayerId ?? state.viewerId;
  const response = getSelectedResponse(state, playerId);
  const twist = getActiveTwist(state);
  const judgeName = getPlayerName(state, state.round.judgeId);
  const score = getViewerPlayer(state).score;

  return (
    <div className="stand-alone-reveal-state">
      <GameHeader roundNumber={state.round.roundNumber} judgeName={judgeName} score={score} />

      <section className="stand-alone-reveal-copy" aria-labelledby="stand-alone-reveal-title">
        <h1 id="stand-alone-reveal-title">Stand Alone <span aria-hidden="true">🔥</span></h1>
        <span className="red-rule" aria-hidden="true" />
        <p>You're the only one still standing.</p>
        <p className="stand-alone-reveal-subcopy">No free win. Face the twist.</p>
      </section>

      <article className="stand-alone-response-card" aria-label={`Selected response: ${response.text}`}>
        <span className="stand-alone-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <section className="stand-alone-twist-panel" aria-label={`Twist: ${twist.text}`}>
        <span>Twist <span aria-hidden="true">👀</span></span>
        <strong>{twist.text}</strong>
      </section>

      <section className="stand-alone-support-copy">
        <h2>Defend it again. You have 15 seconds.</h2>
        <p>Everyone else folded. It's all on you now.</p>
      </section>

      <PrimaryButton onClick={onFaceTwist}>Face the Twist →</PrimaryButton>
    </div>
  );
}
