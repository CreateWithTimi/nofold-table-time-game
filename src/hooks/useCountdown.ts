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
