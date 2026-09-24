import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRecoveryRefresh } from "./useRecoveryRefresh";
import {
  getRoundResponses,
  lockRoundResponse,
  type PersistedRoundResponse,
} from "../services/roundResponses";
import type { RealtimeConnectionState } from "./usePersistedRoom";

export function useRoundResponses({
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
  const [storedResponses, setResponses] = useState<PersistedRoundResponse[]>([]);
  const responses = useMemo(() => storedResponses.filter((row) =>
    row.room_id === roomId && row.session_id === (sessionId ?? null) && row.round_number === roundNumber
  ), [storedResponses, roomId, sessionId, roundNumber]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionState>("CONNECTING");
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!roomId) {
      setResponses([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const next = await getRoundResponses(roomId, roundNumber, sessionId);
      if (version === requestVersion.current) setResponses(next);
    } catch (caught) {
      console.error("NO FOLD response locks refresh failed", caught);
      if (version === requestVersion.current) setError("Could not sync the table. Try again.");
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, [roomId, roundNumber, sessionId]);

  useEffect(() => {
    setResponses([]);
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
      .channel(`round-responses:${roomId}:${sessionId ?? "legacy"}:${roundNumber}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_round_responses", filter: `room_id=eq.${roomId}` },
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
          console.warn("NO FOLD round response realtime subscription issue", {
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

  const ownResponse = useMemo(
    () => responses.find((response) => response.player_id === currentPlayerId) ?? null,
    [currentPlayerId, responses],
  );
  const lockedPlayerIds = useMemo(
    () => responses.filter((response) => Boolean(response.locked_at)).map((response) => response.player_id),
    [responses],
  );
  const lockStatuses = useMemo(
    () =>
      Object.fromEntries(
        activePlayerIds.map((playerId) => [
          playerId,
          responses.some((response) => response.player_id === playerId && Boolean(response.locked_at)),
        ]),
      ),
    [activePlayerIds, responses],
  );
  const allResponsesLocked =
    activePlayerIds.length > 0 && activePlayerIds.every((playerId) => lockStatuses[playerId]);

  const lockCurrentPlayerResponse = useCallback(
    async (selectedResponseId: string) => {
      if (!roomId || !currentPlayerId) {
        throw new Error("Cannot lock response without a room and current player.");
      }

      await lockRoundResponse({
        roomId,
        sessionId,
        roundNumber,
        playerId: currentPlayerId,
        selectedResponseId,
      });
      await refresh();
    },
    [currentPlayerId, refresh, roomId, roundNumber, sessionId],
  );

  return {
    responses,
    ownResponse,
    lockedPlayerIds,
    lockStatuses,
    allResponsesLocked,
    isLoading,
    error,
    realtimeStatus,
    refresh,
    lockCurrentPlayerResponse,
  };
}
