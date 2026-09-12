interface PlayerStatusRowProps {
  name: string;
  status: string;
}

export function PlayerStatusRow({ name, status }: PlayerStatusRowProps) {
  return (
    <div className="player-status-row">
      <span>{name}</span>
      <strong>{status}</strong>
    </div>
  );
}
