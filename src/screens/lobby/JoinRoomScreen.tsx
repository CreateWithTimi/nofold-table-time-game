import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { PrimaryButton, SecondaryButton } from "../../components/game/Buttons";
import { FooterTagline } from "../../components/game/FooterTagline";
import { GameShell } from "../../components/game/GameShell";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import { NicknameField } from "../../components/onboarding/NicknameField";
import { joinLocalRoom } from "../../room/localRoom";

export function JoinRoomScreen() {
  const navigate = useNavigate();
  const [code, setCode] = useState("NF42");
  const [nickname, setNickname] = useState("Ada");
  const [error, setError] = useState("");

  function joinTable(event: FormEvent) {
    event.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedNickname = nickname.trim();

    if (!trimmedCode || !trimmedNickname) {
      setError("Room code and nickname are required.");
      return;
    }

    const room = joinLocalRoom(trimmedCode, trimmedNickname);

    if (!room) {
      setError("Room not found in this local demo. Create NF42 first.");
      return;
    }

    navigate(`/room/${room.code}`);
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
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
        </label>
        <NicknameField value={nickname} placeholder="Ada" onChange={setNickname} />
        {error ? <p className="form-error">{error}</p> : null}
        <PrimaryButton type="submit">Join Table →</PrimaryButton>
        <div className="or-rule">or</div>
        <SecondaryButton disabled>Scan a room QR code</SecondaryButton>
      </form>
    </GameShell>
  );
}
