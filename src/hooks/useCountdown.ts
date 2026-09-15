import { useEffect, useState } from "react";

export function useCountdown(seconds: number, active: boolean, onDone?: () => void) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!active || remaining <= 0) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [active, remaining]);

  useEffect(() => {
    if (active && remaining === 0) {
      onDone?.();
    }
  }, [active, onDone, remaining]);

  return remaining;
}

export function useCountdownFromStartedAt(seconds: number, startedAtMs: number | null) {
  const getRemaining = () => {
    if (startedAtMs === null) {
      return seconds;
    }

    const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
    return Math.max(0, seconds - elapsedSeconds);
  };

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    setRemaining(getRemaining());

    if (startedAtMs === null) {
      return;
    }

    const timerId = window.setInterval(() => {
      setRemaining(getRemaining());
    }, 250);

    return () => window.clearInterval(timerId);
  }, [seconds, startedAtMs]);

  return remaining;
}
