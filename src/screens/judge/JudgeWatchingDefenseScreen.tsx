import { ResponseCard } from "../../components/game/ResponseCard";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import { TimerDisplay } from "../../components/game/TimerDisplay";
import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName, getSelectedResponse } from "../../game/demo/m01Demo";

export function JudgeWatchingDefenseScreen({ state }: { state: DemoState }) {
  const defenderId = state.round.defenseOrder[state.round.currentDefenderIndex] ?? state.round.defenseOrder[0];

  return (
    <>
      <SectionHeadline
        eyebrow="Defense"
        title={getPlayerName(state, defenderId)}
        copy="Judge the performance, not the morality."
      />
      <ResponseCard card={getSelectedResponse(state, defenderId)} selected />
      <TimerDisplay seconds={20} label="Shared timer" />
    </>
  );
}
