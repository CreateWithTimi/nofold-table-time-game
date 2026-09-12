import { useReducer, type Dispatch } from "react";
import { GameShell } from "../../components/game/GameShell";
import { FooterTagline } from "../../components/game/FooterTagline";
import { PrimaryButton, SecondaryButton } from "../../components/game/Buttons";
import { GAME_PHASES } from "../../game/constants/phases";
import {
  createM01DemoState,
  getPlayerName,
  getSelectedResponse,
  getViewerRole,
  getViewerRoundState,
  isWaitingPhaseForPlayer,
  m01DemoReducer,
  type DemoFlow,
} from "../../game/demo/m01Demo";
import { ResponseSelectionScreen } from "../gameplay/ResponseSelectionScreen";
import { DefenseScreen } from "../gameplay/DefenseScreen";
import { CallFoldScreen } from "../gameplay/CallFoldScreen";
import { RoundResultScreen } from "../gameplay/RoundResultScreen";
import { JudgeWaitingResponsesScreen } from "../judge/JudgeWaitingResponsesScreen";
import { JudgeWatchingDefenseScreen } from "../judge/JudgeWatchingDefenseScreen";
import { JudgeWaitingDecisionScreen } from "../judge/JudgeWaitingDecisionScreen";
import { JudgePickScreen } from "../judge/JudgePickScreen";
import { StandAloneRevealScreen } from "../stand-alone/StandAloneRevealScreen";
import { StandAloneDefenseScreen } from "../stand-alone/StandAloneDefenseScreen";
import { StandAloneVerdictScreen } from "../stand-alone/StandAloneVerdictScreen";
import { CowardRoundScreen } from "../coward-round/CowardRoundScreen";
import { NoEscapeDefenseScreen } from "../coward-round/NoEscapeDefenseScreen";
import { NoEscapeVerdictScreen } from "../coward-round/NoEscapeVerdictScreen";

const flows: DemoFlow[] = ["NORMAL", "STAND_ALONE", "COWARD"];

export function M01DemoScreen() {
  const [state, dispatch] = useReducer(m01DemoReducer, undefined, () => createM01DemoState("NORMAL"));
  const role = getViewerRole(state);

  return (
    <div className="demo-page">
      <DemoControls state={state} dispatch={dispatch} />
      <GameShell footer={<FooterTagline />}>
        {role === "JUDGE" ? renderJudgeScreen(state, dispatch) : renderPlayerScreen(state, dispatch)}
      </GameShell>
    </div>
  );
}

function DemoControls({
  state,
  dispatch,
}: {
  state: ReturnType<typeof createM01DemoState>;
  dispatch: Dispatch<Parameters<typeof m01DemoReducer>[1]>;
}) {
  return (
    <aside className="demo-controls" aria-label="M01 demo controls">
      <div>
        <strong>M01 Demo Controls</strong>
        <span>{state.flow.replace("_", " ")} / {state.round.phase}</span>
      </div>
      <div className="control-group">
        {state.players.map((player) => (
          <SecondaryButton
            key={player.id}
            aria-pressed={state.viewerId === player.id}
            onClick={() => dispatch({ type: "VIEW_AS", playerId: player.id })}
          >
            View as {player.name}{player.id === state.round.judgeId ? " (Judge)" : ""}
          </SecondaryButton>
        ))}
      </div>
      <div className="control-group">
        {flows.map((flow) => (
          <PrimaryButton key={flow} onClick={() => dispatch({ type: "RESET", flow })}>
            Force {flow.replace("_", " ")}
          </PrimaryButton>
        ))}
      </div>
    </aside>
  );
}

function renderPlayerScreen(
  state: ReturnType<typeof createM01DemoState>,
  dispatch: Dispatch<Parameters<typeof m01DemoReducer>[1]>,
) {
  const viewerRound = getViewerRoundState(state);

  if (isWaitingPhaseForPlayer(state.round.phase)) {
    return <PlayerWaitingForJudge state={state} />;
  }

  switch (state.round.phase) {
    case GAME_PHASES.RESPONSE_SELECTION:
      return (
        <ResponseSelectionScreen
          state={state}
          onSelectResponse={(responseId) => dispatch({ type: "SELECT_RESPONSE", responseId })}
          onLockResponse={() => dispatch({ type: "LOCK_RESPONSE" })}
        />
      );
    case GAME_PHASES.DEFENSE:
      return (
        <DefenseScreen
          response={getSelectedResponse(state, state.viewerId)}
          onComplete={() => dispatch({ type: "COMPLETE_DEFENSE" })}
        />
      );
    case GAME_PHASES.CALL_FOLD:
      return <CallFoldScreen state={state} onDecision={(decision) => dispatch({ type: "LOCK_CALL_FOLD", decision })} />;
    case GAME_PHASES.STAND_ALONE:
      return <StandAloneRevealScreen state={state} onFaceTwist={() => dispatch({ type: "FACE_STAND_ALONE_TWIST" })} />;
    case GAME_PHASES.STAND_ALONE_DEFENSE:
      return <StandAloneDefenseScreen state={state} onComplete={() => dispatch({ type: "COMPLETE_STAND_ALONE_DEFENSE" })} />;
    case GAME_PHASES.COWARD_ROUND:
      return <CowardRoundScreen state={state} onStartNoEscape={() => dispatch({ type: "START_NO_ESCAPE" })} />;
    case GAME_PHASES.NO_ESCAPE_DEFENSE:
      return <NoEscapeDefenseScreen state={state} onComplete={() => dispatch({ type: "COMPLETE_NO_ESCAPE_DEFENSE" })} />;
    case GAME_PHASES.ROUND_RESULT:
      return <RoundResultScreen state={state} onReset={(flow) => dispatch({ type: "RESET", flow })} />;
    default:
      return <PlayerWaitingForJudge state={state} selectedResponseId={viewerRound.selectedResponseId} />;
  }
}

function renderJudgeScreen(
  state: ReturnType<typeof createM01DemoState>,
  dispatch: Dispatch<Parameters<typeof m01DemoReducer>[1]>,
) {
  switch (state.round.phase) {
    case GAME_PHASES.RESPONSE_SELECTION:
      return <JudgeWaitingResponsesScreen state={state} />;
    case GAME_PHASES.DEFENSE:
      return <JudgeWatchingDefenseScreen state={state} />;
    case GAME_PHASES.CALL_FOLD:
      return <JudgeWaitingDecisionScreen state={state} />;
    case GAME_PHASES.JUDGE_PICK:
      return (
        <JudgePickScreen
          state={state}
          onSelectWinner={(playerId) => dispatch({ type: "SELECT_JUDGE_WINNER", playerId })}
          onLockWinner={() => dispatch({ type: "LOCK_JUDGE_WINNER" })}
        />
      );
    case GAME_PHASES.STAND_ALONE_VERDICT:
      return (
        <StandAloneVerdictScreen
          state={state}
          onVerdict={(survived) => dispatch({ type: "RESOLVE_STAND_ALONE_VERDICT", survived })}
        />
      );
    case GAME_PHASES.NO_ESCAPE_VERDICT:
      return (
        <NoEscapeVerdictScreen
          state={state}
          onVerdict={(survived) => dispatch({ type: "RESOLVE_NO_ESCAPE_VERDICT", survived })}
        />
      );
    case GAME_PHASES.ROUND_RESULT:
      return <RoundResultScreen state={state} onReset={(flow) => dispatch({ type: "RESET", flow })} />;
    default:
      return <JudgeWaitingResponsesScreen state={state} />;
  }
}

function PlayerWaitingForJudge({
  state,
}: {
  state: ReturnType<typeof createM01DemoState>;
  selectedResponseId?: string | null;
}) {
  return (
    <>
      <div className="section-headline">
        <p className="eyebrow">Waiting</p>
        <h1>Judge has the floor</h1>
        <p>Switch to {getPlayerName(state, state.round.judgeId)} in the demo controls to resolve this step.</p>
      </div>
      {state.round.playerStates[state.viewerId] ? (
        <div className="response-card">
          <span className="response-tone">Locked</span>
          <strong>{getSelectedResponse(state, state.viewerId).text}</strong>
        </div>
      ) : null}
    </>
  );
}
