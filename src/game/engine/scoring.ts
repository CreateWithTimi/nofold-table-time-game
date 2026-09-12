import { SCORING } from "../constants/scoring";
import type { Player } from "../types/player";

export function applyScoreDelta(players: Player[], playerId: string, delta: number): Player[] {
  return players.map((player) =>
    player.id === playerId ? { ...player, score: player.score + delta } : player,
  );
}

export function scoreCallFoldResult(
  players: Player[],
  callerIds: string[],
  folderIds: string[],
  winningPlayerId: string,
): Player[] {
  return players.map((player) => {
    if (folderIds.includes(player.id)) {
      return { ...player, score: player.score + SCORING.FOLD };
    }

    if (!callerIds.includes(player.id)) {
      return player;
    }

    const delta = player.id === winningPlayerId ? SCORING.CALL_WIN : SCORING.CALL_LOSE;
    return { ...player, score: player.score + delta };
  });
}

export function scoreFold(player: Player): Player {
  return { ...player, score: player.score + SCORING.FOLD };
}

export function scoreEverybodyFolds(players: Player[], playerIds: string[]): Player[] {
  const foldedSet = new Set(playerIds);

  return players.map((player) =>
    foldedSet.has(player.id)
      ? { ...player, score: player.score + SCORING.EVERYBODY_FOLDS }
      : player,
  );
}

export function scoreStandAlone(players: Player[], playerId: string, survived: boolean): Player[] {
  const delta = survived ? SCORING.STAND_ALONE_SURVIVE : SCORING.STAND_ALONE_FAIL;
  return applyScoreDelta(players, playerId, delta);
}
