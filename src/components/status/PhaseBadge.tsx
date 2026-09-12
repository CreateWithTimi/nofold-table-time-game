import type { GamePhase } from "../../game/constants/phases";

interface PhaseBadgeProps {
  phase: GamePhase;
}

export function PhaseBadge({ phase }: PhaseBadgeProps) {
  return <span className="phase-badge">{phase.replaceAll("_", " ")}</span>;
}
