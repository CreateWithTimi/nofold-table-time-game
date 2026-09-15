import { SecondaryButton } from "../../components/game/Buttons";
import { GameHeader } from "../../components/game/GameHeader";
import type { DemoState } from "../../game/demo/m01Demo";
import { getActiveTwist, getPlayerName, getSelectedResponse, getViewerPlayer } from "../../game/demo/m01Demo";
import { useCountdown } from "../../hooks/useCountdown";

export function StandAloneDefenseScreen({
  state,
  remainingSeconds,
  onComplete,
}: {
  state: DemoState;
  remainingSeconds?: number;
  onComplete: () => void;
}) {
  const playerId = state.round.standAlonePlayerId ?? state.viewerId;
  const response = getSelectedResponse(state, playerId);
  const twist = getActiveTwist(state);
  const judgeName = getPlayerName(state, state.round.judgeId);
  const score = getViewerPlayer(state).score;
  const localRemaining = useCountdown(15, remainingSeconds === undefined);
  const remaining = remainingSeconds ?? localRemaining;
  const done = remaining === 0;

  return (
    <div className="stand-alone-defense-state">
      <GameHeader roundNumber={state.round.roundNumber} judgeName={judgeName} score={score} />

      <section className="stand-alone-defense-copy" aria-labelledby="stand-alone-defense-title">
        <h1 id="stand-alone-defense-title">Stand Alone <span aria-hidden="true">🔥</span></h1>
        <span className="red-rule" aria-hidden="true" />
        <p>You're the only one still standing.</p>
        <p className="stand-alone-defense-subcopy">Defend it again.</p>
      </section>

      <article className="stand-alone-defense-card" aria-label={`Selected response: ${response.text}`}>
        <span className="stand-alone-defense-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <section className="stand-alone-defense-twist" aria-label={`Twist: ${twist.text}`}>
        <span>Twist <span aria-hidden="true">👀</span></span>
        <strong>{twist.text}</strong>
      </section>

      <section className="stand-alone-defense-timer-copy">
        <h2>You have 15 seconds.</h2>
        <div className="stand-alone-defense-timer" role="timer" aria-live="polite">
          {formatClock(remaining)}
        </div>
        <p>Everyone else folded. It's all on you now.</p>
        <p className="stand-alone-defense-speak">Speak now.</p>
      </section>

      <div className="stand-alone-defense-live-slot">
        {!done ? (
          <>
            <div className="stand-alone-defense-live-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="stand-alone-defense-live-label">Second Defense Live...</p>
          </>
        ) : (
          <SecondaryButton onClick={onComplete}>Continue</SecondaryButton>
        )}
      </div>
    </div>
  );
}

function formatClock(seconds: number) {
  return `00:${String(seconds).padStart(2, "0")}`;
}
