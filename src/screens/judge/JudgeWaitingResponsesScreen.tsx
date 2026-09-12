import { PlayerStatusRow } from "../../components/game/PlayerStatusRow";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import type { DemoState } from "../../game/demo/m01Demo";
import { getPlayerName } from "../../game/demo/m01Demo";

export function JudgeWaitingResponsesScreen({ state }: { state: DemoState }) {
  const rows = Object.values(state.round.playerStates);
  const ready = rows.filter((row) => row.responseLocked).length;

  return (
    <>
      <SectionHeadline
        eyebrow="You're the Judge"
        title="They're choosing"
        copy={`${ready}/${rows.length} responses locked. Private cards stay private.`}
      />
      <div className="status-list">
        {rows.map((row) => (
          <PlayerStatusRow
            key={row.playerId}
            name={getPlayerName(state, row.playerId)}
            status={row.responseLocked ? "Locked" : "Choosing"}
          />
        ))}
      </div>
    </>
  );
}
