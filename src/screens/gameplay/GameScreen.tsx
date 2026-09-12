import { useParams } from "react-router";
import { Panel } from "../../components/cards/Panel";
import { PhaseBadge } from "../../components/status/PhaseBadge";
import { GAME_PHASES } from "../../game/constants/phases";

export function GameScreen() {
  const { roomCode } = useParams();

  return (
    <Panel title={`Game ${roomCode ?? ""}`}>
      <PhaseBadge phase={GAME_PHASES.ROUND_START} />
      <p>Gameplay placeholder. React renders state; the TypeScript engine owns the rules.</p>
    </Panel>
  );
}
