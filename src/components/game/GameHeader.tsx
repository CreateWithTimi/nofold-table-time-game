interface GameHeaderProps {
  roundNumber: number;
  judgeName: string;
  score: number;
}

export function GameHeader({ roundNumber, judgeName, score }: GameHeaderProps) {
  return (
    <header className="game-header">
      <span>Round {roundNumber}</span>
      <span>Judge: {judgeName}</span>
      <span>{score} pts</span>
    </header>
  );
}
