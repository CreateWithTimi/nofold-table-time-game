import { GAME_PHASES } from "../constants/phases";
import type { Scenario } from "../types/content";
import type { RoundState } from "../types/game";
import type { Player } from "../types/player";
import { dealResponseHand } from "./dealing";

export function createRound(params: {
  roundNumber: number;
  judgeId: string;
  players: Player[];
  scenario: Scenario;
}): RoundState {
  const activePlayers = params.players.filter((player) => player.id !== params.judgeId);

  return {
    roundNumber: params.roundNumber,
    judgeId: params.judgeId,
    scenarioId: params.scenario.id,
    phase: GAME_PHASES.ROUND_START,
    defenseOrder: activePlayers.map((player) => player.id),
    currentDefenderIndex: 0,
    playerStates: Object.fromEntries(
      activePlayers.map((player) => [
        player.id,
        {
          playerId: player.id,
          hand: dealResponseHand(params.scenario),
          selectedResponseId: null,
          responseLocked: false,
          defenseComplete: false,
          decision: null,
        },
      ]),
    ),
    winningPlayerId: null,
    standAlonePlayerId: null,
    noEscapePlayerId: null,
    activeTwistId: params.scenario.twists[0]?.id ?? null,
  };
}
