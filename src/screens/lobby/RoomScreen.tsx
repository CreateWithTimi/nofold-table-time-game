import { useNavigate, useParams } from "react-router";
import { FooterTagline } from "../../components/game/FooterTagline";
import { GameShell } from "../../components/game/GameShell";
import { PrimaryButton, SecondaryButton } from "../../components/game/Buttons";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import { GameReadySummary } from "../../components/onboarding/GameReadySummary";
import { HostActionBar } from "../../components/onboarding/HostActionBar";
import { JudgeSelectionPanel } from "../../components/onboarding/JudgeSelectionPanel";
import { PackCard } from "../../components/onboarding/PackCard";
import { PlayerLobbyList } from "../../components/onboarding/PlayerLobbyList";
import { RoomNotFound } from "../../components/onboarding/RoomNotFound";
import { tableTroublePack } from "../../data/packs/table-trouble";
import { useLocalRoom } from "../../hooks/useLocalRoom";
import {
  addMockPlayer,
  canHostStart,
  getCurrentViewer,
  removeMockPlayer,
  resetRoom,
  selectPack,
  setRoomStatus,
  setViewer,
  startGame,
  startJudgeSelection,
} from "../../room/localRoom";
import type { RoomStatus } from "../../room/types";

export function RoomScreen() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useLocalRoom();

  if (!room || room.code !== roomCode) {
    return (
      <GameShell variant="onboarding" footer={<FooterTagline />}>
        <RoomNotFound />
      </GameShell>
    );
  }

  const viewer = getCurrentViewer(room);
  const isHost = viewer.id === room.hostPlayerId;
  const judge = room.players.find((player) => player.id === room.judgeId) ?? room.players[0];

  function updateStatus(status: RoomStatus) {
    setRoom(setRoomStatus(room!, status));
  }

  function resetOnboarding() {
    resetRoom();
    setRoom(null);
    navigate("/");
  }

  return (
    <div className="demo-page">
      <M02Controls
        room={room}
        onReset={resetOnboarding}
        onAdd={() => setRoom(addMockPlayer(room))}
        onRemove={() => setRoom(removeMockPlayer(room))}
        onView={(playerId) => setRoom(setViewer(room, playerId))}
        onForce={updateStatus}
      />
      <GameShell variant="onboarding" footer={<FooterTagline />}>
        {room.status === "LOBBY" ? (
          <>
            <SectionHeadline
              eyebrow={`${room.players.length} players in`}
              title={`Table ${room.code}`}
              copy="Joining the lobby implies readiness."
            />
            <PlayerLobbyList players={room.players} />
            {isHost ? (
              <HostActionBar
                label={`Start with ${room.players.length}`}
                disabled={!canHostStart(room)}
                helper={canHostStart(room) ? "3-6 players" : "Minimum 3 players to start"}
                onClick={() => updateStatus("PACK_SELECTION")}
              />
            ) : (
              <p className="waiting-line">Waiting for host...</p>
            )}
          </>
        ) : null}

        {room.status === "PACK_SELECTION" ? (
          <>
            <SectionHeadline
              eyebrow="Choose a pack"
              title="What kind of trouble?"
              copy="Pick a pack to set the vibe."
            />
            {isHost ? (
              <PackCard pack={tableTroublePack} onSelect={() => setRoom(selectPack(room))} />
            ) : (
              <p className="waiting-line">Waiting for host...</p>
            )}
            <div className="disabled-pack">Soft Wahala · Coming later</div>
          </>
        ) : null}

        {room.status === "GAME_READY" ? (
          <>
            <SectionHeadline eyebrow="You're all set" title="Table locked" copy="Time to play." />
            <GameReadySummary room={room} />
            {isHost ? (
              <HostActionBar label="Start Game →" onClick={() => setRoom(startJudgeSelection(room))} />
            ) : (
              <p className="waiting-line">Waiting for host...</p>
            )}
          </>
        ) : null}

        {room.status === "JUDGE_SELECTION" ? (
          <JudgeSelectionPanel
            roundNumber={room.roundNumber}
            players={room.players}
            judge={judge}
            onStartRound={() => {
              const nextRoom = startGame(room);
              setRoom(nextRoom);
              navigate(`/game/${nextRoom.code}`);
            }}
          />
        ) : null}
      </GameShell>
    </div>
  );
}

function M02Controls({
  room,
  onReset,
  onAdd,
  onRemove,
  onView,
  onForce,
}: {
  room: NonNullable<ReturnType<typeof useLocalRoom>[0]>;
  onReset: () => void;
  onAdd: () => void;
  onRemove: () => void;
  onView: (playerId: string) => void;
  onForce: (status: RoomStatus) => void;
}) {
  return (
    <aside className="demo-controls" aria-label="M02 demo controls">
      <div>
        <strong>M02 Controls</strong>
        <span>{room.code} / {room.status}</span>
      </div>
      <div className="control-group">
        {room.players.map((player) => (
          <SecondaryButton key={player.id} aria-pressed={room.currentViewerId === player.id} onClick={() => onView(player.id)}>
            View as {player.name}{player.isHost ? " (Host)" : ""}
          </SecondaryButton>
        ))}
      </div>
      <div className="control-group">
        <PrimaryButton onClick={onAdd}>Add Mock Player</PrimaryButton>
        <SecondaryButton onClick={onRemove}>Remove Mock Player</SecondaryButton>
      </div>
      <div className="control-group">
        {(["LOBBY", "PACK_SELECTION", "GAME_READY", "JUDGE_SELECTION"] as RoomStatus[]).map((status) => (
          <SecondaryButton key={status} onClick={() => onForce(status)}>
            Force {status.replace("_", " ")}
          </SecondaryButton>
        ))}
      </div>
      <SecondaryButton onClick={onReset}>Reset Onboarding</SecondaryButton>
    </aside>
  );
}
