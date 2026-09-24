import { GAME_PHASES, type GamePhase } from "../constants/phases";
import { createRound } from "../engine/createRound";
import { resolveCallFoldDecisions, type CallFoldOutcome } from "../engine/resolveCallFold";
import {
  applyScoreDelta,
  scoreCallFoldResult,
  scoreEverybodyFolds,
  scoreStandAlone,
} from "../engine/scoring";
import { SCORING } from "../constants/scoring";
import type { ResponseCard, Scenario, Twist } from "../types/content";
import type { RoundState } from "../types/game";
import type { Player } from "../types/player";
import { tableTroubleScenarios } from "../../data/packs/table-trouble";
import type { RoomState } from "../../room/types";

export type DemoFlow = "NORMAL" | "STAND_ALONE" | "COWARD";
export type DemoViewRole = "PLAYER" | "JUDGE";

export interface DemoResult {
  title: string;
  delta: number;
  copy: string;
}

export interface DemoState {
  players: Player[];
  round: RoundState;
  scenario: Scenario;
  noEscapeScenario: Scenario;
  viewerId: string;
  flow: DemoFlow;
  defenseStartedAtMs: number | null;
  standAloneDefenseStartedAtMs: number | null;
  noEscapeDefenseStartedAtMs: number | null;
  outcome: CallFoldOutcome | null;
  selectedJudgeWinnerId: string | null;
  resultByPlayerId: Record<string, DemoResult>;
}

export type DemoAction =
  | { type: "VIEW_AS"; playerId: string }
  | { type: "RESET"; flow: DemoFlow }
  | {
      type: "SYNC_SESSION_CONTEXT";
      roundNumber: number;
      judgeId: string;
      scenarioId: string | null;
      scoresByPlayerId: Record<string, number>;
    }
  | { type: "SELECT_RESPONSE"; responseId: string }
  | { type: "SYNC_OWN_HAND"; playerId: string; responseIds: string[] }
  | { type: "LOCK_RESPONSE" }
  | {
      type: "SYNC_RESPONSE_LOCKS";
      lockedPlayerIds: string[];
      ownResponse?: { playerId: string; selectedResponseId: string | null } | null;
    }
  | {
      type: "SYNC_PERSISTED_ROUND";
      phase: GamePhase;
      defenseOrder: string[];
      currentDefenderIndex: number;
      defenseStartedAtMs: number | null;
      standAloneDefenseStartedAtMs?: number | null;
      noEscapeDefenseStartedAtMs?: number | null;
      callerIds?: string[] | null;
      standAlonePlayerId?: string | null;
      noEscapePlayerId?: string | null;
      noEscapeScenarioId?: string | null;
      noEscapeResponseId?: string | null;
      scenarioId?: string | null;
      activeTwistId?: string | null;
      flow?: DemoFlow | null;
      verdict?: "SURVIVED" | "CAUGHT" | null;
      verdictPlayerId?: string | null;
      winningPlayerId?: string | null;
      publicResponses?: Array<{ playerId: string; selectedResponseId: string | null }>;
      decisions?: Array<{ playerId: string; decision: "CALL" | "FOLD" }>;
    }
  | {
      type: "SYNC_DECISION_LOCKS";
      lockedPlayerIds: string[];
      ownDecision?: { playerId: string; decision: "CALL" | "FOLD" } | null;
    }
  | { type: "START_DEFENSE"; startedAtMs: number }
  | { type: "COMPLETE_DEFENSE" }
  | { type: "LOCK_CALL_FOLD"; decision: "CALL" | "FOLD" }
  | { type: "FACE_STAND_ALONE_TWIST" }
  | { type: "COMPLETE_STAND_ALONE_DEFENSE" }
  | { type: "RESOLVE_STAND_ALONE_VERDICT"; survived: boolean }
  | { type: "SELECT_JUDGE_WINNER"; playerId: string }
  | { type: "LOCK_JUDGE_WINNER" }
  | { type: "START_NO_ESCAPE" }
  | { type: "COMPLETE_NO_ESCAPE_DEFENSE" }
  | { type: "RESOLVE_NO_ESCAPE_VERDICT"; survived: boolean };

export const DEMO_PLAYERS: Player[] = [
  { id: "timi", name: "Timi", score: 0, isHost: true },
  { id: "ada", name: "Ada", score: 0, isHost: false },
  { id: "zara", name: "Zara", score: 0, isHost: false },
  { id: "miko", name: "Miko", score: 0, isHost: false },
];

const JUDGE_ID = "ada";

interface CreateM01DemoStateOptions {
  players?: Player[];
  judgeId?: string;
  viewerId?: string;
  roundNumber?: number;
}

export function createM01DemoState(
  flow: DemoFlow = "NORMAL",
  options: CreateM01DemoStateOptions = {},
): DemoState {
  const scenario = tableTroubleScenarios[0];
  const players = options.players ?? DEMO_PLAYERS;
  const judgeId = options.judgeId ?? JUDGE_ID;
  const round = createRound({
    roundNumber: options.roundNumber ?? 1,
    judgeId,
    players,
    scenario,
  });
  const fallbackViewerId =
    players.find((player) => player.id !== judgeId)?.id ?? players[0]?.id ?? DEMO_PLAYERS[0].id;

  return {
    players,
    round: {
      ...round,
      phase: GAME_PHASES.RESPONSE_SELECTION,
      playerStates: assignDemoResponses(round, scenario),
    },
    scenario,
    noEscapeScenario: tableTroubleScenarios[1],
    viewerId: options.viewerId ?? fallbackViewerId,
    flow,
    defenseStartedAtMs: null,
    standAloneDefenseStartedAtMs: null,
    noEscapeDefenseStartedAtMs: null,
    outcome: null,
    selectedJudgeWinnerId: null,
    resultByPlayerId: {},
  };
}

export function createM01DemoStateFromRoom(room: RoomState): DemoState {
  const players = room.players.map((player) => ({
    id: player.id,
    name: player.name,
    score: 0,
    isHost: player.isHost,
  }));

  return createM01DemoState("NORMAL", {
    players,
    judgeId: room.judgeId ?? players[0]?.id,
    viewerId: room.currentViewerId || players[0]?.id,
    roundNumber: room.roundNumber,
  });
}

export function m01DemoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "VIEW_AS":
      return { ...state, viewerId: action.playerId };
    case "RESET":
      return createM01DemoState(action.flow);
    case "SYNC_SESSION_CONTEXT":
      return syncSessionContext(state, action);
    case "SELECT_RESPONSE":
      return updateViewerRoundState(state, {
        selectedResponseId: action.responseId,
      });
    case "SYNC_OWN_HAND":
      return syncOwnHand(state, action.playerId, action.responseIds);
    case "LOCK_RESPONSE":
      return {
        ...state,
        defenseStartedAtMs: null,
        round: {
          ...state.round,
          phase: GAME_PHASES.DEFENSE,
          playerStates: lockAllDemoResponses(state),
        },
      };
    case "SYNC_RESPONSE_LOCKS":
      return syncResponseLocks(state, action.lockedPlayerIds, action.ownResponse);
    case "SYNC_PERSISTED_ROUND":
      return syncPersistedRound(state, action);
    case "SYNC_DECISION_LOCKS":
      return syncDecisionLocks(state, action.lockedPlayerIds, action.ownDecision);
    case "START_DEFENSE":
      return { ...state, defenseStartedAtMs: state.defenseStartedAtMs ?? action.startedAtMs };
    case "COMPLETE_DEFENSE":
      return {
        ...state,
        round: { ...state.round, phase: GAME_PHASES.CALL_FOLD },
      };
    case "LOCK_CALL_FOLD":
      return resolveDemoCallFold(state, action.decision);
    case "FACE_STAND_ALONE_TWIST":
      return {
        ...state,
        standAloneDefenseStartedAtMs: Date.now(),
        round: { ...state.round, phase: GAME_PHASES.STAND_ALONE_DEFENSE },
      };
    case "COMPLETE_STAND_ALONE_DEFENSE":
      return { ...state, round: { ...state.round, phase: GAME_PHASES.STAND_ALONE_VERDICT } };
    case "RESOLVE_STAND_ALONE_VERDICT":
      return resolveStandAloneVerdict(state, action.survived);
    case "SELECT_JUDGE_WINNER":
      return { ...state, selectedJudgeWinnerId: action.playerId };
    case "LOCK_JUDGE_WINNER":
      return lockJudgeWinner(state);
    case "START_NO_ESCAPE":
      return {
        ...state,
        noEscapeDefenseStartedAtMs: state.noEscapeDefenseStartedAtMs ?? Date.now(),
        round: { ...state.round, phase: GAME_PHASES.NO_ESCAPE_DEFENSE },
      };
    case "COMPLETE_NO_ESCAPE_DEFENSE":
      return { ...state, round: { ...state.round, phase: GAME_PHASES.NO_ESCAPE_VERDICT } };
    case "RESOLVE_NO_ESCAPE_VERDICT":
      return resolveNoEscapeVerdict(state, action.survived);
    default:
      return state;
  }
}

function syncPersistedRound(
  state: DemoState,
  action: Extract<DemoAction, { type: "SYNC_PERSISTED_ROUND" }>,
): DemoState {
  const publicResponseMap = new Map(
    (action.publicResponses ?? []).map((response) => [response.playerId, response.selectedResponseId]),
  );
  const nextNoEscapeScenario =
    tableTroubleScenarios.find((scenario) => scenario.id === action.noEscapeScenarioId) ??
    state.noEscapeScenario;
  const noEscapeResponse = nextNoEscapeScenario.responses.find(
    (response) => response.id === action.noEscapeResponseId,
  );
  const nextScenario =
    tableTroubleScenarios.find((scenario) => scenario.id === action.scenarioId) ??
    state.scenario;
  const responseCatalog = new Map(
    [...nextScenario.responses, ...nextNoEscapeScenario.responses].map((response) => [response.id, response]),
  );

  return {
    ...state,
    flow: action.flow ?? state.flow,
    scenario: nextScenario,
    noEscapeScenario: nextNoEscapeScenario,
    defenseStartedAtMs: action.defenseStartedAtMs,
    standAloneDefenseStartedAtMs:
      action.standAloneDefenseStartedAtMs === undefined
        ? state.standAloneDefenseStartedAtMs
        : action.standAloneDefenseStartedAtMs,
    noEscapeDefenseStartedAtMs:
      action.noEscapeDefenseStartedAtMs === undefined
        ? state.noEscapeDefenseStartedAtMs
        : action.noEscapeDefenseStartedAtMs,
    resultByPlayerId: buildPersistedResultByPlayerId(state, action),
    round: {
      ...state.round,
      scenarioId: nextScenario.id,
      phase: action.phase,
      defenseOrder: action.defenseOrder,
      currentDefenderIndex: action.currentDefenderIndex,
      winningPlayerId: action.winningPlayerId ?? state.round.winningPlayerId,
      standAlonePlayerId: action.standAlonePlayerId ?? state.round.standAlonePlayerId,
      noEscapePlayerId: action.noEscapePlayerId ?? state.round.noEscapePlayerId,
      activeTwistId: action.activeTwistId ?? state.round.activeTwistId,
      playerStates: Object.fromEntries(
        Object.entries(state.round.playerStates).map(([playerId, playerState]) => {
          const publicResponseId = publicResponseMap.get(playerId) ?? null;
          const publicResponse = publicResponseId ? responseCatalog.get(publicResponseId) : null;
          const noEscapeCard =
            action.noEscapePlayerId === playerId && noEscapeResponse ? noEscapeResponse : null;
          const cardsToEnsure = [publicResponse, noEscapeCard].filter(
            (card): card is ResponseCard => Boolean(card),
          );
          const nextHand = cardsToEnsure.reduce(
            (hand, card) =>
              hand.some((existingCard) => existingCard.id === card.id)
                ? hand
                : [card, ...hand],
            playerState.hand,
          );

          return [
            playerId,
            {
              ...playerState,
              selectedResponseId: publicResponseMap.has(playerId)
                ? publicResponseMap.get(playerId) ?? playerState.selectedResponseId
                : action.noEscapePlayerId === playerId && action.noEscapeResponseId
                  ? action.noEscapeResponseId
                  : playerState.selectedResponseId,
              hand: nextHand,
              decision: action.callerIds
                ? action.callerIds.includes(playerId)
                  ? "CALL"
                  : playerState.decision
                    ? playerState.decision
                    : "FOLD"
                : playerState.decision,
            },
          ];
        }),
      ),
    },
  };
}

function syncSessionContext(
  state: DemoState,
  action: Extract<DemoAction, { type: "SYNC_SESSION_CONTEXT" }>,
): DemoState {
  const scenario =
    tableTroubleScenarios.find((candidate) => candidate.id === action.scenarioId) ??
    state.scenario;
  const players = state.players.map((player) => ({
    ...player,
    score: action.scoresByPlayerId[player.id] ?? player.score,
  }));
  const sameRound =
    state.round.roundNumber === action.roundNumber &&
    state.round.judgeId === action.judgeId &&
    state.round.scenarioId === scenario.id;

  if (sameRound) {
    return { ...state, players, scenario };
  }

  const round = createRound({
    roundNumber: action.roundNumber,
    judgeId: action.judgeId,
    players,
    scenario,
  });

  return {
    ...state,
    players,
    scenario,
    flow: "NORMAL",
    defenseStartedAtMs: null,
    standAloneDefenseStartedAtMs: null,
    noEscapeDefenseStartedAtMs: null,
    outcome: null,
    selectedJudgeWinnerId: null,
    resultByPlayerId: {},
    round: {
      ...round,
      phase: GAME_PHASES.RESPONSE_SELECTION,
      playerStates: assignDemoResponses(round, scenario),
    },
  };
}

function buildPersistedResultByPlayerId(
  state: DemoState,
  action: Extract<DemoAction, { type: "SYNC_PERSISTED_ROUND" }>,
) {
  if (
    action.phase === GAME_PHASES.ROUND_RESULT &&
    (action.flow ?? state.flow) === "NORMAL" &&
    action.winningPlayerId
  ) {
    const decisions =
      action.decisions ??
      Object.values(state.round.playerStates)
        .filter((playerState): playerState is typeof playerState & { decision: "CALL" | "FOLD" } =>
          playerState.decision === "CALL" || playerState.decision === "FOLD",
        )
        .map((playerState) => ({ playerId: playerState.playerId, decision: playerState.decision }));

    return {
      ...state.resultByPlayerId,
      ...Object.fromEntries(
        decisions.map(({ playerId, decision }) => {
          if (playerId === action.winningPlayerId) {
            return [
              playerId,
              { title: "YOU SURVIVED", delta: SCORING.CALL_WIN, copy: "The Judge bought it." },
            ];
          }

          if (decision === "CALL") {
            return [
              playerId,
              { title: "BAD CALL", delta: SCORING.CALL_LOSE, copy: "You stood on it and lost the table." },
            ];
          }

          return [
            playerId,
            { title: "YOU FOLDED", delta: SCORING.FOLD, copy: "You left the pressure on the table." },
          ];
        }),
      ),
    };
  }

  if (
    action.phase === GAME_PHASES.ROUND_RESULT &&
    (action.flow ?? state.flow) === "COWARD" &&
    action.noEscapePlayerId &&
    action.verdict &&
    action.verdictPlayerId
  ) {
    const survived = action.verdict === "SURVIVED";

    return {
      ...state.resultByPlayerId,
      ...Object.fromEntries(
        getActivePlayerIds(state).map((playerId) => [
          playerId,
          playerId === action.noEscapePlayerId
            ? {
                title: survived ? "NO ESCAPE SURVIVED" : "NO ESCAPE CAUGHT",
                delta: SCORING.EVERYBODY_FOLDS,
                copy: "No Escape added spectacle only. The -2 Coward Round penalty was already applied.",
              }
            : {
                title: "COWARD ROUND",
                delta: SCORING.EVERYBODY_FOLDS,
                copy: "Everybody folded. The table took its hit before No Escape began.",
              },
        ]),
      ),
    };
  }

  if (
    action.phase !== GAME_PHASES.ROUND_RESULT ||
    (action.flow ?? state.flow) !== "STAND_ALONE" ||
    !action.verdict ||
    !action.verdictPlayerId
  ) {
    return state.resultByPlayerId;
  }

  const survived = action.verdict === "SURVIVED";
  const decisions =
    action.decisions ??
    Object.values(state.round.playerStates)
      .filter((playerState): playerState is typeof playerState & { decision: "CALL" | "FOLD" } =>
        playerState.decision === "CALL" || playerState.decision === "FOLD",
      )
      .map((playerState) => ({ playerId: playerState.playerId, decision: playerState.decision }));
  const foldedResults = Object.fromEntries(
    decisions
      .filter(({ playerId, decision }) => playerId !== action.verdictPlayerId && decision === "FOLD")
      .map(({ playerId }) => [
        playerId,
        {
          title: "YOU FOLDED",
          delta: SCORING.FOLD,
          copy: "You got out before the table decided.",
        },
      ]),
  );

  return {
    ...state.resultByPlayerId,
    ...foldedResults,
    [action.verdictPlayerId]: {
      title: survived ? "STOOD ALONE" : "CAUGHT",
      delta: survived ? SCORING.STAND_ALONE_SURVIVE : SCORING.STAND_ALONE_FAIL,
      copy: survived ? "You stood alone and sold it." : "The twist caught the bluff.",
    },
  };
}

function syncDecisionLocks(
  state: DemoState,
  lockedPlayerIds: string[],
  ownDecision?: { playerId: string; decision: "CALL" | "FOLD" } | null,
): DemoState {
  const lockedSet = new Set(lockedPlayerIds);

  return {
    ...state,
    round: {
      ...state.round,
      playerStates: Object.fromEntries(
        Object.entries(state.round.playerStates).map(([playerId, playerState]) => [
          playerId,
          {
            ...playerState,
            decision:
              ownDecision?.playerId === playerId
                ? ownDecision.decision
                : lockedSet.has(playerId)
                  ? playerState.decision ?? "FOLD"
                  : null,
          },
        ]),
      ),
    },
  };
}

function syncOwnHand(state: DemoState, playerId: string, responseIds: string[]): DemoState {
  const playerState = state.round.playerStates[playerId];

  if (!playerState) {
    return state;
  }

  const hand = responseIds
    .map((responseId) => state.scenario.responses.find((response) => response.id === responseId))
    .filter((response): response is ResponseCard => Boolean(response));

  if (hand.length === 0) {
    return state;
  }

  const selectedResponseId = playerState.selectedResponseId && hand.some((card) => card.id === playerState.selectedResponseId)
    ? playerState.selectedResponseId
    : null;

  return {
    ...state,
    round: {
      ...state.round,
      playerStates: {
        ...state.round.playerStates,
        [playerId]: {
          ...playerState,
          hand,
          selectedResponseId,
        },
      },
    },
  };
}

function syncResponseLocks(
  state: DemoState,
  lockedPlayerIds: string[],
  ownResponse?: { playerId: string; selectedResponseId: string | null } | null,
): DemoState {
  const lockedSet = new Set(lockedPlayerIds);

  return {
    ...state,
    round: {
      ...state.round,
      playerStates: Object.fromEntries(
        Object.entries(state.round.playerStates).map(([playerId, playerState]) => [
          playerId,
          {
            ...playerState,
            selectedResponseId:
              ownResponse?.playerId === playerId
                ? ownResponse.selectedResponseId
                : playerState.selectedResponseId,
            responseLocked: lockedSet.has(playerId),
          },
        ]),
      ),
    },
  };
}

export function getViewerRole(state: DemoState): DemoViewRole {
  return state.viewerId === state.round.judgeId ? "JUDGE" : "PLAYER";
}

export function getPlayerName(state: DemoState, playerId: string): string {
  return state.players.find((player) => player.id === playerId)?.name ?? "Unknown";
}

export function getViewerPlayer(state: DemoState): Player {
  return state.players.find((player) => player.id === state.viewerId) ?? state.players[0];
}

export function getViewerRoundState(state: DemoState) {
  return state.round.playerStates[state.viewerId] ?? Object.values(state.round.playerStates)[0];
}

const HYDRATING_RESPONSE: ResponseCard = {
  id: "hydrating-response",
  text: "Updating table...",
  tone: "SENSIBLE",
};

export function isSelectedResponseHydrated(state: DemoState, playerId: string): boolean {
  const playerState = state.round.playerStates[playerId];

  if (playerState == null || Array.isArray(playerState.hand) === false || playerState.hand.length === 0) {
    return false;
  }

  if (!playerState.selectedResponseId) {
    return true;
  }

  return playerState.hand.some((card) => card.id === playerState.selectedResponseId);
}

export function getSelectedResponse(state: DemoState, playerId: string): ResponseCard {
  const playerState = state.round.playerStates[playerId];

  if (playerState == null || Array.isArray(playerState.hand) === false || playerState.hand.length === 0) {
    console.info("NO FOLD selected response not hydrated", {
      playerId,
      roundNumber: state.round.roundNumber,
      phase: state.round.phase,
      hasPlayerState: Boolean(playerState),
      hasHand: Boolean(playerState?.hand),
      handLength: playerState?.hand?.length ?? 0,
    });
    return HYDRATING_RESPONSE;
  }

  return (
    playerState.hand.find((card) => card.id === playerState.selectedResponseId) ??
    playerState.hand[0]
  );
}

export function getActiveTwist(state: DemoState): Twist {
  return (
    state.scenario.twists.find((twist) => twist.id === state.round.activeTwistId) ??
    state.scenario.twists[0]
  );
}

export function getCallers(state: DemoState): string[] {
  return Object.values(state.round.playerStates)
    .filter((playerState) => playerState.decision === "CALL")
    .map((playerState) => playerState.playerId);
}

export function getFolders(state: DemoState): string[] {
  return Object.values(state.round.playerStates)
    .filter((playerState) => playerState.decision === "FOLD")
    .map((playerState) => playerState.playerId);
}

export function isWaitingPhaseForPlayer(phase: GamePhase): boolean {
  return phase === GAME_PHASES.JUDGE_PICK || phase.endsWith("_VERDICT");
}

function assignDemoResponses(round: RoundState, scenario: Scenario): RoundState["playerStates"] {
  return Object.fromEntries(
    Object.entries(round.playerStates).map(([playerId, playerState], playerIndex) => [
      playerId,
      {
        ...playerState,
        hand: scenario.responses.slice(playerIndex, playerIndex + 4),
        selectedResponseId: null,
      },
    ]),
  );
}

function updateViewerRoundState(
  state: DemoState,
  patch: Partial<RoundState["playerStates"][string]>,
): DemoState {
  const viewerRoundState = state.round.playerStates[state.viewerId];

  if (!viewerRoundState) {
    return state;
  }

  return {
    ...state,
    round: {
      ...state.round,
      playerStates: {
        ...state.round.playerStates,
        [state.viewerId]: { ...viewerRoundState, ...patch },
      },
    },
  };
}

function lockAllDemoResponses(state: DemoState): RoundState["playerStates"] {
  return Object.fromEntries(
    Object.entries(state.round.playerStates).map(([playerId, playerState], index) => {
      const selectedResponseId =
        playerState.selectedResponseId ?? playerState.hand[index % playerState.hand.length].id;

      return [
        playerId,
        {
          ...playerState,
          selectedResponseId,
          responseLocked: true,
        },
      ];
    }),
  );
}

function resolveDemoCallFold(state: DemoState, viewerDecision: "CALL" | "FOLD"): DemoState {
  const decisions = buildDemoDecisions(state, viewerDecision);
  const round = {
    ...state.round,
    playerStates: Object.fromEntries(
      Object.entries(state.round.playerStates).map(([playerId, playerState]) => [
        playerId,
        { ...playerState, decision: decisions[playerId] },
      ]),
    ),
  };
  const outcome = resolveCallFoldDecisions(round);

  if (outcome.type === "NORMAL_JUDGE_PICK") {
    return { ...state, outcome, round: { ...round, phase: GAME_PHASES.JUDGE_PICK } };
  }

  if (outcome.type === "STAND_ALONE") {
    return {
      ...state,
      outcome,
      round: {
        ...round,
        phase: GAME_PHASES.STAND_ALONE,
        standAlonePlayerId: outcome.standAlonePlayerId,
      },
    };
  }

  const activePlayerIds = getActivePlayerIds(state);
  const noEscapePlayerId = activePlayerIds[0];
  return {
    ...state,
    outcome,
    players: scoreEverybodyFolds(state.players, activePlayerIds),
    round: {
      ...round,
      phase: GAME_PHASES.COWARD_ROUND,
      noEscapePlayerId,
    },
    resultByPlayerId: Object.fromEntries(
      activePlayerIds.map((playerId) => [
        playerId,
        {
          title: "COWARD ROUND",
          delta: SCORING.EVERYBODY_FOLDS,
          copy: "Everybody folded. The table took the hit before No Escape began.",
        },
      ]),
    ),
  };
}

function buildDemoDecisions(
  state: DemoState,
  viewerDecision: "CALL" | "FOLD",
): Record<string, "CALL" | "FOLD"> {
  const activePlayerIds = getActivePlayerIds(state);

  if (state.flow === "COWARD") {
    return Object.fromEntries(activePlayerIds.map((playerId) => [playerId, "FOLD"]));
  }

  if (state.flow === "STAND_ALONE") {
    const standAlonePlayerId =
      viewerDecision === "CALL"
        ? state.viewerId
        : activePlayerIds.find((playerId) => playerId !== state.viewerId) ?? activePlayerIds[0];
    return Object.fromEntries(
      activePlayerIds.map((playerId) => [playerId, playerId === standAlonePlayerId ? "CALL" : "FOLD"]),
    );
  }

  const callerFallback = activePlayerIds.find((playerId) => playerId !== state.viewerId) ?? activePlayerIds[0];

  if (viewerDecision === "CALL") {
    return Object.fromEntries(
      activePlayerIds.map((playerId) => [
        playerId,
        playerId === state.viewerId || playerId === callerFallback ? "CALL" : "FOLD",
      ]),
    );
  }

  const callers = activePlayerIds.filter((playerId) => playerId !== state.viewerId).slice(0, 2);
  return Object.fromEntries(
    activePlayerIds.map((playerId) => [playerId, callers.includes(playerId) ? "CALL" : "FOLD"]),
  );
}

function lockJudgeWinner(state: DemoState): DemoState {
  const winnerId = state.selectedJudgeWinnerId;

  if (!winnerId || !state.outcome) {
    return state;
  }

  const players = scoreCallFoldResult(
    state.players,
    state.outcome.callerIds,
    state.outcome.folderIds,
    winnerId,
  );

  return {
    ...state,
    players,
    round: { ...state.round, phase: GAME_PHASES.ROUND_RESULT, winningPlayerId: winnerId },
    resultByPlayerId: Object.fromEntries(
      getActivePlayerIds(state).map((playerId) => {
        if (state.outcome?.folderIds.includes(playerId)) {
          return [
            playerId,
            { title: "YOU FOLDED", delta: SCORING.FOLD, copy: "You left the pressure on the table." },
          ];
        }

        const won = playerId === winnerId;
        return [
          playerId,
          {
            title: won ? "YOU SURVIVED" : "BAD CALL",
            delta: won ? SCORING.CALL_WIN : SCORING.CALL_LOSE,
            copy: won ? "The Judge bought it." : "You stood on it and lost the table.",
          },
        ];
      }),
    ),
  };
}

function getActivePlayerIds(state: DemoState): string[] {
  return state.players.filter((player) => player.id !== state.round.judgeId).map((player) => player.id);
}

function resolveStandAloneVerdict(state: DemoState, survived: boolean): DemoState {
  const playerId = state.round.standAlonePlayerId;

  if (!playerId) {
    return state;
  }

  const folderIds = getFolders(state);
  const playersWithFolds = folderIds.reduce(
    (players, folderId) => applyScoreDelta(players, folderId, SCORING.FOLD),
    state.players,
  );

  return {
    ...state,
    players: scoreStandAlone(playersWithFolds, playerId, survived),
    round: { ...state.round, phase: GAME_PHASES.ROUND_RESULT, winningPlayerId: survived ? playerId : null },
    resultByPlayerId: {
      ...Object.fromEntries(
        getFolders(state).map((folderId) => [
          folderId,
          { title: "YOU FOLDED", delta: SCORING.FOLD, copy: "You dodged the twist but still lost a point." },
        ]),
      ),
      [playerId]: {
        title: survived ? "STOOD ALONE" : "CAUGHT",
        delta: survived ? SCORING.STAND_ALONE_SURVIVE : SCORING.STAND_ALONE_FAIL,
        copy: survived ? "You faced the twist and survived." : "The second defense did not land.",
      },
    },
  };
}

function resolveNoEscapeVerdict(state: DemoState, survived: boolean): DemoState {
  const noEscapePlayerId = state.round.noEscapePlayerId;

  if (!noEscapePlayerId) {
    return state;
  }

  return {
    ...state,
    players: applyScoreDelta(state.players, noEscapePlayerId, SCORING.NO_ESCAPE_V1),
    round: { ...state.round, phase: GAME_PHASES.ROUND_RESULT, winningPlayerId: survived ? noEscapePlayerId : null },
    resultByPlayerId: {
      ...state.resultByPlayerId,
      [noEscapePlayerId]: {
        title: survived ? "NO ESCAPE SURVIVED" : "NO ESCAPE CAUGHT",
        delta: SCORING.EVERYBODY_FOLDS,
        copy: "No Escape added spectacle only. The -2 Coward Round penalty was already applied.",
      },
    },
  };
}
