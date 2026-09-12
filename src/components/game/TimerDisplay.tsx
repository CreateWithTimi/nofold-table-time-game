interface TimerDisplayProps {
  seconds: number;
  label?: string;
  live?: boolean;
}

export function TimerDisplay({ seconds, label = "Timer", live = false }: TimerDisplayProps) {
  return (
    <div className={`timer-display${live ? " is-live" : ""}`} role="timer" aria-live="polite">
      <span>{label}</span>
      <strong>{seconds}</strong>
    </div>
  );
}
