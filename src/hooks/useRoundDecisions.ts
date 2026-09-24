import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerDecision } from "../game/types/game";
import { supabase } from "../lib/supabase";
import { useRecoveryRefresh } from "./useRecoveryRefresh";
import {
  getRoundDecisions,
  lockRoundDecision,
  type PersistedRoundDecision,
} from "../services/roundDecisions";
import type { RealtimeConnectionState } from "./usePersistedRoom";

export function useRoundDecisions({
  sessionId,
  roomId,
  roundNumber,
  currentPlayerId,
  activePlayerIds,
}: {
  sessionId?: string | null;
  roomId?: string;
  roundNumber: number;
  currentPlayerId?: string;
  activePlayerIds: string[];
}) {
  const [storedDecisions, setDecisions] = useState<PersistedRoundDecision[]>([]);
  const decisions = useMemo(() => storedDecisions.filter((row) =>
    row.room_id === roomId && row.session_id === (sessionId ?? null) && row.round_number === roundNumber
  ), [storedDecisions, roomId, sessionId, roundNumber]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionState>("CONNECTING");
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!roomId) {
      setDecisions([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const next = await getRoundDecisions(roomId, roundNumber, sessionId);
      if (version === requestVersion.current) setDecisions(next);
    } catch (caught) {
      console.error("NO FOLD table choices refresh failed", caught);
      if (version === requestVersion.current) setError("Could not sync the table. Try again.");
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, [roomId, roundNumber, sessionId]);

  useEffect(() => {
    setDecisions([]);
    setError("");
    setRealtimeStatus(roomId ? "CONNECTING" : "ERROR");
  }, [roomId, roundNumber, sessionId]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh]);
  useRecoveryRefresh(refresh);

  useEffect(() => {
    if (!supabase || !roomId) {
      setRealtimeStatus(supabase ? "CONNECTING" : "ERROR");
      return;
    }

    const client = supabase;
    let isDisposed = false;

    setRealtimeStatus("CONNECTING");

    const channel = client
      .channel(`round-decisions:${roomId}:${sessionId ?? "legacy"}:${roundNumber}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_round_decisions", filter: `room_id=eq.${roomId}` },
        () => {
          void refresh();
        },
      )
      .subscribe((status, err) => {
        if (isDisposed) {
          return;
        }

        if (status === "SUBSCRIBED") {
          setRealtimeStatus("SUBSCRIBED");
          void refresh();
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("NO FOLD round decision realtime subscription issue", {
            roomId,
            roundNumber,
            status,
            err,
          });
          setRealtimeStatus("ERROR");
        }
      });

    return () => {
      isDisposed = true;
      void client.removeChannel(channel);
    };
  }, [refresh, roomId, roundNumber, sessionId]);

  const ownDecision = useMemo(
    () => decisions.find((decision) => decision.player_id === currentPlayerId) ?? null,
    [currentPlayerId, decisions],
  );
  const lockedPlayerIds = useMemo(
    () => decisions.filter((decision) => Boolean(decision.locked_at)).map((decision) => decision.player_id),
    [decisions],
  );
  const lockStatuses = useMemo(
    () =>
      Object.fromEntries(
        activePlayerIds.map((playerId) => [
          playerId,
          decisions.some((decision) => decision.player_id === playerId && Boolean(decision.locked_at)),
        ]),
      ),
    [activePlayerIds, decisions],
  );
  const allDecisionsLocked =
    activePlayerIds.length > 0 && activePlayerIds.every((playerId) => lockStatuses[playerId]);
  const callCount = decisions.filter((decision) => decision.decision === "CALL" && Boolean(decision.locked_at)).length;
  const foldCount = decisions.filter((decision) => decision.decision === "FOLD" && Boolean(decision.locked_at)).length;

  const lockCurrentPlayerDecision = useCallback(
    async (decision: PlayerDecision) => {
      if (!roomId || !currentPlayerId) {
        throw new Error("Cannot lock CALL/FOLD without a room and current player.");
      }

      if (ownDecision?.locked_at) {
        return ownDecision;
      }

      const nextDecision = await lockRoundDecision({
        roomId,
        sessionId,
        roundNumber,
        playerId: currentPlayerId,
        decision,
      });
      await refresh();
      return nextDecision;
    },
    [currentPlayerId, ownDecision, refresh, roomId, roundNumber, sessionId],
  );

  return {
    decisions,
    ownDecision,
    lockedPlayerIds,
    lockStatuses,
    allDecisionsLocked,
    callCount,
    foldCount,
    isLoading,
    error,
    realtimeStatus,
    refresh,
    lockCurrentPlayerDecision,
  };
}
