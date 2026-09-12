import type { Player } from "../types/player";

export function selectNextJudge(players: Player[], previousJudgeIds: string[] = []): string | null {
  if (players.length === 0) {
    return null;
  }

  const previousSet = new Set(previousJudgeIds);
  const unservedPlayer = players.find((player) => !previousSet.has(player.id));

  if (unservedPlayer) {
    return unservedPlayer.id;
  }

  const lastJudgeId = previousJudgeIds.at(-1);
  const lastJudgeIndex = players.findIndex((player) => player.id === lastJudgeId);
  const nextIndex = lastJudgeIndex >= 0 ? (lastJudgeIndex + 1) % players.length : 0;

  return players[nextIndex].id;
}
