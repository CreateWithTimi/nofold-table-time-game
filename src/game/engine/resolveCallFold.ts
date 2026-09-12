import type { PlayerDecision, RoundState } from "../types/game";

export type CallFoldOutcomeType = "NORMAL_JUDGE_PICK" | "STAND_ALONE" | "COWARD_ROUND";

export interface CallFoldOutcome {
  type: CallFoldOutcomeType;
  callerIds: string[];
  folderIds: string[];
  standAlonePlayerId: string | null;
}

export function resolveCallFoldDecisions(round: RoundState): CallFoldOutcome {
  const entries = Object.values(round.playerStates).filter(
    (playerState) => playerState.playerId !== round.judgeId,
  );

  const callerIds = entries
    .filter((playerState) => playerState.decision === "CALL")
    .map((playerState) => playerState.playerId);

  const folderIds = entries
    .filter((playerState) => playerState.decision === "FOLD")
    .map((playerState) => playerState.playerId);

  if (callerIds.length >= 2) {
    return {
      type: "NORMAL_JUDGE_PICK",
      callerIds,
      folderIds,
      standAlonePlayerId: null,
    };
  }

  if (callerIds.length === 1) {
    return {
      type: "STAND_ALONE",
      callerIds,
      folderIds,
      standAlonePlayerId: callerIds[0],
    };
  }

  return {
    type: "COWARD_ROUND",
    callerIds,
    folderIds,
    standAlonePlayerId: null,
  };
}

export function isPlayerDecision(value: string): value is PlayerDecision {
  return value === "CALL" || value === "FOLD";
}
