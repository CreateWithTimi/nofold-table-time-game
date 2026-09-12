import type { ResponseCard as ResponseCardType } from "../../game/types/content";
import { ResponseCard } from "./ResponseCard";

interface JudgeOptionCardProps {
  playerName: string;
  card: ResponseCardType;
  selected?: boolean;
  onSelect: () => void;
}

export function JudgeOptionCard({ playerName, card, selected = false, onSelect }: JudgeOptionCardProps) {
  return (
    <button
      className={`judge-option-card${selected ? " is-selected" : ""}`}
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span>{playerName}</span>
      <ResponseCard card={card} selected={selected} />
    </button>
  );
}
