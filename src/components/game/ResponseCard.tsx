import type { ResponseCard as ResponseCardType } from "../../game/types/content";

interface ResponseCardProps {
  card: ResponseCardType;
  selected?: boolean;
  locked?: boolean;
  onSelect?: () => void;
}

export function ResponseCard({ card, selected = false, locked = false, onSelect }: ResponseCardProps) {
  const cardContent = (
    <>
      <span className="response-tone">{card.tone}</span>
      <strong>{card.text}</strong>
      {selected ? <span className="selected-label">Selected</span> : null}
      {locked ? <span className="locked-label">Locked</span> : null}
    </>
  );

  if (!onSelect) {
    return <article className="response-card">{cardContent}</article>;
  }

  return (
    <button
      className={`response-card response-card-button${selected ? " is-selected" : ""}`}
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
    >
      {cardContent}
    </button>
  );
}
