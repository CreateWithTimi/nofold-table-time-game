interface GameHeaderProps {
  roundNumber: number;
  judgeName: string;
  score: number;
}

export function GameHeader({ roundNumber, judgeName, score }: GameHeaderProps) {
  const scoreLabel = `${score >= 0 ? "+" : ""}${score}`;

  return (
    <header className="game-header">
      <span>Round {String(roundNumber).padStart(2, "0")}</span>
      <span>
        Judge: <strong>{judgeName}</strong>
      </span>
      <span>{scoreLabel}</span>
    </header>
  );
}
