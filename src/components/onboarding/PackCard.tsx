import { tableTroubleScenarios } from "../../data/packs/table-trouble";
import type { GamePack } from "../../game/types/content";
import { PrimaryButton } from "../game/Buttons";

interface PackCardProps {
  pack: GamePack;
  onSelect: () => void;
}

export function PackCard({ pack, onSelect }: PackCardProps) {
  return (
    <section className="pack-card">
      <span className="mini-logo">NO FOLD</span>
      <h2>{pack.name}</h2>
      <div className="pack-suit">♠</div>
      <p>Social pressure. Bad decisions. Tough defenses.</p>
      <strong>{tableTroubleScenarios.length} scenarios</strong>
      <div className="tone-row">
        <span>Playful</span>
        <span>Awkward</span>
        <span>Risky</span>
      </div>
      <PrimaryButton onClick={onSelect}>Play This Pack →</PrimaryButton>
    </section>
  );
}
