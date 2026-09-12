import { DecisionButton } from "../../components/game/DecisionButton";
import { ResponseCard } from "../../components/game/ResponseCard";
import { SectionHeadline } from "../../components/game/SectionHeadline";
import type { DemoState } from "../../game/demo/m01Demo";
import { getSelectedResponse } from "../../game/demo/m01Demo";

interface CallFoldScreenProps {
  state: DemoState;
  onDecision: (decision: "CALL" | "FOLD") => void;
}

export function CallFoldScreen({ state, onDecision }: CallFoldScreenProps) {
  return (
    <>
      <SectionHeadline
        eyebrow="Decision time"
        title="Still standing on it?"
        copy="CALL risks the table. FOLD costs you one point and ends the heat."
      />
      <ResponseCard card={getSelectedResponse(state, state.viewerId)} selected locked />
      <div className="decision-grid">
        <DecisionButton title="CALL" copy="+2 if you win, -2 if you lose" onClick={() => onDecision("CALL")}>
          Stand on it
        </DecisionButton>
        <DecisionButton
          title="FOLD"
          copy="-1 and you leave the fight"
          variant="fold"
          onClick={() => onDecision("FOLD")}
        >
          Back down
        </DecisionButton>
      </div>
    </>
  );
}
