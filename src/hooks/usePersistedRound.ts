import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GAME_PHASES } from "../game/constants/phases";
import { supabase } from "../lib/supabase";
import { useRecoveryRefresh } from "./useRecoveryRefresh";
import {
  advanceDefenseTurn,
  completeNoEscapeDefense,
  completeStandAloneDefense,
  ensureDefenseRoundStarted,
  ensureCallFoldResolved,
  getPersistedRound,
  isPreDefenseRoundPhase,
  lockJudgeWinner,
  resolveNoEscapeVerdict,
  resolveStandAloneVerdict,
  startNoEscape,
  startStandAloneDefense,
  startDefenseTimer,
  type PersistedGameRound,
} from "../services/rounds";
import type { RealtimeConnectionState } from "./usePersistedRoom";

const DEFENSE_SECONDS = 20;
const STAND_ALONE_SECONDS = 15;
const NO_ESCAPE_SECONDS = 15;

export function usePersistedRound({
  sessionId,
  roomId,
  roundNumber,
  judgePlayerId,
  defenseOrder,
  shouldEnsureDefense,
}: {
  sessionId?: string | null;
  roomId?: string;
  roundNumber: number;
  judgePlayerId?: string | null;
  defenseOrder: string[];
  shouldEnsureDefense: boolean;
}) {
  const [storedRound, setRound] = useState<PersistedGameRound | null>(null);
  const round = storedRound && storedRound.room_id === roomId &&
    storedRound.session_id === (sessionId ?? null) &&
    storedRound.round_number === roundNumber ? storedRound : null;
  const [nowMs, setNowMs] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionState>("CONNECTING");
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!roomId) {
      setRound(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const next = await getPersistedRound(roomId, roundNumber, sessionId);
      if (version === requestVersion.current) setRound(next);
    } catch (caught) {
      console.error("NO FOLD round refresh failed", caught);
      if (version === requestVersion.current) setError("Could not sync the table. Try again.");
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, [roomId, roundNumber, sessionId]);

  useEffect(() => {
    setRound(null);
    setError("");
    setRealtimeStatus(roomId ? "CONNECTING" : "ERROR");
  }, [roomId, roundNumber, sessionId]);

  useEffect(() => {
    void refresh();
    return () => { requestVersion.current += 1; };
  }, [refresh]);
  useRecoveryRefresh(refresh);

  useEffect(() => {
    if (!roomId || !judgePlayerId || !shouldEnsureDefense) {
      return;
    }

    if (round && !isPreDefenseRoundPhase(round.phase)) {
      console.info("NO FOLD shared defense handoff skipped; round is already past response selection", {
        roomId,
        roundNumber,
        existingRoundId: round.id,
        existingPhase: round.phase,
        defenseOrder,
      });
      return;
    }

    console.info("NO FOLD ensuring shared defense round", {
      roomId,
      sessionId,
      roundNumber,
      judgePlayerId,
      defenseOrder,
      existingRoundId: round?.id ?? null,
      existingPhase: round?.phase ?? null,
    });

    let disposed = false;
    void ensureDefenseRoundStarted({
      roomId,
      sessionId,
      roundNumber,
      judgePlayerId,
      defenseOrder,
    })
      .then((nextRound) => {
        if (nextRound && !disposed) {
          setRound(nextRound);
        }
      })
      .catch((caught) => {
        if (disposed) return;
        console.error("NO FOLD shared defense handoff failed", {
          roomId,
          roundNumber,
          judgePlayerId,
          defenseOrder,
          error: caught,
        });
        setError("Could not sync the table. Try again.");
      });
    return () => { disposed = true; };
  }, [defenseOrder, judgePlayerId, roomId, round, roundNumber, sessionId, shouldEnsureDefense]);

  useEffect(() => {
    if (!supabase || !roomId) {
      setRealtimeStatus(supabase ? "CONNECTING" : "ERROR");
      return;
    }

    const client = supabase;
    let isDisposed = false;

    setRealtimeStatus("CONNECTING");

    const channel = client
      .channel(`round:${roomId}:${sessionId ?? "legacy"}:${roundNumber}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_rounds", filter: `room_id=eq.${roomId}` },
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
          console.warn("NO FOLD round realtime subscription issue", { roomId, roundNumber, status, err });
          setRealtimeStatus("ERROR");
        }
      });

    return () => {
      isDisposed = true;
      void client.removeChannel(channel);
    };
  }, [refresh, roomId, roundNumber, sessionId]);

  useEffect(() => {
    const hasNormalDefenseTimer = round?.defense_started_at && round.phase === GAME_PHASES.DEFENSE;
    const hasStandAloneTimer =
      round?.stand_alone_defense_started_at && round.phase === GAME_PHASES.STAND_ALONE_DEFENSE;
    const hasNoEscapeTimer =
      round?.no_escape_defense_started_at && round.phase === GAME_PHASES.NO_ESCAPE_DEFENSE;

    if (!hasNormalDefenseTimer && !hasStandAloneTimer && !hasNoEscapeTimer) {
      return;
    }

    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [
    round?.defense_started_at,
    round?.no_escape_defense_started_at,
    round?.phase,
    round?.stand_alone_defense_started_at,
  ]);

  const currentDefenderId = round?.defense_order[round.current_defender_index] ?? null;
  const remainingSeconds = useMemo(() => {
    if (!round?.defense_started_at) {
      return DEFENSE_SECONDS;
    }

    const startedMs = new Date(round.defense_started_at).getTime();
    const elapsedSeconds = Math.floor((nowMs - startedMs) / 1000);
    return Number.isFinite(startedMs) ? Math.max(0, Math.min(DEFENSE_SECONDS, DEFENSE_SECONDS - elapsedSeconds)) : DEFENSE_SECONDS;
  }, [nowMs, round?.defense_started_at]);
  const standAloneRemainingSeconds = useMemo(() => {
    if (!round?.stand_alone_defense_started_at) {
      return STAND_ALONE_SECONDS;
    }

    const startedMs = new Date(round.stand_alone_defense_started_at).getTime();
    if (Number.isNaN(startedMs)) {
      return STAND_ALONE_SECONDS;
    }

    const elapsedSeconds = Math.floor((nowMs - startedMs) / 1000);
    return Math.max(0, Math.min(STAND_ALONE_SECONDS, STAND_ALONE_SECONDS - elapsedSeconds));
  }, [nowMs, round?.stand_alone_defense_started_at]);
  const noEscapeStartedMs = useMemo(() => {
    if (!round?.no_escape_defense_started_at) {
      return null;
    }

    const startedMs = new Date(round.no_escape_defense_started_at).getTime();
    return Number.isNaN(startedMs) ? null : startedMs;
  }, [round?.no_escape_defense_started_at]);
  const hasNoEscapeTimerStarted = noEscapeStartedMs !== null;
  const noEscapeRemainingSeconds = useMemo(() => {
    if (noEscapeStartedMs === null) {
      return NO_ESCAPE_SECONDS;
    }

    const elapsedSeconds = Math.floor((nowMs - noEscapeStartedMs) / 1000);
    return Math.max(0, Math.min(NO_ESCAPE_SECONDS, NO_ESCAPE_SECONDS - elapsedSeconds));
  }, [noEscapeStartedMs, nowMs]);

  const startCurrentDefense = useCallback(async () => {
    if (!round || !roomId) {
      return;
    }

      const nextRound = await startDefenseTimer({
        roundId: round.id,
        roomId,
        sessionId,
        roundNumber,
        currentDefenderIndex: round.current_defender_index,
      });

    setRound(nextRound);
  }, [roomId, round, roundNumber, sessionId]);

  const completeCurrentDefense = useCallback(async () => {
    if (!round || !roomId) {
      return;
    }

      const nextRound = await advanceDefenseTurn({
        roundId: round.id,
        roomId,
        sessionId,
        roundNumber,
        currentDefenderIndex: round.current_defender_index,
        defenseOrderLength: round.defense_order.length,
      });

    setRound(nextRound);
  }, [roomId, round, roundNumber, sessionId]);

  const resolveCallFold = useCallback(
    async (activePlayerIds: string[], standAloneTwistId: string | null) => {
      if (!round || !roomId) {
        return;
      }

      const nextRound = await ensureCallFoldResolved({
        roomId,
        sessionId,
        roundNumber,
        roundId: round.id,
        activePlayerIds,
        standAloneTwistId: round.stand_alone_twist_id ?? standAloneTwistId,
      });

      setRound(nextRound);
    },
    [roomId, round, roundNumber, sessionId],
  );

  const faceStandAloneTwist = useCallback(
    async (playerId: string) => {
      if (!round || !roomId) {
        return;
      }

      const nextRound = await startStandAloneDefense({
        roundId: round.id,
        roomId,
        sessionId,
        roundNumber,
        playerId,
      });

      setRound(nextRound);
    },
    [roomId, round, roundNumber, sessionId],
  );

  const completeStandAlone = useCallback(
    async (playerId: string) => {
      if (!round || !roomId) {
        return;
      }

      const nextRound = await completeStandAloneDefense({
        roundId: round.id,
        roomId,
        sessionId,
        roundNumber,
        playerId,
      });

      setRound(nextRound);
    },
    [roomId, round, roundNumber, sessionId],
  );

  const submitStandAloneVerdict = useCallback(
    async ({ judgePlayerId, standAlonePlayerId, survived }: {
      judgePlayerId: string;
      standAlonePlayerId: string;
      survived: boolean;
    }) => {
      if (!round || !roomId) {
        return;
      }

      const nextRound = await resolveStandAloneVerdict({
        roundId: round.id,
        roomId,
        sessionId,
        roundNumber,
        judgePlayerId,
        standAlonePlayerId,
        survived,
      });

      setRound(nextRound);
    },
    [roomId, round, roundNumber, sessionId],
  );

  const lockNormalWinner = useCallback(
    async ({ judgePlayerId, winningPlayerId }: { judgePlayerId: string; winningPlayerId: string }) => {
      if (!round || !roomId) {
        return;
      }

      const nextRound = await lockJudgeWinner({
        roundId: round.id,
        roomId,
        sessionId,
        roundNumber,
        judgePlayerId,
        winningPlayerId,
      });

      setRound(nextRound);
    },
    [roomId, round, roundNumber, sessionId],
  );

  const startNoEscapeChallenge = useCallback(
    async (activePlayerIds: string[], currentPlayerId?: string | null) => {
      if (!round || !roomId) {
        return;
      }

      const nextRound = await startNoEscape({
        roundId: round.id,
        roomId,
        sessionId,
        roundNumber,
        activePlayerIds,
        currentPlayerId,
      });

      setRound(nextRound);
    },
    [roomId, round, roundNumber, sessionId],
  );

  const completeNoEscape = useCallback(
    async (noEscapePlayerId: string) => {
      if (!round || !roomId) {
        return;
      }

      const nextRound = await completeNoEscapeDefense({
        roundId: round.id,
        roomId,
        sessionId,
        roundNumber,
        noEscapePlayerId,
      });

      setRound(nextRound);
    },
    [roomId, round, roundNumber, sessionId],
  );

  const submitNoEscapeVerdict = useCallback(
    async ({ judgePlayerId, noEscapePlayerId, survived }: {
      judgePlayerId: string;
      noEscapePlayerId: string;
      survived: boolean;
    }) => {
      if (!round || !roomId) {
        return;
      }

      const nextRound = await resolveNoEscapeVerdict({
        roundId: round.id,
        roomId,
        sessionId,
        roundNumber,
        judgePlayerId,
        noEscapePlayerId,
        survived,
      });

      setRound(nextRound);
    },
    [roomId, round, roundNumber, sessionId],
  );

  return {
    round,
    phase: round?.phase ?? GAME_PHASES.RESPONSE_SELECTION,
    currentDefenderId,
    defenseStartedAt: round?.defense_started_at ?? null,
    standAloneDefenseStartedAt: round?.stand_alone_defense_started_at ?? null,
    noEscapeDefenseStartedAt: round?.no_escape_defense_started_at ?? null,
    hasNoEscapeTimerStarted,
    remainingSeconds,
    standAloneRemainingSeconds,
    noEscapeRemainingSeconds,
    isLoading,
    error,
    realtimeStatus,
    refresh,
    startCurrentDefense,
    completeCurrentDefense,
    resolveCallFold,
    faceStandAloneTwist,
    completeStandAlone,
    submitStandAloneVerdict,
    lockNormalWinner,
    startNoEscapeChallenge,
    completeNoEscape,
    submitNoEscapeVerdict,
  };
}
