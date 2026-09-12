import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "../../components/game/Buttons";
import { ResponseCard } from "../../components/game/ResponseCard";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import { TimerDisplay } from "../../components/game/TimerDisplay";
import type { ResponseCard as ResponseCardType } from "../../game/types/content";
import { useCountdown } from "../../hooks/useCountdown";

interface DefenseScreenProps {
  response: ResponseCardType;
  seconds?: number;
  title?: string;
  copy?: string;
  liveLabel?: string;
  onComplete: () => void;
  children?: React.ReactNode;
}

export function DefenseScreen({
  response,
  seconds = 20,
  title = "Defend it",
  copy = "Make the table believe you meant it.",
  liveLabel = "Defense live",
  onComplete,
  children,
}: DefenseScreenProps) {
  const [started, setStarted] = useState(false);
  const remaining = useCountdown(seconds, started);
  const done = started && remaining === 0;

  return (
    <>
      <SectionHeadline eyebrow={started ? liveLabel : "Ready"} title={title} copy={copy} />
      <ResponseCard card={response} selected />
      {children}
      <TimerDisplay seconds={remaining} label={started ? liveLabel : "Seconds"} live={started && !done} />
      {!started ? <PrimaryButton onClick={() => setStarted(true)}>Start Defense</PrimaryButton> : null}
      {done ? <SecondaryButton onClick={onComplete}>Continue</SecondaryButton> : null}
    </>
  );
}
