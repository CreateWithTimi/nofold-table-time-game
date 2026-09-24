import { useEffect, useRef } from "react";
import { GameHeader } from "../../components/game/GameHeader";
import { PrimaryButton } from "../../components/game/Buttons";
import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName, getViewerPlayer, getViewerRoundState } from "../../game/demo/m01Demo";

interface ResponseSelectionScreenProps {
  state: DemoState;
  onSelectResponse: (responseId: string) => void;
  onLockResponse: () => void;
  lockError?: string;
}

export function ResponseSelectionScreen({
  state,
  onSelectResponse,
  onLockResponse,
  lockError,
}: ResponseSelectionScreenProps) {
  const viewer = getViewerPlayer(state);
  const playerRound = getViewerRoundState(state);
  const cards = playerRound.hand;
  const selectedIndex = Math.max(
    0,
    cards.findIndex((card) => card.id === playerRound.selectedResponseId),
  );
  const touchStartX = useRef<number | null>(null);
  const justSwiped = useRef(false);

  useEffect(() => {
    if (!playerRound.selectedResponseId && cards[0]) {
      onSelectResponse(cards[0].id);
    }
  }, [cards, onSelectResponse, playerRound.selectedResponseId]);

  function selectByIndex(index: number) {
    const nextCard = cards[(index + cards.length) % cards.length];
    onSelectResponse(nextCard.id);
  }

  function selectCard(responseId: string) {
    if (justSwiped.current) {
      return;
    }

    onSelectResponse(responseId);
  }

  function handlePointerUp(clientX: number) {
    if (touchStartX.current === null) {
      return;
    }

    const delta = clientX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(delta) < 32) {
      return;
    }

    justSwiped.current = true;
    selectByIndex(selectedIndex + (delta < 0 ? 1 : -1));
    window.setTimeout(() => {
      justSwiped.current = false;
    }, 0);
  }

  function getCarouselSlot(index: number) {
    const offset = (index - selectedIndex + cards.length) % cards.length;

    if (offset === 0) {
      return "is-active";
    }

    if (offset === 1) {
      return "is-next";
    }

    if (offset === cards.length - 1) {
      return "is-previous";
    }

    return "is-away";
  }

  return (
    <div className="response-selection-state">
      <GameHeader
        roundNumber={state.round.roundNumber}
        judgeName={getPlayerName(state, state.round.judgeId)}
        score={viewer.score}
      />
      <section className="response-selection-copy">
        <h1>
          You're in
          <span> trouble</span>
        </h1>
        <div className="red-rule" aria-hidden="true" />
        <p className="scenario-copy">{state.scenario.text}</p>
        <p className="survive-copy">Pick how you survive this.</p>
      </section>
      <div className="response-selection-hand">
        <div
          className="response-carousel"
          onPointerDown={(event) => {
            touchStartX.current = event.clientX;
          }}
          onPointerCancel={() => {
            touchStartX.current = null;
          }}
          onPointerUp={(event) => handlePointerUp(event.clientX)}
        >
          {cards.map((card, index) => {
            const slot = getCarouselSlot(index);

            return (
              <button
                key={card.id}
                className={`carousel-card ${slot}`}
                type="button"
                aria-label={`Select response ${index + 1}: ${card.text}`}
                aria-pressed={card.id === playerRound.selectedResponseId}
                disabled={playerRound.responseLocked}
                tabIndex={slot === "is-away" ? -1 : 0}
                onClick={() => selectCard(card.id)}
              >
                <span className="carousel-card-icon" aria-hidden="true">●●●</span>
                <strong>{card.text}</strong>
                <span className="response-tone">{card.tone}</span>
              </button>
            );
          })}
        </div>
        <div className="response-card-counter" aria-label={`Response ${selectedIndex + 1} of ${cards.length}`}>
          {cards.map((card, index) => (
            <button
              key={card.id}
              className={index === selectedIndex ? "is-active" : ""}
              type="button"
              aria-label={`Go to response ${index + 1}`}
              disabled={playerRound.responseLocked}
              onClick={() => selectByIndex(index)}
            />
          ))}
          <strong>{selectedIndex + 1} / {cards.length}</strong>
        </div>
      </div>
      <PrimaryButton disabled={!playerRound.selectedResponseId || playerRound.responseLocked} onClick={onLockResponse}>
        {playerRound.responseLocked ? "Response Locked" : "Lock Response →"}
      </PrimaryButton>
      {lockError ? <p className="form-error">{lockError}</p> : null}
    </div>
  );
}
