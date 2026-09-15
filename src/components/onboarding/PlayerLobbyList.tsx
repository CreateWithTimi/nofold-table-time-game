import type { RoomPlayer } from "../../room/types";

interface PlayerLobbyListProps {
  players: RoomPlayer[];
}

export function PlayerLobbyList({ players }: PlayerLobbyListProps) {
  return (
    <div className="lobby-list">
      {players.map((player) => (
        <div className="lobby-row" key={player.id}>
          <span className="avatar-dot">{player.name.slice(0, 1)}</span>
          <strong>{player.name}</strong>
          {player.isHost ? <em>Host</em> : null}
          <span className="presence-dot" aria-label="In table" />
        </div>
      ))}
      <div className="lobby-row is-empty">
        <span className="avatar-dot">+</span>
        <strong>Waiting for player...</strong>
      </div>
    </div>
  );
}
