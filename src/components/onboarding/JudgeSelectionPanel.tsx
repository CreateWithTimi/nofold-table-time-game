import type { RoomPlayer } from "../../room/types";
import { PrimaryButton } from "../game/Buttons";

interface JudgeSelectionPanelProps {
  roundNumber: number;
  players: RoomPlayer[];
  judge: RoomPlayer;
  onStartRound: () => void;
}

export function JudgeSelectionPanel({ roundNumber, players, judge, onStartRound }: JudgeSelectionPanelProps) {
  return (
    <div className="judge-sequence">
      <section className="judge-suspense" aria-hidden="true">
        <div className="section-headline">
          <h1>Choosing the Judge...</h1>
          <p>Let fate decide.</p>
        </div>
        <div className="judge-card-stack">
          <span>♠</span>
        </div>
        <p className="picking-line">Picking a judge...</p>
        <div className="pulse-dots">
          <span />
          <span />
          <span />
        </div>
      </section>
      <section className="judge-reveal">
        <div className="section-headline">
        <p className="eyebrow">Judge selection</p>
        <h1><span>{judge.name}</span> has the table</h1>
        <p>{judge.name} is the Judge for Round {String(roundNumber).padStart(2, "0")}.</p>
        </div>
        <div className="judge-avatar" aria-hidden="true">♛</div>
        <div className="judge-wheel" aria-label="Choosing the Judge">
          {players.map((player) => (
            <span key={player.id} className={player.id === judge.id ? "is-judge" : ""}>
              {player.name}
            </span>
          ))}
        </div>
        <section className="judge-note">
          <strong>Judge the performance, not the morality.</strong>
        </section>
        <PrimaryButton onClick={onStartRound}>Start Round {roundNumber}</PrimaryButton>
      </section>
    </div>
  );
}
