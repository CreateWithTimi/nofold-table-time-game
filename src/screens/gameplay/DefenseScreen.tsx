import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "../../components/game/Buttons";
import { ResponseCard } from "../../components/game/ResponseCard";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import type { ResponseCard as ResponseCardType } from "../../game/types/content";
import { useCountdown } from "../../hooks/useCountdown";

interface DefenseScreenProps {
  response: ResponseCardType;
  seconds?: number;
  title?: string;
  copy?: string;
  liveLabel?: string;
  roundNumber?: number;
  judgeName?: string;
  score?: number;
  started?: boolean;
  remainingSeconds?: number;
  onStart?: () => void;
  onComplete: () => void;
  children?: React.ReactNode;
}

export function DefenseScreen({
  response,
  seconds = 20,
  title = "Defend it",
  copy = "Make the table believe you meant it.",
  liveLabel = "Defense live",
  roundNumber,
  judgeName,
  score,
  started: controlledStarted,
  remainingSeconds,
  onStart,
  onComplete,
  children,
}: DefenseScreenProps) {
  const [internalStarted, setInternalStarted] = useState(false);
  const internalRemaining = useCountdown(seconds, internalStarted);
  const started = controlledStarted ?? internalStarted;
  const remaining = remainingSeconds ?? internalRemaining;
  const done = started && remaining === 0;
  const isNormalDefense = !children && seconds === 20 && title === "Defend it";
  const startDefense = () => {
    if (onStart) {
      onStart();
      return;
    }

    setInternalStarted(true);
  };

  if (isNormalDefense) {
    return (
      <div className="defense-state">
        <header className="defense-status-row">
          <span>Round {String(roundNumber ?? 2).padStart(2, "0")}</span>
          <span>
            Judge: <strong>{judgeName ?? "Ada"}</strong>
          </span>
          <span>{formatSignedScore(score ?? 2)}</span>
        </header>
        <section className="defense-copy">
          <h1>Defend it.</h1>
          <div className="red-rule" aria-hidden="true" />
        </section>
        <article className="defense-response-card" aria-label={`Selected response: ${response.text}`}>
          <span className="defense-card-icon" aria-hidden="true">●●●</span>
          <strong>{response.text}</strong>
        </article>
        <section className="defense-instructions">
          <h2>You have {seconds} seconds.</h2>
          <p>Make it believable.</p>
        </section>
        <div className={`defense-timer${started && !done ? " is-live" : ""}`} role="timer" aria-live="polite">
          {formatClock(remaining)}
        </div>
        <div className="defense-action-slot">
          {!started ? <PrimaryButton onClick={startDefense}>Start Defense →</PrimaryButton> : null}
          {done ? <SecondaryButton onClick={onComplete}>Continue</SecondaryButton> : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <SectionHeadline eyebrow={started ? liveLabel : "Ready"} title={title} copy={copy} />
      <ResponseCard card={response} selected />
      {children}
      <div className={`timer-display${started && !done ? " is-live" : ""}`} role="timer" aria-live="polite">
        <span>{started ? liveLabel : "Seconds"}</span>
        <strong>{remaining}</strong>
      </div>
      {!started ? <PrimaryButton onClick={startDefense}>Start Defense</PrimaryButton> : null}
      {done ? <SecondaryButton onClick={onComplete}>Continue</SecondaryButton> : null}
    </>
  );
}

function formatClock(seconds: number) {
  return `00:${String(seconds).padStart(2, "0")}`;
}

function formatSignedScore(score: number) {
  return `${score >= 0 ? "+" : ""}${score}`;
}
