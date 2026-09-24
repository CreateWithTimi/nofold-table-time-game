import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { PrimaryButton } from "../../components/game/Buttons";
import { FooterTagline } from "../../components/game/FooterTagline";
import { GameShell } from "../../components/game/GameShell";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import { NicknameField } from "../../components/onboarding/NicknameField";
import { ShareRoomPanel } from "../../components/onboarding/ShareRoomPanel";
import type { RoomState } from "../../room/types";
import { createRoom } from "../../services/rooms";

export function CreateRoomScreen() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("Timi");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);

  async function createTable(event: FormEvent) {
    event.preventDefault();
    const trimmed = nickname.trim();

    if (!trimmed) {
      setError("Nickname required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      setRoom(await createRoom(trimmed));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create this table.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function goToLobby() {
    if (!room) {
      return;
    }

    navigate(`/room/${room.code}`);
  }

  return (
    <GameShell variant="onboarding" footer={<FooterTagline />}>
      {room ? (
        <ShareRoomPanel code={room.code} onGoToLobby={goToLobby} />
      ) : (
        <form className="onboarding-form" onSubmit={createTable}>
          <SectionHeadline
            eyebrow="Create a table"
            title="Who's running this table?"
            copy="Pick a nickname. Keep it real."
          />
          <div className="people-icon" aria-hidden="true">
            ●●●
          </div>
          <NicknameField value={nickname} onChange={setNickname} />
          {error ? <p className="form-error">{error}</p> : null}
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Table →"}
          </PrimaryButton>
        </form>
      )}
    </GameShell>
  );
}
