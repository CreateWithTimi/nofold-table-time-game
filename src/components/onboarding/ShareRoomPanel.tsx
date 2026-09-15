import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "../game/Buttons";
import { RoomCodeDisplay } from "./RoomCodeDisplay";

interface ShareRoomPanelProps {
  code: string;
  onGoToLobby: () => void;
}

export function ShareRoomPanel({ code, onGoToLobby }: ShareRoomPanelProps) {
  const [message, setMessage] = useState("Waiting for players...");

  async function copyCode() {
    if (!navigator.clipboard) {
      setMessage("Copy is not available here. Tell them NF42.");
      return;
    }

    await navigator.clipboard.writeText(code);
    setMessage("Code copied.");
  }

  async function shareCode() {
    if (!navigator.share) {
      setMessage("Share is not available here. Use copy code.");
      return;
    }

    await navigator.share({ title: "Join my NO FOLD table", text: `Use room code ${code}` });
    setMessage("Share sheet opened.");
  }

  return (
    <>
      <div className="section-headline">
        <p className="eyebrow">Table created</p>
        <h1>Table created</h1>
        <p>Share this code with your table.</p>
      </div>
      <RoomCodeDisplay code={code} />
      <div className="qr-placeholder">
        <span>▦</span>
        <i aria-hidden="true">▣</i>
        <i aria-hidden="true">▢</i>
        <i aria-hidden="true">▣</i>
        <strong>Scan to join</strong>
      </div>
      <div className="share-actions">
        <SecondaryButton onClick={shareCode}>Share Code</SecondaryButton>
        <SecondaryButton onClick={copyCode}>Copy Code</SecondaryButton>
      </div>
      <p className="waiting-line with-icon">♟ {message}</p>
      <PrimaryButton onClick={onGoToLobby}>Go to Lobby</PrimaryButton>
    </>
  );
}
