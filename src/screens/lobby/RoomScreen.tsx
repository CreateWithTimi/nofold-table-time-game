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
import { usePersistedRoom, type RealtimeConnectionState } from "../../hooks/usePersistedRoom";
import type { RoomState, RoomStatus } from "../../room/types";
import { updateRoomStatus } from "../../services/rooms";

const MIN_PLAYERS = 3;
const ONBOARDING_STATUSES: RoomStatus[] = ["LOBBY", "PACK_SELECTION", "GAME_READY", "JUDGE_SELECTION"];

export function RoomScreen() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { room, setRoom, isLoading, error, refresh, realtimeStatus } = usePersistedRoom(roomCode);

  if (isLoading) {
    return (
      <GameShell variant="onboarding" footer={<FooterTagline />}>
        <SectionHeadline eyebrow="Loading" title="Finding table" copy="Pulling the latest room state." />
      </GameShell>
    );
  }

  if (error || !room || room.code !== roomCode) {
    return (
      <GameShell variant="onboarding" footer={<FooterTagline />}>
        <RoomNotFound />
        {error ? <p className="form-error">{error}</p> : null}
      </GameShell>
    );
  }

  const viewer = room.players.find((player) => player.id === room.currentViewerId);
  const isHost = Boolean(viewer && viewer.id === room.hostPlayerId);
  const judge = room.players.find((player) => player.id === room.judgeId) ?? room.players[0];
  const canStart = room.players.length >= MIN_PLAYERS && room.players.length <= 6;

  async function updateStatus(status: RoomStatus, selectedPackId?: string | null) {
    if (!room || !isHost) {
      return;
    }

    try {
      setRoom(await updateRoomStatus(room.code, status, { selectedPackId }));
    } catch (caught) {
      console.error(caught);
    }
  }

  function resetOnboarding() {
    navigate("/");
  }

  if (!viewer) {
    return (
      <div className="demo-page">
        {import.meta.env.DEV ? (
          <M02Controls
            room={room}
            realtimeStatus={realtimeStatus}
            onReset={resetOnboarding}
            onRefresh={refresh}
            onForce={updateStatus}
          />
        ) : null}
        <GameShell variant="onboarding" footer={<FooterTagline />}>
          <SectionHeadline
            eyebrow={`Table ${room.code}`}
            title="You're not in this room"
            copy="Join this table from this browser to continue."
          />
          <PrimaryButton onClick={() => navigate("/join")}>Return to Join →</PrimaryButton>
        </GameShell>
      </div>
    );
  }

  return (
    <div className="demo-page">
      {import.meta.env.DEV ? (
        <M02Controls
          room={room}
          realtimeStatus={realtimeStatus}
          onReset={resetOnboarding}
          onRefresh={refresh}
          onForce={updateStatus}
        />
      ) : null}
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
                disabled={!canStart}
                helper={canStart ? "3-6 players" : "Minimum 3 players to start"}
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
              <PackCard pack={tableTroublePack} onSelect={() => updateStatus("GAME_READY", tableTroublePack.id)} />
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
              <HostActionBar label="Start Game →" onClick={() => updateStatus("JUDGE_SELECTION")} />
            ) : (
              <p className="waiting-line">Waiting for host...</p>
            )}
          </>
        ) : null}

        {room.status === "JUDGE_SELECTION" ? (
          isHost ? (
            <JudgeSelectionPanel
              roundNumber={room.roundNumber}
              players={room.players}
              judge={judge}
              onStartRound={() => {
                void updateRoomStatus(room.code, "IN_GAME").then((nextRoom) => {
                  setRoom(nextRoom);
                  navigate(`/game/${nextRoom.code}`);
                });
              }}
            />
          ) : (
            <>
              <SectionHeadline
                eyebrow="Judge selection"
                title={`${judge.name} has the table`}
                copy="Waiting for the host to start Round 1."
              />
              <p className="waiting-line">Waiting for host...</p>
            </>
          )
        ) : null}

        {room.status === "IN_GAME" ? (
          <>
            <SectionHeadline eyebrow="Round 1" title="Round is starting" copy="Gameplay remains local for this milestone." />
            <PrimaryButton onClick={() => navigate(`/game/${room.code}`)}>Enter Round 1 →</PrimaryButton>
          </>
        ) : null}
      </GameShell>
    </div>
  );
}

function M02Controls({
  room,
  realtimeStatus,
  onReset,
  onRefresh,
  onForce,
}: {
  room: RoomState;
  realtimeStatus: RealtimeConnectionState;
  onReset: () => void;
  onRefresh: () => void;
  onForce: (status: RoomStatus) => void;
}) {
  const viewer = room.players.find((player) => player.id === room.currentViewerId);
  const isHost = Boolean(viewer && viewer.id === room.hostPlayerId);

  return (
    <aside className="demo-controls" aria-label="M02 demo controls">
      <div>
        <strong>M02 Controls</strong>
        <span>{room.code} / {room.status} / realtime {realtimeStatus.toLowerCase()}</span>
      </div>
      <p>Viewing as {viewer?.name ?? "not joined"}{isHost ? " (Host)" : ""}</p>
      <div className="control-group">
        <PrimaryButton onClick={onRefresh}>Refresh Room</PrimaryButton>
      </div>
      <div className="control-group">
        {ONBOARDING_STATUSES.map((status) => (
          <SecondaryButton key={status} disabled={!isHost} onClick={() => onForce(status)}>
            Force {status.replace("_", " ")}
          </SecondaryButton>
        ))}
      </div>
      <SecondaryButton onClick={onReset}>Return Home</SecondaryButton>
    </aside>
  );
}
