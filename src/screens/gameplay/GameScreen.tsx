import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { PendingGameActionContext, PrimaryButton, SecondaryButton } from "../../components/game/Buttons";
import { FooterTagline } from "../../components/game/FooterTagline";
import { GameShell } from "../../components/game/GameShell";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import { RoomNotFound } from "../../components/onboarding/RoomNotFound";
import { GAME_PHASES } from "../../game/constants/phases";
import {
  createM01DemoStateFromRoom,
  isSelectedResponseHydrated,
  m01DemoReducer,
  type DemoState,
} from "../../game/demo/m01Demo";
import { useGameSession } from "../../hooks/useGameSession";
import { usePersistedGameBootstrap } from "../../hooks/usePersistedGameBootstrap";
import { usePersistedRound } from "../../hooks/usePersistedRound";
import { useRoundHands } from "../../hooks/useRoundHands";
import { useRoundDecisions } from "../../hooks/useRoundDecisions";
import { useRoundResponses } from "../../hooks/useRoundResponses";
import { describeSupabaseError } from "../../lib/supabaseDiagnostics";
import type { RoomState } from "../../room/types";
import { M01RoundExperience } from "../demo/M01DemoScreen";

export function GameScreen() {
  const { roomCode } = useParams();
  const { room, currentPlayer, isLoading, error } = usePersistedGameBootstrap(roomCode);

  if (isLoading) {
    return (
      <GameShell footer={<FooterTagline />}>
        <SectionHeadline eyebrow="Loading" title="Finding table" copy="Getting the room before starting local gameplay." />
      </GameShell>
    );
  }

  if (!room || room.code !== roomCode) {
    return (
      <GameShell footer={<FooterTagline />}>
        <RoomNotFound />
        {error ? <p className="form-error">{error}</p> : null}
      </GameShell>
    );
  }

  if (!currentPlayer) {
    return (
      <GameShell footer={<FooterTagline />}>
        <SectionHeadline
          eyebrow={`Table ${room.code}`}
          title="You're not in this room"
          copy="Join this table from this browser before entering gameplay."
        />
        <Link to="/join">
          <PrimaryButton>Return to Join →</PrimaryButton>
        </Link>
      </GameShell>
    );
  }

  if (room.status !== "IN_GAME" && room.status !== "FINISHED") {
    return <Navigate to={`/room/${room.code}`} replace />;
  }
  return <PersistedRoomGame key={room.persistedRoomId} room={room} />;
}

function PersistedRoomGame({ room }: { room: RoomState }) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(m01DemoReducer, room, createPersistedInitialState);
  const [responseLockError, setResponseLockError] = useState("");
  const [decisionLockError, setDecisionLockError] = useState("");
  const [judgeWinnerError, setJudgeWinnerError] = useState("");
  const [noEscapeError, setNoEscapeError] = useState("");
  const [nextRoundError, setNextRoundError] = useState("");
  const [scoreboardActionError, setScoreboardActionError] = useState("");
  const [scoreboardAction, setScoreboardAction] = useState<"PLAY_AGAIN" | "PACK" | "HOME" | null>(null);
  const completedDefenseKeys = useRef<Set<string>>(new Set());
  const completedResolutionKeys = useRef<Set<string>>(new Set());
  const completedStandAloneKeys = useRef<Set<string>>(new Set());
  const completedNoEscapeKeys = useRef<Set<string>>(new Set());
  const appliedScoreKeys = useRef<Set<string>>(new Set());
  const actionInFlight = useRef(false);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");
  async function runAction(action: () => unknown | Promise<unknown>) {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setActionPending(true);
    setActionError("");
    try {
      await action();
    } catch (caught) {
      console.error("NO FOLD table action failed", caught);
      setActionError("Could not sync the table. Try again.");
    } finally {
      actionInFlight.current = false;
      setActionPending(false);
    }
  }
  const gameSession = useGameSession({
    roomId: room.persistedRoomId,
    roomCode: room.code,
    players: room.players,
    initialJudgeId: room.judgeId,
  });
  const scoreByPlayerId = useMemo(
    () => Object.fromEntries(gameSession.scores.map((score) => [score.player_id, score.score])),
    [gameSession.scores],
  );
  const displayState = useMemo(
    () => ({
      ...state,
      players: state.players.map((player) => ({
        ...player,
        score: scoreByPlayerId[player.id] ?? player.score,
      })),
    }),
    [scoreByPlayerId, state],
  );
  const sessionId = gameSession.session?.id ?? null;
  const sessionRoundNumber = gameSession.session?.current_round ?? state.round.roundNumber;
  const sessionJudgeId = gameSession.currentRound?.judge_player_id ?? state.round.judgeId;
  const isCurrentRoundHydrated =
    Boolean(gameSession.currentRound) &&
    gameSession.currentRound?.session_id === sessionId &&
    gameSession.currentRound?.round_number === sessionRoundNumber;
  const sessionScenarioId = isCurrentRoundHydrated ? gameSession.currentRound?.scenario_id ?? null : null;
  const activePlayerIds = useMemo(
    () => room.players.filter((player) => player.id !== sessionJudgeId).map((player) => player.id),
    [room.players, sessionJudgeId],
  );
  const activePlayers = useMemo(
    () => room.players.filter((player) => player.id !== sessionJudgeId),
    [room.players, sessionJudgeId],
  );
  const viewerRoundState = state.round.playerStates[state.viewerId] ?? null;
  const renderedHandIds = useMemo(
    () => viewerRoundState?.hand.map((card) => card.id) ?? [],
    [viewerRoundState?.hand],
  );
  const roundHands = useRoundHands({
    sessionId,
    roomId: room.persistedRoomId,
    roundNumber: sessionRoundNumber,
    currentPlayerId: room.currentViewerId,
    isJudge: room.currentViewerId === sessionJudgeId,
    scenarioId: sessionScenarioId,
    activePlayers,
  });
  const persistedHandIds = roundHands.ownHand?.response_ids ?? [];
  const isPersistedHandHydrated =
    room.currentViewerId === sessionJudgeId ||
    state.round.phase !== GAME_PHASES.RESPONSE_SELECTION ||
    (
      Boolean(roundHands.ownHand) &&
      persistedHandIds.length > 0 &&
      renderedHandIds.length === persistedHandIds.length &&
      persistedHandIds.every((responseId) => renderedHandIds.includes(responseId))
    );
  const roundResponses = useRoundResponses({
    sessionId,
    roomId: room.persistedRoomId,
    roundNumber: sessionRoundNumber,
    currentPlayerId: room.currentViewerId,
    activePlayerIds,
  });
  const persistedRound = usePersistedRound({
    sessionId,
    roomId: room.persistedRoomId,
    roundNumber: sessionRoundNumber,
    judgePlayerId: sessionJudgeId,
    defenseOrder: activePlayerIds,
    shouldEnsureDefense: roundResponses.allResponsesLocked,
  });
  const roundDecisions = useRoundDecisions({
    sessionId,
    roomId: room.persistedRoomId,
    roundNumber: sessionRoundNumber,
    currentPlayerId: room.currentViewerId,
    activePlayerIds,
  });
  useEffect(() => {
    if (persistedRound.round?.scores_applied_at) setNextRoundError("");
  }, [persistedRound.round?.scores_applied_at]);

  useEffect(() => {
    if (!sessionJudgeId) {
      return;
    }

    dispatch({
      type: "SYNC_SESSION_CONTEXT",
      roundNumber: sessionRoundNumber,
      judgeId: sessionJudgeId,
      scenarioId: sessionScenarioId,
      scoresByPlayerId: scoreByPlayerId,
    });
  }, [scoreByPlayerId, sessionJudgeId, sessionRoundNumber, sessionScenarioId]);

  useEffect(() => {
    if (!roundHands.ownHand) {
      return;
    }

    dispatch({
      type: "SYNC_OWN_HAND",
      playerId: roundHands.ownHand.player_id,
      responseIds: roundHands.ownHand.response_ids,
    });
  }, [roundHands.ownHand]);

  useEffect(() => {
    if (!roundResponses.allResponsesLocked) {
      return;
    }

    console.info("NO FOLD all responses locked handoff snapshot", {
      roomId: room.persistedRoomId,
      roundNumber: state.round.roundNumber,
      persistedRoomPlayerIds: state.players.map((player) => player.id),
      judgePlayerId: state.round.judgeId,
      activePlayerIds,
      responseRowsCount: roundResponses.responses.length,
      responseRows: roundResponses.responses.map((response) => ({
        playerId: response.player_id,
        locked: Boolean(response.locked_at),
      })),
      allResponsesLocked: roundResponses.allResponsesLocked,
      gameRoundExists: Boolean(persistedRound.round),
      gameRoundId: persistedRound.round?.id ?? null,
      gameRoundPhase: persistedRound.round?.phase ?? null,
      defenseOrder: persistedRound.round?.defense_order ?? null,
      currentDefenderIndex: persistedRound.round?.current_defender_index ?? null,
      defenseStartedAt: persistedRound.round?.defense_started_at ?? null,
    });
  }, [
    activePlayerIds,
    persistedRound.round,
    room.persistedRoomId,
    roundResponses.allResponsesLocked,
    roundResponses.responses,
    state.players,
    state.round.judgeId,
    state.round.roundNumber,
  ]);

  useEffect(() => {
    dispatch({
      type: "SYNC_RESPONSE_LOCKS",
      lockedPlayerIds: roundResponses.lockedPlayerIds,
      ownResponse: roundResponses.ownResponse
        ? {
            playerId: roundResponses.ownResponse.player_id,
            selectedResponseId: roundResponses.ownResponse.selected_response_id,
          }
        : null,
    });
  }, [roundResponses.lockedPlayerIds, roundResponses.ownResponse]);

  useEffect(() => {
    dispatch({
      type: "SYNC_DECISION_LOCKS",
      lockedPlayerIds: roundDecisions.lockedPlayerIds,
      ownDecision: roundDecisions.ownDecision
        ? {
            playerId: roundDecisions.ownDecision.player_id,
            decision: roundDecisions.ownDecision.decision,
          }
        : null,
    });
  }, [roundDecisions.lockedPlayerIds, roundDecisions.ownDecision]);

  useEffect(() => {
    if (!persistedRound.round) {
      return;
    }

    const currentDefenderId = persistedRound.currentDefenderId;
    const standAlonePlayerId = persistedRound.round.stand_alone_player_id;
    const winningPlayerId = persistedRound.round.winning_player_id;
    const isRoundResult = persistedRound.round.phase === GAME_PHASES.ROUND_RESULT;
    const publicResponses = [
      ...(isRoundResult
        ? roundResponses.responses.map((response) => ({
            playerId: response.player_id,
            selectedResponseId: response.selected_response_id,
          }))
        : []),
      ...(roundResponses.ownResponse
        ? [
            {
              playerId: roundResponses.ownResponse.player_id,
              selectedResponseId: roundResponses.ownResponse.selected_response_id,
            },
          ]
        : []),
      ...(currentDefenderId
        ? roundResponses.responses
            .filter((response) => response.player_id === currentDefenderId)
            .map((response) => ({
              playerId: response.player_id,
              selectedResponseId: response.selected_response_id,
            }))
        : []),
      ...(standAlonePlayerId
        ? roundResponses.responses
            .filter((response) => response.player_id === standAlonePlayerId)
            .map((response) => ({
              playerId: response.player_id,
              selectedResponseId: response.selected_response_id,
            }))
        : []),
      ...(winningPlayerId
        ? roundResponses.responses
            .filter((response) => response.player_id === winningPlayerId)
            .map((response) => ({
              playerId: response.player_id,
              selectedResponseId: response.selected_response_id,
            }))
        : []),
    ];

    dispatch({
      type: "SYNC_PERSISTED_ROUND",
      phase: persistedRound.round.phase,
      scenarioId: persistedRound.round.scenario_id,
      defenseOrder: persistedRound.round.defense_order,
      currentDefenderIndex: persistedRound.round.current_defender_index,
      defenseStartedAtMs: persistedRound.defenseStartedAt
        ? new Date(persistedRound.defenseStartedAt).getTime()
        : null,
      standAloneDefenseStartedAtMs: persistedRound.standAloneDefenseStartedAt
        ? new Date(persistedRound.standAloneDefenseStartedAt).getTime()
        : null,
      noEscapeDefenseStartedAtMs: persistedRound.noEscapeDefenseStartedAt
        ? new Date(persistedRound.noEscapeDefenseStartedAt).getTime()
        : null,
      flow: persistedRound.round.flow,
      callerIds: persistedRound.round.caller_ids,
      standAlonePlayerId: persistedRound.round.stand_alone_player_id,
      activeTwistId: persistedRound.round.stand_alone_twist_id,
      noEscapePlayerId: persistedRound.round.no_escape_player_id,
      noEscapeScenarioId: persistedRound.round.no_escape_scenario_id,
      noEscapeResponseId: persistedRound.round.no_escape_response_id,
      verdict: persistedRound.round.verdict,
      verdictPlayerId: persistedRound.round.verdict_player_id,
      winningPlayerId: persistedRound.round.winning_player_id,
      publicResponses,
      decisions: roundDecisions.decisions.map((decision) => ({
        playerId: decision.player_id,
        decision: decision.decision,
      })),
    });
  }, [
    persistedRound.currentDefenderId,
    persistedRound.defenseStartedAt,
    persistedRound.noEscapeDefenseStartedAt,
    persistedRound.round,
    persistedRound.standAloneDefenseStartedAt,
    roundDecisions.decisions,
    roundResponses.ownResponse,
    roundResponses.responses,
  ]);

  useEffect(() => {
    if (persistedRound.phase !== GAME_PHASES.ROUND_RESULT || !persistedRound.round) {
      return;
    }

    const requiredResponsePlayerIds = [
      persistedRound.round.winning_player_id,
      persistedRound.round.stand_alone_player_id,
      persistedRound.round.no_escape_player_id,
      room.currentViewerId,
    ].filter((playerId): playerId is string => Boolean(playerId));
    const uniqueRequiredResponsePlayerIds = [...new Set(requiredResponsePlayerIds)];

    console.info("NO FOLD result hydration snapshot", {
      sessionCurrentRound: gameSession.session?.current_round ?? null,
      persistedRoundNumber: persistedRound.round.round_number,
      persistedRoundPhase: persistedRound.round.phase,
      persistedRoundFlow: persistedRound.round.flow,
      currentPlayerId: room.currentViewerId,
      judgePlayerId: persistedRound.round.judge_player_id,
      winningPlayerId: persistedRound.round.winning_player_id,
      standAlonePlayerId: persistedRound.round.stand_alone_player_id,
      noEscapePlayerId: persistedRound.round.no_escape_player_id,
      currentRoundResponseRows: roundResponses.responses.length,
      currentRoundDecisionRows: roundDecisions.decisions.length,
      requiredResultResponseHydrated: Object.fromEntries(
        uniqueRequiredResponsePlayerIds.map((playerId) => [
          playerId,
          isSelectedResponseHydrated(state, playerId),
        ]),
      ),
    });
  }, [
    gameSession.session?.current_round,
    persistedRound.phase,
    persistedRound.round,
    room.currentViewerId,
    roundDecisions.decisions.length,
    roundResponses.responses.length,
    state,
  ]);

  useEffect(() => {
    if (
      persistedRound.phase !== GAME_PHASES.ROUND_RESULT ||
      !persistedRound.round ||
      persistedRound.round.scores_applied_at
    ) {
      return;
    }

    const scoreKey = `${persistedRound.round.id}:scores`;

    if (appliedScoreKeys.current.has(scoreKey)) {
      return;
    }

    appliedScoreKeys.current.add(scoreKey);
    void gameSession.applyCurrentRoundScores(sessionRoundNumber).catch((caught) => {
      appliedScoreKeys.current.delete(scoreKey);
      console.error("NO FOLD persisted score application failed", {
        roomId: room.persistedRoomId,
        sessionId,
        roundNumber: sessionRoundNumber,
        roundId: persistedRound.round?.id,
        phase: persistedRound.round?.phase ?? null,
        flow: persistedRound.round?.flow ?? null,
        scoresAppliedAt: persistedRound.round?.scores_applied_at ?? null,
        error: caught,
        supabase: describeSupabaseError((caught as { cause?: unknown })?.cause ?? caught),
      });
    });
  }, [
    gameSession,
    persistedRound.phase,
    persistedRound.round,
    room.persistedRoomId,
    sessionRoundNumber,
  ]);

  useEffect(() => {
    if (
      persistedRound.phase !== GAME_PHASES.DEFENSE ||
      !persistedRound.round ||
      !persistedRound.defenseStartedAt ||
      persistedRound.remainingSeconds > 0 ||
      persistedRound.currentDefenderId !== room.currentViewerId
    ) {
      return;
    }

    const completionKey = `${persistedRound.round.id}:${persistedRound.round.current_defender_index}`;

    if (completedDefenseKeys.current.has(completionKey)) {
      return;
    }

    completedDefenseKeys.current.add(completionKey);
    void persistedRound.completeCurrentDefense().catch((caught) => {
      completedDefenseKeys.current.delete(completionKey);
      console.error(caught);
    });
  }, [
    persistedRound,
    persistedRound.currentDefenderId,
    persistedRound.defenseStartedAt,
    persistedRound.phase,
    persistedRound.remainingSeconds,
    persistedRound.round,
    room.currentViewerId,
  ]);

  useEffect(() => {
    if (persistedRound.phase === GAME_PHASES.NO_ESCAPE_DEFENSE) {
      console.info("NO FOLD No Escape completion guard", {
        phase: persistedRound.phase,
        noEscapePlayerId: persistedRound.round?.no_escape_player_id ?? null,
        currentPlayerId: room.currentViewerId,
        noEscapeDefenseStartedAt: persistedRound.noEscapeDefenseStartedAt,
        hasNoEscapeTimerStarted: persistedRound.hasNoEscapeTimerStarted,
        remainingSeconds: persistedRound.noEscapeRemainingSeconds,
        willComplete:
          Boolean(persistedRound.round) &&
          persistedRound.hasNoEscapeTimerStarted &&
          persistedRound.noEscapeRemainingSeconds === 0 &&
          persistedRound.round?.no_escape_player_id === room.currentViewerId,
      });
    }

    if (
      persistedRound.phase !== GAME_PHASES.NO_ESCAPE_DEFENSE ||
      !persistedRound.round ||
      !persistedRound.noEscapeDefenseStartedAt ||
      !persistedRound.hasNoEscapeTimerStarted ||
      persistedRound.noEscapeRemainingSeconds > 0 ||
      persistedRound.round.no_escape_player_id !== room.currentViewerId
    ) {
      return;
    }

    const completionKey = `${persistedRound.round.id}:no-escape`;

    if (completedNoEscapeKeys.current.has(completionKey)) {
      return;
    }

    completedNoEscapeKeys.current.add(completionKey);
    console.info("NO FOLD No Escape completion effect fired", {
      roomId: room.persistedRoomId,
      roundNumber: state.round.roundNumber,
      phase: persistedRound.phase,
      noEscapePlayerId: persistedRound.round.no_escape_player_id,
      currentPlayerId: room.currentViewerId,
      noEscapeDefenseStartedAt: persistedRound.noEscapeDefenseStartedAt,
      remainingSeconds: persistedRound.noEscapeRemainingSeconds,
    });
    void persistedRound.completeNoEscape(room.currentViewerId).catch((caught) => {
      completedNoEscapeKeys.current.delete(completionKey);
      console.error("NO FOLD persisted No Escape completion failed", {
        roomId: room.persistedRoomId,
        roundNumber: state.round.roundNumber,
        playerId: room.currentViewerId,
        error: caught,
      });
    });
  }, [
    persistedRound,
    persistedRound.hasNoEscapeTimerStarted,
    persistedRound.noEscapeDefenseStartedAt,
    persistedRound.noEscapeRemainingSeconds,
    persistedRound.phase,
    persistedRound.round,
    room.currentViewerId,
    room.persistedRoomId,
    state.round.roundNumber,
  ]);

  useEffect(() => {
    if (
      persistedRound.phase !== GAME_PHASES.CALL_FOLD ||
      !persistedRound.round ||
      !roundDecisions.allDecisionsLocked
    ) {
      return;
    }

    const resolutionKey = `${persistedRound.round.id}:${state.round.roundNumber}`;

    if (completedResolutionKeys.current.has(resolutionKey)) {
      return;
    }

    completedResolutionKeys.current.add(resolutionKey);
    void persistedRound.resolveCallFold(activePlayerIds, state.round.activeTwistId).catch((caught) => {
      completedResolutionKeys.current.delete(resolutionKey);
      console.error("NO FOLD persisted CALL/FOLD resolution failed", {
        roomId: room.persistedRoomId,
        roundNumber: state.round.roundNumber,
        activePlayerIds,
        error: caught,
      });
    });
  }, [
    activePlayerIds,
    persistedRound,
    persistedRound.phase,
    persistedRound.round,
    room.persistedRoomId,
    roundDecisions.allDecisionsLocked,
    state.round.activeTwistId,
    state.round.roundNumber,
  ]);

  useEffect(() => {
    if (
      persistedRound.phase !== GAME_PHASES.STAND_ALONE_DEFENSE ||
      !persistedRound.round ||
      !persistedRound.standAloneDefenseStartedAt ||
      persistedRound.standAloneRemainingSeconds > 0 ||
      persistedRound.round.stand_alone_player_id !== room.currentViewerId
    ) {
      return;
    }

    const completionKey = `${persistedRound.round.id}:stand-alone`;

    if (completedStandAloneKeys.current.has(completionKey)) {
      return;
    }

    completedStandAloneKeys.current.add(completionKey);
    void persistedRound.completeStandAlone(room.currentViewerId).catch((caught) => {
      completedStandAloneKeys.current.delete(completionKey);
      console.error("NO FOLD persisted Stand Alone completion failed", {
        roomId: room.persistedRoomId,
        roundNumber: state.round.roundNumber,
        playerId: room.currentViewerId,
        error: caught,
      });
    });
  }, [
    persistedRound,
    persistedRound.phase,
    persistedRound.round,
    persistedRound.standAloneDefenseStartedAt,
    persistedRound.standAloneRemainingSeconds,
    room.currentViewerId,
    room.persistedRoomId,
    state.round.roundNumber,
  ]);

  async function lockSharedResponse() {
    const selectedResponseId = state.round.playerStates[state.viewerId]?.selectedResponseId;
    const ownHandResponseIds = roundHands.ownHand?.response_ids ?? [];

    if (!selectedResponseId) {
      setResponseLockError("Pick a response before locking.");
      return;
    }

    if (ownHandResponseIds.length > 0 && !ownHandResponseIds.includes(selectedResponseId)) {
      console.error("NO FOLD persisted hand selection mismatch", {
        sessionId,
        roundNumber: sessionRoundNumber,
        playerId: room.currentViewerId,
        persistedHandResponseIds: ownHandResponseIds,
        renderedResponseIds: renderedHandIds,
        selectedResponseId,
        selectedInPersistedHand: ownHandResponseIds.includes(selectedResponseId),
      });
      setResponseLockError("Pick a response from your dealt hand.");
      return;
    }

    if (!room.persistedRoomId || !room.currentViewerId) {
      setResponseLockError("Could not lock response. Room identity is missing.");
      return;
    }

    try {
      setResponseLockError("");
      console.info("NO FOLD persisted LOCK RESPONSE attempt", {
        roomId: room.persistedRoomId,
        roomIdType: typeof room.persistedRoomId,
        roundNumber: state.round.roundNumber,
        roundNumberType: typeof state.round.roundNumber,
        playerId: room.currentViewerId,
        playerIdType: typeof room.currentViewerId,
        selectedResponseId,
        selectedResponseIdType: typeof selectedResponseId,
      });
      await roundResponses.lockCurrentPlayerResponse(selectedResponseId);
    } catch (caught) {
      console.error("NO FOLD persisted LOCK RESPONSE failed", {
        roomId: room.persistedRoomId,
        roundNumber: state.round.roundNumber,
        playerId: room.currentViewerId,
        selectedResponseId,
        error: caught instanceof Error ? caught.message : String(caught),
        supabase: describeSupabaseError((caught as { cause?: unknown })?.cause ?? caught),
      });
      setResponseLockError("Could not lock response. Try again.");
    }
  }

  async function lockSharedDecision(decision: "CALL" | "FOLD") {
    if (!room.persistedRoomId || !room.currentViewerId) {
      setDecisionLockError("Could not lock decision. Room identity is missing.");
      return;
    }

    try {
      setDecisionLockError("");
      await roundDecisions.lockCurrentPlayerDecision(decision);
    } catch (caught) {
      console.error("NO FOLD persisted CALL/FOLD decision failed", {
        roomId: room.persistedRoomId,
        roundNumber: state.round.roundNumber,
        playerId: room.currentViewerId,
        decision,
        error: caught instanceof Error ? caught.message : String(caught),
        supabase: describeSupabaseError((caught as { cause?: unknown })?.cause ?? caught),
      });
      setDecisionLockError("Could not lock decision. Try again.");
    }
  }

  function faceSharedStandAloneTwist() {
    if (persistedRound.round?.stand_alone_player_id !== room.currentViewerId) {
      return;
    }

    return persistedRound.faceStandAloneTwist(room.currentViewerId).catch((caught) => {
      console.error("NO FOLD persisted Stand Alone twist start failed", {
        roomId: room.persistedRoomId,
        roundNumber: state.round.roundNumber,
        playerId: room.currentViewerId,
        error: caught,
      });
    });
  }

  function completeSharedStandAloneDefense() {
    if (
      persistedRound.round?.stand_alone_player_id !== room.currentViewerId ||
      persistedRound.standAloneRemainingSeconds > 0
    ) {
      return;
    }

    void persistedRound.completeStandAlone(room.currentViewerId).catch((caught) => {
      console.error("NO FOLD persisted Stand Alone defense completion failed", {
        roomId: room.persistedRoomId,
        roundNumber: state.round.roundNumber,
        playerId: room.currentViewerId,
        error: caught,
      });
    });
  }

  function submitSharedStandAloneVerdict(survived: boolean) {
    const standAlonePlayerId = persistedRound.round?.stand_alone_player_id;

    if (!standAlonePlayerId || state.round.judgeId !== room.currentViewerId) {
      return;
    }

    return persistedRound
      .submitStandAloneVerdict({
        judgePlayerId: room.currentViewerId,
        standAlonePlayerId,
        survived,
      })
      .catch((caught) => {
        console.error("NO FOLD persisted Stand Alone verdict failed", {
          roomId: room.persistedRoomId,
          roundNumber: state.round.roundNumber,
          judgePlayerId: room.currentViewerId,
          standAlonePlayerId,
          survived,
          error: caught,
        });
      });
  }

  function lockSharedJudgeWinner(winningPlayerId: string | null) {
    if (!winningPlayerId) {
      setJudgeWinnerError("Choose a winner first.");
      return;
    }

    if (state.round.judgeId !== room.currentViewerId) {
      setJudgeWinnerError("Only the Judge can lock the winner.");
      return;
    }

    return persistedRound
      .lockNormalWinner({
        judgePlayerId: room.currentViewerId,
        winningPlayerId,
      })
      .then(() => setJudgeWinnerError(""))
      .catch((caught) => {
        console.error("NO FOLD persisted Judge winner failed", {
          roomId: room.persistedRoomId,
          roundNumber: state.round.roundNumber,
          judgePlayerId: room.currentViewerId,
          winningPlayerId,
          error: caught,
          supabase: describeSupabaseError((caught as { cause?: unknown })?.cause ?? caught),
        });
        setJudgeWinnerError("Could not lock winner. Try again.");
      });
  }

  function startSharedNoEscape() {
    if (state.round.judgeId === room.currentViewerId) {
      return;
    }

    setNoEscapeError("");
    return persistedRound.startNoEscapeChallenge(activePlayerIds, room.currentViewerId).catch((caught) => {
      console.error("NO FOLD persisted No Escape start failed", {
        roomId: room.persistedRoomId,
        roundNumber: state.round.roundNumber,
        activePlayerIds,
        playerId: room.currentViewerId,
        error: caught,
        supabase: describeSupabaseError((caught as { cause?: unknown })?.cause ?? caught),
      });
      setNoEscapeError("Could not start No Escape. Try again.");
    });
  }

  function completeSharedNoEscapeDefense() {
    if (
      persistedRound.round?.no_escape_player_id !== room.currentViewerId ||
      !persistedRound.hasNoEscapeTimerStarted ||
      !persistedRound.noEscapeDefenseStartedAt ||
      persistedRound.noEscapeRemainingSeconds > 0
    ) {
      return;
    }

    void persistedRound.completeNoEscape(room.currentViewerId).catch((caught) => {
      console.error("NO FOLD persisted No Escape defense completion failed", {
        roomId: room.persistedRoomId,
        roundNumber: state.round.roundNumber,
        playerId: room.currentViewerId,
        error: caught,
      });
    });
  }

  function submitSharedNoEscapeVerdict(survived: boolean) {
    const noEscapePlayerId = persistedRound.round?.no_escape_player_id;

    if (!noEscapePlayerId || state.round.judgeId !== room.currentViewerId) {
      return;
    }

    return persistedRound
      .submitNoEscapeVerdict({
        judgePlayerId: room.currentViewerId,
        noEscapePlayerId,
        survived,
      })
      .catch((caught) => {
        console.error("NO FOLD persisted No Escape verdict failed", {
          roomId: room.persistedRoomId,
          roundNumber: state.round.roundNumber,
          judgePlayerId: room.currentViewerId,
          noEscapePlayerId,
          survived,
          error: caught,
          supabase: describeSupabaseError((caught as { cause?: unknown })?.cause ?? caught),
        });
        setNoEscapeError("Could not submit No Escape verdict. Try again.");
      });
  }

  function advanceSharedRound() {
    if (!persistedRound.round) {
      setNextRoundError("Round result is still loading.");
      return;
    }

    if (persistedRound.round.judge_player_id !== room.currentViewerId) {
      setNextRoundError("Waiting for the Judge to start the next round.");
      return;
    }

    if (!persistedRound.round.scores_applied_at) {
      setNextRoundError("Applying scores. Try again in a moment.");
      return gameSession.applyCurrentRoundScores(sessionRoundNumber).catch((caught) => {
        console.error("NO FOLD score application before next round failed", {
          roomId: room.persistedRoomId,
          sessionId,
          roundNumber: sessionRoundNumber,
          roundId: persistedRound.round?.id,
          phase: persistedRound.round?.phase ?? null,
          flow: persistedRound.round?.flow ?? null,
          scoresAppliedAt: persistedRound.round?.scores_applied_at ?? null,
          error: caught,
          supabase: describeSupabaseError((caught as { cause?: unknown })?.cause ?? caught),
        });
      });
    }

    setNextRoundError("");
    return gameSession.advanceRound(sessionRoundNumber, room.currentViewerId).catch((caught) => {
      console.error("NO FOLD advance round failed", {
        roomId: room.persistedRoomId,
        roundNumber: sessionRoundNumber,
        judgePlayerId: room.currentViewerId,
        error: caught,
        supabase: describeSupabaseError((caught as { cause?: unknown })?.cause ?? caught),
      });
      setNextRoundError("Could not start the next round. Try again.");
    });
  }

  if (!gameSession.isFinished && !isPersistedHandHydrated) {
    return (
      <div className="game-route">
        {import.meta.env.DEV ? (
          <aside className="game-route-dev-controls" aria-label="Game test navigation">
            <strong>Test Navigation</strong>
            <Link to={`/room/${room.code}`}>
              <PrimaryButton>Back to Table</PrimaryButton>
            </Link>
            <span>dealing hand</span>
          </aside>
        ) : null}
        <GameShell footer={<FooterTagline />}>
          <SectionHeadline eyebrow="Dealing" title="Dealing your hand" copy="Syncing your private response cards." />
          {roundHands.error ? <p className="form-error">{roundHands.error}</p> : null}
          {roundHands.error ? (
            <PrimaryButton disabled={roundHands.isEnsuring} onClick={() => void roundHands.refresh()}>
              Try Again
            </PrimaryButton>
          ) : null}
        </GameShell>
      </div>
    );
  }

  function playAgain() {
    if (!room.currentViewerId) {
      setScoreboardActionError("Join this room before replaying.");
      return;
    }

    setScoreboardAction("PLAY_AGAIN");
    setScoreboardActionError("");
    return gameSession.restart(room.currentViewerId)
      .catch((caught) => {
        console.error("NO FOLD restart session failed", {
          roomId: room.persistedRoomId,
          currentPlayerId: room.currentViewerId,
          error: caught,
          supabase: describeSupabaseError((caught as { cause?: unknown })?.cause ?? caught),
        });
        setScoreboardActionError("Could not sync the table. Try again.");
      })
      .finally(() => setScoreboardAction(null));
  }

  function tryAnotherPack() {
    if (!room.currentViewerId || !room.hostPlayerId) {
      setScoreboardActionError("Host identity is still loading.");
      return;
    }

    setScoreboardAction("PACK");
    setScoreboardActionError("");
    return gameSession.chooseAnotherPack(room.currentViewerId, room.hostPlayerId)
      .then(() => navigate(`/room/${room.code}`))
      .catch((caught) => {
        console.error("NO FOLD return to pack selection failed", {
          roomId: room.persistedRoomId,
          currentPlayerId: room.currentViewerId,
          hostPlayerId: room.hostPlayerId,
          error: caught,
          supabase: describeSupabaseError((caught as { cause?: unknown })?.cause ?? caught),
        });
        setScoreboardActionError("Could not sync the table. Try again.");
      })
      .finally(() => setScoreboardAction(null));
  }

  const isCanonicalRoundHydrating = gameSession.isLoading || (gameSession.session?.status === "ACTIVE" && !gameSession.currentRound);

  if (isCanonicalRoundHydrating) {
    return (
      <div className="game-route">
        <GameShell footer={<FooterTagline />}>
          <SectionHeadline eyebrow="Loading" title="Setting the round" copy="Syncing the table scenario." />
        </GameShell>
      </div>
    );
  }

  if (gameSession.isFinished) {
    return (
      <div className="game-route">
        {import.meta.env.DEV ? (
          <aside className="game-route-dev-controls" aria-label="Game test navigation">
            <strong>Test Navigation</strong>
            <Link to={`/room/${room.code}`}>
              <PrimaryButton>Back to Table</PrimaryButton>
            </Link>
            <span>session {gameSession.realtimeStatus.toLowerCase()}</span>
          </aside>
        ) : null}
        <FinalScoreboard
          players={state.players}
          scoresByPlayerId={scoreByPlayerId}
          totalRounds={gameSession.session?.total_rounds ?? 8}
          canPlayAgain={gameSession.currentRound?.judge_player_id === room.currentViewerId}
          canChoosePack={room.hostPlayerId === room.currentViewerId}
          actionInFlight={scoreboardAction}
          error={scoreboardActionError}
          onPlayAgain={() => void runAction(playAgain)}
          onChoosePack={() => void runAction(tryAnotherPack)}
          onBackHome={() => navigate("/")}
        />
      </div>
    );
  }

  return (
    <div className="game-route">
      {import.meta.env.DEV ? (
        <aside className="game-route-dev-controls" aria-label="Game test navigation">
          <strong>Test Navigation</strong>
          <Link to={`/room/${room.code}`}>
            <PrimaryButton>Back to Table</PrimaryButton>
          </Link>
          <span>responses {roundResponses.realtimeStatus.toLowerCase()}</span>
          <span>decisions {roundDecisions.realtimeStatus.toLowerCase()}</span>
        </aside>
      ) : null}
      <PendingGameActionContext.Provider value={actionPending}>
      {actionError ? <p className="form-error" role="alert">{actionError}</p> : null}
      <M01RoundExperience
        key={`${sessionId}:${sessionRoundNumber}`}
        state={displayState}
        dispatch={dispatch}
        onPersistedLockResponse={() => void runAction(lockSharedResponse)}
        onPersistedStartDefense={() => {
          if (persistedRound.currentDefenderId === room.currentViewerId) {
            void runAction(persistedRound.startCurrentDefense);
          }
        }}
        onPersistedCompleteDefense={() => {
          if (persistedRound.currentDefenderId === room.currentViewerId && persistedRound.remainingSeconds === 0) {
            void persistedRound.completeCurrentDefense().catch((caught) => console.error(caught));
          }
        }}
        onPersistedLockDecision={(decision) => void runAction(() => lockSharedDecision(decision))}
        onPersistedFaceStandAloneTwist={() => void runAction(faceSharedStandAloneTwist)}
        onPersistedCompleteStandAloneDefense={completeSharedStandAloneDefense}
        onPersistedStandAloneVerdict={(survived) => void runAction(() => submitSharedStandAloneVerdict(survived))}
        onPersistedLockJudgeWinner={(winner) => void runAction(() => lockSharedJudgeWinner(winner))}
        onPersistedStartNoEscape={() => void runAction(startSharedNoEscape)}
        onPersistedCompleteNoEscapeDefense={completeSharedNoEscapeDefense}
        onPersistedNoEscapeVerdict={(survived) => void runAction(() => submitSharedNoEscapeVerdict(survived))}
        onPersistedNextRound={() => void runAction(advanceSharedRound)}
        hasPersistedNoEscapeTimerStarted={persistedRound.hasNoEscapeTimerStarted}
        responseLockError={responseLockError || roundHands.error || roundResponses.error || persistedRound.error}
        decisionLockError={decisionLockError || roundDecisions.error}
        judgeWinnerError={judgeWinnerError}
        noEscapeError={noEscapeError}
        resultError={nextRoundError || gameSession.error}
      />
      </PendingGameActionContext.Provider>
    </div>
  );
}

function createPersistedInitialState(room: RoomState): DemoState {
  return createM01DemoStateFromRoom(room);
}

function FinalScoreboard({
  players,
  scoresByPlayerId,
  totalRounds,
  canPlayAgain,
  canChoosePack,
  actionInFlight,
  error,
  onPlayAgain,
  onChoosePack,
  onBackHome,
}: {
  players: DemoState["players"];
  scoresByPlayerId: Record<string, number>;
  totalRounds: number;
  canPlayAgain: boolean;
  canChoosePack: boolean;
  actionInFlight: "PLAY_AGAIN" | "PACK" | "HOME" | null;
  error: string;
  onPlayAgain: () => void;
  onChoosePack: () => void;
  onBackHome: () => void;
}) {
  const rows = [...players]
    .map((player) => ({ ...player, score: scoresByPlayerId[player.id] ?? player.score }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
  const topScore = rows[0]?.score ?? 0;
  const winners = rows.filter((row) => row.score === topScore);

  return (
    <GameShell footer={<FooterTagline />}>
      <div className="normal-result-state is-judge">
        <section className="normal-result-copy" aria-labelledby="final-scoreboard-title">
          <h1 id="final-scoreboard-title">Game over</h1>
          <span className="red-rule" aria-hidden="true" />
          <p>{totalRounds} rounds played.</p>
          <p className="judge-deciding-subcopy">
            Winner: {winners.map((winner) => winner.name).join(" & ") || "No winner yet"}
          </p>
        </section>

        <section className="judge-pick-options" aria-label="Final scores">
          {rows.map((player, index) => (
            <article key={player.id} className="judge-pick-option">
              <span className="judge-pick-name">{index + 1}. {player.name}</span>
              <button type="button" className="judge-pick-card" disabled>
                <strong>{player.score}</strong>
              </button>
            </article>
          ))}
        </section>

        <section className="normal-result-actions" aria-label="Final scoreboard actions">
          <PrimaryButton disabled={!canPlayAgain || Boolean(actionInFlight)} onClick={onPlayAgain}>
            {actionInFlight === "PLAY_AGAIN" ? "Starting..." : "Play Again →"}
          </PrimaryButton>
          <SecondaryButton disabled={!canChoosePack || Boolean(actionInFlight)} onClick={onChoosePack}>
            {actionInFlight === "PACK" ? "Opening packs..." : "Try Another Pack"}
          </SecondaryButton>
          <button
            type="button"
            className="game-button scoreboard-tertiary-action"
            disabled={Boolean(actionInFlight)}
            onClick={onBackHome}
          >
            Back to Home
          </button>
          {!canPlayAgain ? <p className="judge-deciding-subcopy">Waiting for the final Judge to start a replay.</p> : null}
          {!canChoosePack ? <p className="judge-deciding-subcopy">Only the host can choose another pack.</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </section>
      </div>
    </GameShell>
  );
}
