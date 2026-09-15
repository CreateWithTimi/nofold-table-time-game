import { useReducer } from "react";
import { Link, useParams } from "react-router";
import { PrimaryButton } from "../../components/game/Buttons";
import { FooterTagline } from "../../components/game/FooterTagline";
import { GameShell } from "../../components/game/GameShell";
import { RoomNotFound } from "../../components/onboarding/RoomNotFound";
import { createM01DemoState, m01DemoReducer } from "../../game/demo/m01Demo";
import { useLocalRoom } from "../../hooks/useLocalRoom";
import { M01RoundExperience } from "../demo/M01DemoScreen";

export function GameScreen() {
  const { roomCode } = useParams();
  const [room] = useLocalRoom();
  const [state, dispatch] = useReducer(m01DemoReducer, undefined, () => createM01DemoState("NORMAL"));

  if (!room || room.code !== roomCode) {
    return (
      <GameShell footer={<FooterTagline />}>
        <RoomNotFound />
      </GameShell>
    );
  }

  return (
    <div className="game-route">
      <aside className="game-route-dev-controls" aria-label="Game test navigation">
        <strong>Test Navigation</strong>
        <Link to={`/room/${room.code}`}>
          <PrimaryButton>Back to Table</PrimaryButton>
        </Link>
      </aside>
      <M01RoundExperience state={state} dispatch={dispatch} />
    </div>
  );
}
