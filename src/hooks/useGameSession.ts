import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomPlayer } from "../room/types";
import { supabase } from "../lib/supabase";
import { useRecoveryRefresh } from "./useRecoveryRefresh";
import {
  advanceToNextRound,
  applyRoundScoresOnce,
  ensureGameSession,
  getGameScores,
  getGameSession,
  restartSession,
  returnToPackSelection,
  type PersistedGameScore,
  type PersistedGameSession,
} from "../services/gameSessions";
import { getPersistedRound, type PersistedGameRound } from "../services/rounds";
import type { RealtimeConnectionState } from "./usePersistedRoom";

export function useGameSession({
  roomId,
  roomCode,
  players,
  initialJudgeId,
}: {
  roomId?: string;
  roomCode: string;
  players: RoomPlayer[];
  initialJudgeId?: string | null;
}) {
  const [session, setSession] = useState<PersistedGameSession | null>(null);
  const [scores, setScores] = useState<PersistedGameScore[]>([]);
  const [currentRound, setCurrentRound] = useState<PersistedGameRound | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionState>("CONNECTING");
  const requestVersion = useRef(0);
  const hasSnapshot = useRef(false);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!roomId || !initialJudgeId) {
      setSession(null);
      setScores([]);
      setCurrentRound(null);
      return;
    }

    if (!hasSnapshot.current) setIsLoading(true);
    setError("");

    try {
      const ensured = await ensureGameSession({ roomId, players, initialJudgeId });
      if (version !== requestVersion.current) return;
      hasSnapshot.current = true;
      setSession(ensured.session);
      setScores(ensured.scores);
      setCurrentRound(ensured.currentRound);
    } catch (caught) {
      console.error("NO FOLD useGameSession refresh failed", caught);
      if (version === requestVersion.current) setError("Could not sync the table. Try again.");
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, [initialJudgeId, players, roomId]);

  const refetchCanonical = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!roomId) {
      return;
    }

    try {
      const nextSession = await getGameSession(roomId);
      if (!nextSession) return;
      const [nextScores, nextRound] = await Promise.all([
        getGameScores(roomId, nextSession.id),
        getPersistedRound(roomId, nextSession.current_round, nextSession.id),
      ]);
      if (version !== requestVersion.current) return;
      hasSnapshot.current = true;
      setSession(nextSession);
      setScores(nextScores);
      setCurrentRound(nextRound);
      setIsLoading(false);
      setError("");
    } catch (caught) {
      console.error("NO FOLD session recovery failed", caught);
      if (version === requestVersion.current) setError("Could not sync the table. Try again.");
    }
  }, [roomId]);
  useRecoveryRefresh(refetchCanonical);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh]);

  useEffect(() => {
    if (!supabase || !roomId) {
      setRealtimeStatus(supabase ? "CONNECTING" : "ERROR");
      return;
    }

    const client = supabase;
    let isDisposed = false;
    setRealtimeStatus("CONNECTING");

    const channel = client
      .channel(`game-session:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `room_id=eq.${roomId}` },
        () => {
          void refetchCanonical();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_scores", filter: `room_id=eq.${roomId}` },
        () => {
          void refetchCanonical();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_rounds", filter: `room_id=eq.${roomId}` },
        () => {
          void refetchCanonical();
        },
      )
      .subscribe((status, err) => {
        if (isDisposed) {
          return;
        }

        if (status === "SUBSCRIBED") {
          setRealtimeStatus("SUBSCRIBED");
          void refetchCanonical();
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("NO FOLD game session realtime subscription issue", { roomId, status, err });
          setRealtimeStatus("ERROR");
        }
      });

    return () => {
      isDisposed = true;
      void client.removeChannel(channel);
    };
  }, [refetchCanonical, roomId]);

  const applyCurrentRoundScores = useCallback(async (roundNumber: number) => {
    if (!roomId) {
      return;
    }

    const result = await applyRoundScoresOnce({ roomId, sessionId: session?.id ?? null, roundNumber });
    if (result.round) await refetchCanonical();
  }, [refetchCanonical, roomId, session?.id]);

  const advanceRound = useCallback(async (roundNumber: number, judgePlayerId: string) => {
    if (!roomId) {
      return;
    }

    await advanceToNextRound({
      roomId,
      sessionId: session?.id ?? null,
      roomCode,
      roundNumber,
      judgePlayerId,
      players,
    });

    await refetchCanonical();
  }, [players, refetchCanonical, roomCode, roomId, session?.id]);

  const restart = useCallback(async (currentPlayerId: string) => {
    if (!roomId || !session) {
      return null;
    }

    const nextSession = await restartSession({
      sessionId: session.id,
      roomId,
      roomCode,
      players,
      currentPlayerId,
      initialJudgeId: initialJudgeId ?? players[0]?.id ?? currentPlayerId,
      totalRounds: session?.total_rounds,
    });

    await refetchCanonical();
    return nextSession;
  }, [initialJudgeId, players, refetchCanonical, roomCode, roomId, session]);

  const chooseAnotherPack = useCallback(async (currentPlayerId: string, hostPlayerId: string) => {
    if (!roomId || !session) {
      return null;
    }

    const nextSession = await returnToPackSelection({
      sessionId: session.id,
      roomId,
      roomCode,
      players,
      currentPlayerId,
      hostPlayerId,
      initialJudgeId: initialJudgeId ?? players[0]?.id ?? currentPlayerId,
      totalRounds: session?.total_rounds,
    });

    await refetchCanonical();
    return nextSession;
  }, [initialJudgeId, players, refetchCanonical, roomCode, roomId, session]);

  return {
    session,
    scores,
    currentRound,
    currentRoundNumber: session?.current_round ?? 1,
    isFinished: session?.status === "FINISHED",
    isLoading,
    error,
    realtimeStatus,
    refresh,
    applyCurrentRoundScores,
    advanceRound,
    restart,
    chooseAnotherPack,
  };
}
