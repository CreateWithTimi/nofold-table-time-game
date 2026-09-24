import { useCallback, useEffect, useRef, useState } from "react";
import { useRecoveryRefresh } from "./useRecoveryRefresh";
import { ensureOwnRoundHand, type PersistedRoundHand } from "../services/roundHands";
import type { RoomPlayer } from "../room/types";

export function useRoundHands({
  sessionId,
  roomId,
  roundNumber,
  currentPlayerId,
  isJudge,
  scenarioId,
  activePlayers,
}: {
  sessionId?: string | null;
  roomId?: string;
  roundNumber: number;
  currentPlayerId?: string;
  isJudge: boolean;
  scenarioId: string | null;
  activePlayers: RoomPlayer[];
}) {
  const [storedHand, setOwnHand] = useState<PersistedRoundHand | null>(null);
  const ownHand = storedHand && storedHand.session_id === sessionId &&
    storedHand.room_id === roomId && storedHand.round_number === roundNumber &&
    storedHand.player_id === currentPlayerId && !isJudge ? storedHand : null;
  const [error, setError] = useState("");
  const [isEnsuring, setIsEnsuring] = useState(false);
  const request = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++request.current;
    if (!sessionId || !roomId || !currentPlayerId || !scenarioId || isJudge) {
      setOwnHand(null);
      return;
    }

    try {
      setIsEnsuring(true);
      setError("");
      const hand = await ensureOwnRoundHand({
        sessionId,
        roomId,
        roundNumber,
        playerId: currentPlayerId,
        scenarioId,
        activePlayers,
      });
      if (version !== request.current) return;
      setOwnHand(hand);

      if (!hand || hand.response_ids.length !== 4) {
        setError("Could not finish dealing your hand. Refresh or try again.");
      }
    } catch (caught) {
      console.error("NO FOLD private hand recovery failed", caught);
      if (version === request.current) setError("Could not deal your hand. Try again.");
    } finally {
      if (version === request.current) setIsEnsuring(false);
    }
  }, [activePlayers, currentPlayerId, isJudge, roomId, roundNumber, scenarioId, sessionId]);

  useEffect(() => {
    setOwnHand(null);
    setError("");
  }, [roomId, roundNumber, sessionId]);

  useEffect(() => {
    void refresh();
    return () => { request.current += 1; };
  }, [refresh]);
  useRecoveryRefresh(refresh);

  return {
    ownHand,
    error,
    isEnsuring,
    refresh,
  };
}
