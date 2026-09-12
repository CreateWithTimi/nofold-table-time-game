import { PlayerStatusRow } from "../../components/game/PlayerStatusRow";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName } from "../../game/demo/m01Demo";

export function JudgeWaitingDecisionScreen({ state }: { state: DemoState }) {
  const rows = Object.values(state.round.playerStates);
  const ready = rows.filter((row) => row.decision).length;

  return (
    <>
      <SectionHeadline
        eyebrow="Judge view"
        title="The table is deciding"
        copy={`${ready}/${rows.length} decisions locked. Choices stay hidden until everyone is in.`}
      />
      <div className="status-list">
        {rows.map((row) => (
          <PlayerStatusRow
            key={row.playerId}
            name={getPlayerName(state, row.playerId)}
            status={row.decision ? "Locked" : "Thinking"}
          />
        ))}
      </div>
    </>
  );
}
