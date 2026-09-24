import { useEffect } from "react";

// Recover events missed while offline or while a mobile browser suspended the tab.
export function useRecoveryRefresh(refresh: () => Promise<unknown>) {
  useEffect(() => {
    const recover = () => {
      if (navigator.onLine && document.visibilityState === "visible") {
        void refresh().catch((error) => console.error("NO FOLD recovery failed", error));
      }
    };
    window.addEventListener("online", recover);
    document.addEventListener("visibilitychange", recover);
    const interval = window.setInterval(recover, 15000);
    return () => {
      window.removeEventListener("online", recover);
      document.removeEventListener("visibilitychange", recover);
      window.clearInterval(interval);
    };
  }, [refresh]);
}
