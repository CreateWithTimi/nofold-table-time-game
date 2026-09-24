import { PrimaryButton } from "../../components/game/Buttons";
import { GameHeader } from "../../components/game/GameHeader";
import type { DemoFlow, DemoState } from "../../game/demo/m01Demo";
import { getActiveTwist, getPlayerName, getSelectedResponse, getViewerPlayer, getViewerRole, isSelectedResponseHydrated } from "../../game/demo/m01Demo";

interface RoundResultScreenProps {
  state: DemoState;
  onReset: (flow: DemoFlow) => void;
}

export function RoundResultScreen({ state, onReset }: RoundResultScreenProps) {
  const viewer = getViewerPlayer(state);
  const standAloneResult = state.round.standAlonePlayerId
    ? state.resultByPlayerId[state.round.standAlonePlayerId]
    : null;
  const isStandAloneResult =
    state.flow === "STAND_ALONE" &&
    standAloneResult !== null &&
    ["STOOD ALONE", "CAUGHT"].includes(standAloneResult.title);
  const noEscapeResult = state.round.noEscapePlayerId
    ? state.resultByPlayerId[state.round.noEscapePlayerId]
    : null;
  const isNoEscapeResult =
    state.flow === "COWARD" &&
    state.round.phase === "ROUND_RESULT" &&
    state.round.noEscapePlayerId !== null &&
    noEscapeResult !== null &&
    ["NO ESCAPE SURVIVED", "NO ESCAPE CAUGHT"].includes(noEscapeResult.title);

  if (isStandAloneResult) {
    return <StandAloneResult state={state} onReset={onReset} />;
  }

  if (isNoEscapeResult) {
    return <NoEscapeResult state={state} onReset={onReset} />;
  }

  if (state.flow === "NORMAL") {
    return <NormalRoundResult state={state} onReset={onReset} />;
  }

  return (
    <div className="normal-result-state">
      <GameHeader roundNumber={state.round.roundNumber} judgeName={getPlayerName(state, state.round.judgeId)} score={viewer.score} />
      <PrimaryButton onClick={() => onReset(state.flow)}>Next Round</PrimaryButton>
    </div>
  );
}

function NormalRoundResult({ state, onReset }: RoundResultScreenProps) {
  const viewer = getViewerPlayer(state);
  const judgeName = getPlayerName(state, state.round.judgeId);
  const isJudge = getViewerRole(state) === "JUDGE";
  const winnerId = state.round.winningPlayerId;

  if (isJudge) {
    const resolvedWinnerId = winnerId ?? state.outcome?.callerIds[0] ?? Object.keys(state.round.playerStates)[0];
    if (!resolvedWinnerId || !isSelectedResponseHydrated(state, resolvedWinnerId)) {
      return <ResultHydrationFallback state={state} />;
    }

    const winnerName = getPlayerName(state, resolvedWinnerId);
    const winningResponse = getSelectedResponse(state, resolvedWinnerId);

    return (
      <div className="normal-result-state is-judge">
        <header className="normal-result-judge-header">
          <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
          <span>You're <strong>the Judge</strong></span>
        </header>

        <section className="normal-result-copy" aria-labelledby="normal-result-title">
          <h1 id="normal-result-title">The table has spoken</h1>
          <span className="red-rule" aria-hidden="true" />
        </section>

        <section className="normal-result-winner" aria-label={`${winnerName} survived`}>
          <strong>{winnerName} survived <span aria-hidden="true">🔥</span></strong>
          <p>You picked the defense that sold it best.</p>
        </section>

        <article className="normal-result-card" aria-label={`Winning response: ${winningResponse.text}`}>
          <span className="normal-result-card-icon" aria-hidden="true">●●●</span>
          <strong>{winningResponse.text}</strong>
        </article>

        <PrimaryButton onClick={() => onReset(state.flow)}>Next Round →</PrimaryButton>
      </div>
    );
  }

  const viewerRoundState = state.round.playerStates[state.viewerId];
  const result = state.resultByPlayerId[state.viewerId];
  const won = state.round.winningPlayerId === state.viewerId;
  const folded = viewerRoundState?.decision === "FOLD";
  if (!isSelectedResponseHydrated(state, state.viewerId)) {
    return <ResultHydrationFallback state={state} />;
  }

  const response = getSelectedResponse(state, state.viewerId);
  const variant = folded ? "folded" : won ? "won" : "lost";
  const headline =
    variant === "won" ? (
      <>
        You <span>survived <span aria-hidden="true">🔥</span></span>
      </>
    ) : variant === "lost" ? (
      <>
        Bad <span>call <span aria-hidden="true">😭</span></span>
      </>
    ) : (
      <>
        You <span>folded</span>
      </>
    );
  const support =
    variant === "won"
      ? "The judge bought it."
      : variant === "lost"
        ? "You stood on it, but the table didn't buy it."
        : "You got out before the table decided.";
  const scoreCopy =
    variant === "won"
      ? "You stood on it and won the table."
      : variant === "lost"
        ? "You lost the table."
        : "Safe, but it cost you.";

  return (
    <div className={`normal-result-state is-player is-${variant}`}>
      <GameHeader roundNumber={state.round.roundNumber} judgeName={judgeName} score={viewer.score} />

      <section className="normal-result-copy" aria-labelledby="normal-result-title">
        <h1 id="normal-result-title">{headline}</h1>
        <span className="red-rule" aria-hidden="true" />
        <p>{support}</p>
      </section>

      <article className="normal-result-card" aria-label={`Selected response: ${response.text}`}>
        <span className="normal-result-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <section className="normal-result-score">
        <strong>{formatSigned(result?.delta ?? 0)}</strong>
        <p>{scoreCopy}</p>
      </section>

      <PrimaryButton onClick={() => onReset(state.flow)}>Next Round →</PrimaryButton>
    </div>
  );
}

function StandAloneResult({ state, onReset }: RoundResultScreenProps) {
  const playerId = state.round.standAlonePlayerId ?? state.viewerId;
  const viewer = getViewerPlayer(state);
  const result = state.resultByPlayerId[playerId] ?? state.resultByPlayerId[state.viewerId];
  const survived = result?.delta > 0;
  if (!playerId || !isSelectedResponseHydrated(state, playerId)) {
    return <ResultHydrationFallback state={state} />;
  }

  const response = getSelectedResponse(state, playerId);
  const twist = getActiveTwist(state);
  const judgeName = getPlayerName(state, state.round.judgeId);
  const playerName = getPlayerName(state, playerId);

  if (getViewerRole(state) === "JUDGE") {
    return (
      <div className={`stand-alone-result-state is-judge${survived ? " is-success" : " is-failure"}`}>
        <header className="stand-alone-result-judge-header">
          <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
          <span>You're <strong>the Judge</strong></span>
        </header>

        <section className="stand-alone-result-copy" aria-labelledby="stand-alone-result-title">
          <h1 id="stand-alone-result-title">The table has spoken</h1>
          <span className="red-rule" aria-hidden="true" />
        </section>

        <section className="stand-alone-result-verdict" aria-label={`${playerName} ${survived ? "survived" : "got caught"}`}>
          <strong>
            {playerName} {survived ? "survived" : "got caught"} <span aria-hidden="true">{survived ? "🔥" : "😭"}</span>
          </strong>
          <p>You made the final call.</p>
          <p>{survived ? "They survived the twist." : "The bluff didn't hold."}</p>
        </section>

        <article className="stand-alone-result-card" aria-label={`${playerName}'s selected response: ${response.text}`}>
          <span className="stand-alone-result-card-icon" aria-hidden="true">●●●</span>
          <strong>{response.text}</strong>
        </article>

        <section className="stand-alone-result-twist" aria-label={`Twist: ${twist.text}`}>
          <span>Twist <span aria-hidden="true">👀</span></span>
          <strong>{twist.text}</strong>
        </section>

        <PrimaryButton onClick={() => onReset(state.flow)}>Next Round →</PrimaryButton>
      </div>
    );
  }

  const viewerRoundState = state.round.playerStates[state.viewerId];

  if (state.viewerId !== playerId && viewerRoundState?.decision === "FOLD") {
    return <NormalRoundResult state={state} onReset={onReset} />;
  }

  if (state.viewerId !== playerId) {
    return (
      <div className="normal-result-state is-player is-lost">
        <GameHeader roundNumber={state.round.roundNumber} judgeName={judgeName} score={viewer.score} />

        <section className="normal-result-copy" aria-labelledby="stand-alone-fallback-title">
          <h1 id="stand-alone-fallback-title">Result unavailable</h1>
          <span className="red-rule" aria-hidden="true" />
          <p>This Stand Alone result does not match your player decision.</p>
        </section>

        <PrimaryButton onClick={() => onReset(state.flow)}>Next Round →</PrimaryButton>
      </div>
    );
  }

  return (
    <div className={`stand-alone-result-state${survived ? " is-success" : " is-failure"}`}>
      <GameHeader roundNumber={state.round.roundNumber} judgeName={judgeName} score={viewer.score} />

      <section className="stand-alone-result-copy" aria-labelledby="stand-alone-result-title">
        <h1 id="stand-alone-result-title">
          {survived ? (
            <>
              You <span>survived <span aria-hidden="true">🔥</span></span>
            </>
          ) : (
            <>
              You got <span>caught <span aria-hidden="true">😭</span></span>
            </>
          )}
        </h1>
        <span className="red-rule" aria-hidden="true" />
        <p>{survived ? "You stood alone and sold it." : "You stood alone and got exposed."}</p>
        <p className="stand-alone-result-subcopy">
          {survived ? "The judge bought it." : "The judge did not buy it."}
        </p>
      </section>

      <article className="stand-alone-result-card" aria-label={`Selected response: ${response.text}`}>
        <span className="stand-alone-result-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <section className="stand-alone-result-twist" aria-label={`Twist: ${twist.text}`}>
        <span>Twist <span aria-hidden="true">👀</span></span>
        <strong>{twist.text}</strong>
      </section>

      <section className="stand-alone-result-score">
        <strong>{formatSigned(result?.delta ?? 0)}</strong>
        <p>{survived ? "Standing alone paid off." : "Standing alone did not land."}</p>
        <p>Next round is coming.</p>
      </section>

      <PrimaryButton onClick={() => onReset(state.flow)}>Next Round →</PrimaryButton>
    </div>
  );
}

function NoEscapeResult({ state, onReset }: RoundResultScreenProps) {
  const playerId = state.round.noEscapePlayerId ?? state.viewerId;
  const viewer = getViewerPlayer(state);
  const result = state.resultByPlayerId[playerId] ?? state.resultByPlayerId[state.viewerId];
  const survived = result?.title === "NO ESCAPE SURVIVED";
  if (!playerId || !isSelectedResponseHydrated(state, playerId)) {
    return <ResultHydrationFallback state={state} />;
  }

  const response = getSelectedResponse(state, playerId);
  const judgeName = getPlayerName(state, state.round.judgeId);
  const playerName = getPlayerName(state, playerId);

  if (getViewerRole(state) === "JUDGE") {
    return (
      <div className={`no-escape-result-state is-judge${survived ? " is-success" : " is-failure"}`}>
        <header className="normal-result-judge-header">
          <span>Round {String(state.round.roundNumber).padStart(2, "0")}</span>
          <span>You're <strong>the Judge</strong></span>
        </header>

        <section className="no-escape-result-copy" aria-labelledby="no-escape-result-title">
          <h1 id="no-escape-result-title">The table has spoken</h1>
          <span className="red-rule" aria-hidden="true" />
        </section>

        <section className="normal-result-winner" aria-label={`${playerName} ${survived ? "survived" : "got caught"}`}>
          <strong>
            {playerName} {survived ? "survived" : "got caught"} <span aria-hidden="true">{survived ? "🔥" : "😭"}</span>
          </strong>
          <p>You made the final call.</p>
          <p>{survived ? "They survived No Escape." : "The bluff didn't hold."}</p>
        </section>

        <section className="no-escape-result-scenario" aria-label={`Scenario: ${state.noEscapeScenario.text}`}>
          <span>Scenario</span>
          <strong>{state.noEscapeScenario.text}</strong>
        </section>

        <article className="no-escape-result-card" aria-label={`${playerName}'s forced response: ${response.text}`}>
          <span className="no-escape-result-card-icon" aria-hidden="true">●●●</span>
          <strong>{response.text}</strong>
        </article>

        <section className="no-escape-result-outcome">
          <strong>No Extra Loss</strong>
          <p>Coward Round already took its hit.</p>
          <p>No Escape added pressure, not points.</p>
        </section>

        <PrimaryButton onClick={() => onReset(state.flow)}>Next Round →</PrimaryButton>
      </div>
    );
  }

  if (state.viewerId !== playerId) {
    const viewerResult = state.resultByPlayerId[state.viewerId];

    return (
      <div className="normal-result-state is-player is-lost">
        <GameHeader roundNumber={state.round.roundNumber} judgeName={judgeName} score={viewer.score} />

        <section className="normal-result-copy" aria-labelledby="coward-result-title">
          <h1 id="coward-result-title">
            Coward <span>round <span aria-hidden="true">😭</span></span>
          </h1>
          <span className="red-rule" aria-hidden="true" />
          <p>Everybody folded. The table remembered.</p>
        </section>

        <section className="normal-result-score">
          <strong>{formatSigned(viewerResult?.delta ?? -2)}</strong>
          <p>{viewerResult?.copy ?? "Coward Round already took its hit."}</p>
        </section>

        <PrimaryButton onClick={() => onReset(state.flow)}>Next Round →</PrimaryButton>
      </div>
    );
  }

  return (
    <div className={`no-escape-result-state${survived ? " is-success" : " is-failure"}`}>
      <GameHeader roundNumber={state.round.roundNumber} judgeName={judgeName} score={viewer.score} />

      <section className="no-escape-result-copy" aria-labelledby="no-escape-result-title">
        <h1 id="no-escape-result-title">
          {survived ? (
            <>
              You <span>survived <span aria-hidden="true">🔥</span></span>
            </>
          ) : (
            <>
              You got <span>caught <span aria-hidden="true">😭</span></span>
            </>
          )}
        </h1>
        <span className="red-rule" aria-hidden="true" />
        <p>{survived ? "You faced the table and got through it." : "You faced the table, but it didn't hold."}</p>
        <p className="no-escape-result-subcopy">
          {survived ? "No Escape didn't break you." : "No Escape broke your bluff."}
        </p>
      </section>

      <section className="no-escape-result-scenario" aria-label={`Scenario: ${state.noEscapeScenario.text}`}>
        <span>Scenario</span>
        <strong>{state.noEscapeScenario.text}</strong>
      </section>

      <article className="no-escape-result-card" aria-label={`Forced response: ${response.text}`}>
        <span className="no-escape-result-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <section className="no-escape-result-outcome">
        <strong>No Extra Loss</strong>
        <p>Coward Round already took its hit.</p>
        <p>{survived ? "You survived the No Escape challenge." : "You didn't survive the No Escape challenge."}</p>
      </section>

      <PrimaryButton onClick={() => onReset(state.flow)}>Next Round →</PrimaryButton>
    </div>
  );
}

function ResultHydrationFallback({ state }: { state: DemoState }) {
  const viewer = getViewerPlayer(state);

  return (
    <div className="normal-result-state">
      <GameHeader roundNumber={state.round.roundNumber} judgeName={getPlayerName(state, state.round.judgeId)} score={viewer.score} />
      <section className="normal-result-copy" aria-live="polite" aria-labelledby="result-hydration-title">
        <h1 id="result-hydration-title">Round complete</h1>
        <span className="red-rule" aria-hidden="true" />
        <p>Updating table...</p>
      </section>
    </div>
  );
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}
