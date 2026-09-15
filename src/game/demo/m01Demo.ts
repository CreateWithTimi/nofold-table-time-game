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
  | { type: "SELECT_RESPONSE"; responseId: string }
  | { type: "LOCK_RESPONSE" }
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
const ACTIVE_PLAYER_IDS = DEMO_PLAYERS.filter((player) => player.id !== JUDGE_ID).map(
  (player) => player.id,
);

export function createM01DemoState(flow: DemoFlow = "NORMAL"): DemoState {
  const scenario = tableTroubleScenarios[0];
  const round = createRound({
    roundNumber: 1,
    judgeId: JUDGE_ID,
    players: DEMO_PLAYERS,
    scenario,
  });

  return {
    players: DEMO_PLAYERS,
    round: {
      ...round,
      phase: GAME_PHASES.RESPONSE_SELECTION,
      playerStates: assignDemoResponses(round, scenario),
    },
    scenario,
    noEscapeScenario: tableTroubleScenarios[1],
    viewerId: "timi",
    flow,
    defenseStartedAtMs: null,
    standAloneDefenseStartedAtMs: null,
    noEscapeDefenseStartedAtMs: null,
    outcome: null,
    selectedJudgeWinnerId: null,
    resultByPlayerId: {},
  };
}

export function m01DemoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "VIEW_AS":
      return { ...state, viewerId: action.playerId };
    case "RESET":
      return createM01DemoState(action.flow);
    case "SELECT_RESPONSE":
      return updateViewerRoundState(state, {
        selectedResponseId: action.responseId,
      });
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

export function getSelectedResponse(state: DemoState, playerId: string): ResponseCard {
  const playerState = state.round.playerStates[playerId];
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

  const noEscapePlayerId = ACTIVE_PLAYER_IDS[0];
  return {
    ...state,
    outcome,
    players: scoreEverybodyFolds(state.players, ACTIVE_PLAYER_IDS),
    round: {
      ...round,
      phase: GAME_PHASES.COWARD_ROUND,
      noEscapePlayerId,
    },
    resultByPlayerId: Object.fromEntries(
      ACTIVE_PLAYER_IDS.map((playerId) => [
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
  if (state.flow === "COWARD") {
    return Object.fromEntries(ACTIVE_PLAYER_IDS.map((playerId) => [playerId, "FOLD"]));
  }

  if (state.flow === "STAND_ALONE") {
    const standAlonePlayerId = viewerDecision === "CALL" ? state.viewerId : "zara";
    return Object.fromEntries(
      ACTIVE_PLAYER_IDS.map((playerId) => [playerId, playerId === standAlonePlayerId ? "CALL" : "FOLD"]),
    );
  }

  if (viewerDecision === "CALL") {
    return { timi: "CALL", zara: "CALL", miko: "FOLD" };
  }

  return { timi: "FOLD", zara: "CALL", miko: "CALL" };
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
      ACTIVE_PLAYER_IDS.map((playerId) => {
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
