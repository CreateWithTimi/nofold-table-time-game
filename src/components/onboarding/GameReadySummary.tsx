import { tableTroublePack } from "../../data/packs/table-trouble";
import type { RoomState } from "../../room/types";

export function GameReadySummary({ room }: { room: RoomState }) {
  return (
    <>
      <div className="ready-summary">
        <div>
          <span>●</span>
          <strong>{room.players.length} players</strong>
        </div>
        <div>
          <span>◷</span>
          <strong>8 rounds</strong>
        </div>
        <div>
          <span>♠</span>
          <strong>{tableTroublePack.name}</strong>
        </div>
      </div>
      <section className="rule-recap">
        <p><span>▱</span> Play it.</p>
        <p><span>○</span> Defend it.</p>
        <p><span>⌁</span> Call or Fold.</p>
      </section>
      <p className="waiting-line">One player judges each round.</p>
    </>
  );
}
