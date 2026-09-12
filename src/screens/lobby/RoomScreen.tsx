import { useParams } from "react-router";
import { Panel } from "../../components/cards/Panel";

export function RoomScreen() {
  const { roomCode } = useParams();

  return (
    <Panel title={`Room ${roomCode ?? ""}`}>
      <p>Lobby placeholder for player list, pack selection, and host controls.</p>
    </Panel>
  );
}
