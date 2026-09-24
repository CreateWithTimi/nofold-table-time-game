import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { PrimaryButton, SecondaryButton } from "../../components/game/Buttons";
import { FooterTagline } from "../../components/game/FooterTagline";
import { GameShell } from "../../components/game/GameShell";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import { NicknameField } from "../../components/onboarding/NicknameField";
import { joinRoom } from "../../services/rooms";
import { normalizeRoomCode } from "../../services/rooms/roomCode";

export function JoinRoomScreen() {
  const navigate = useNavigate();
  const [code, setCode] = useState("NF42");
  const [nickname, setNickname] = useState("Ada");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function joinTable(event: FormEvent) {
    event.preventDefault();
    const trimmedCode = normalizeRoomCode(code);
    const trimmedNickname = nickname.trim();

    if (!trimmedCode || !trimmedNickname) {
      setError("Room code and nickname are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const room = await joinRoom(trimmedCode, trimmedNickname);

      if (!room) {
        setError("Room not found.");
        return;
      }

      navigate(`/room/${room.code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join this table.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <GameShell variant="onboarding" footer={<FooterTagline />}>
      <form className="onboarding-form" onSubmit={joinTable}>
        <SectionHeadline
          eyebrow="Join a table"
          title="Let's join the fun"
          copy="Enter the room code from your friend."
        />
        <label className="form-field">
          <span>Room code</span>
          <input
            maxLength={6}
            value={code}
            placeholder="NF42"
            onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
          />
        </label>
        <NicknameField value={nickname} placeholder="Ada" onChange={setNickname} />
        {error ? <p className="form-error">{error}</p> : null}
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Joining..." : "Join Table →"}
        </PrimaryButton>
        <div className="or-rule">or</div>
        <SecondaryButton disabled>Scan a room QR code</SecondaryButton>
      </form>
    </GameShell>
  );
}
