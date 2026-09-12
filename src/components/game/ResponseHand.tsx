import type { ResponseCard as ResponseCardType } from "../../game/types/content";
import { ResponseCard } from "./ResponseCard";

interface ResponseHandProps {
  cards: ResponseCardType[];
  selectedResponseId: string | null;
  locked?: boolean;
  onSelect: (responseId: string) => void;
}

export function ResponseHand({ cards, selectedResponseId, locked = false, onSelect }: ResponseHandProps) {
  return (
    <div className="response-hand">
      {cards.map((card) => (
        <ResponseCard
          key={card.id}
          card={card}
          selected={card.id === selectedResponseId}
          locked={locked && card.id === selectedResponseId}
          onSelect={locked ? undefined : () => onSelect(card.id)}
        />
      ))}
    </div>
  );
}
