import type { ResponseCard, ResponseTone, Scenario } from "../types/content";

const TONE_ORDER: ResponseTone[] = ["SENSIBLE", "RISKY", "CHAOTIC", "WILDCARD"];

export function dealResponseHand(scenario: Scenario, handSize = 4): ResponseCard[] {
  const cardsByTone = TONE_ORDER.map((tone) =>
    scenario.responses.filter((response) => response.tone === tone),
  );

  const balancedHand = cardsByTone
    .map((cards) => cards[0])
    .filter((card): card is ResponseCard => Boolean(card));

  if (balancedHand.length >= handSize) {
    return balancedHand.slice(0, handSize);
  }

  const selectedIds = new Set(balancedHand.map((card) => card.id));
  const fillers = scenario.responses.filter((response) => !selectedIds.has(response.id));

  return [...balancedHand, ...fillers].slice(0, handSize);
}
