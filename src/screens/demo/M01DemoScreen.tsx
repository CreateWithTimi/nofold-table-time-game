import { useEffect, useReducer, type Dispatch } from "react";
import { GameShell } from "../../components/game/GameShell";
import { FooterTagline } from "../../components/game/FooterTagline";
import { GameHeader } from "../../components/game/GameHeader";
import { PrimaryButton, SecondaryButton } from "../../components/game/Buttons";
import { GAME_PHASES } from "../../game/constants/phases";
import { useCountdownFromStartedAt } from "../../hooks/useCountdown";
import {
  createM01DemoState,
  getPlayerName,
  getSelectedResponse,
  getViewerPlayer,
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
import { StandAloneJudgeDefenseScreen } from "../stand-alone/StandAloneJudgeDefenseScreen";
import { StandAloneJudgeRevealScreen } from "../stand-alone/StandAloneJudgeRevealScreen";
import { StandAloneVerdictScreen } from "../stand-alone/StandAloneVerdictScreen";
import { CowardRoundScreen } from "../coward-round/CowardRoundScreen";
import { JudgeCowardRoundScreen } from "../coward-round/JudgeCowardRoundScreen";
import { NoEscapeDefenseScreen } from "../coward-round/NoEscapeDefenseScreen";
import { NoEscapeJudgeDefenseScreen } from "../coward-round/NoEscapeJudgeDefenseScreen";
import { NoEscapeVerdictScreen } from "../coward-round/NoEscapeVerdictScreen";

const flows: DemoFlow[] = ["NORMAL", "STAND_ALONE", "COWARD"];

export function M01DemoScreen() {
  const [state, dispatch] = useReducer(m01DemoReducer, undefined, () => createM01DemoState("NORMAL"));

  return (
    <div className="demo-page">
      <DemoControls state={state} dispatch={dispatch} />
      <M01RoundExperience state={state} dispatch={dispatch} />
    </div>
  );
}

export function M01RoundExperience({
  state,
  dispatch,
}: {
  state: ReturnType<typeof createM01DemoState>;
  dispatch: Dispatch<Parameters<typeof m01DemoReducer>[1]>;
}) {
  const role = getViewerRole(state);
  const defenseRemainingSeconds = useCountdownFromStartedAt(20, state.defenseStartedAtMs);
  const standAloneDefenseRemainingSeconds = useCountdownFromStartedAt(15, state.standAloneDefenseStartedAtMs);
  const noEscapeDefenseRemainingSeconds = useCountdownFromStartedAt(15, state.noEscapeDefenseStartedAtMs);

  useEffect(() => {
    if (
      state.round.phase === GAME_PHASES.STAND_ALONE_DEFENSE &&
      state.standAloneDefenseStartedAtMs !== null &&
      standAloneDefenseRemainingSeconds === 0
    ) {
      dispatch({ type: "COMPLETE_STAND_ALONE_DEFENSE" });
    }
  }, [dispatch, standAloneDefenseRemainingSeconds, state.round.phase, state.standAloneDefenseStartedAtMs]);

  useEffect(() => {
    if (
      state.round.phase === GAME_PHASES.NO_ESCAPE_DEFENSE &&
      state.noEscapeDefenseStartedAtMs !== null &&
      noEscapeDefenseRemainingSeconds === 0
    ) {
      dispatch({ type: "COMPLETE_NO_ESCAPE_DEFENSE" });
    }
  }, [dispatch, noEscapeDefenseRemainingSeconds, state.noEscapeDefenseStartedAtMs, state.round.phase]);

  return (
    <GameShell footer={<FooterTagline />}>
      {role === "JUDGE"
        ? renderJudgeScreen(
            state,
            dispatch,
            defenseRemainingSeconds,
            standAloneDefenseRemainingSeconds,
            noEscapeDefenseRemainingSeconds,
          )
        : renderPlayerScreen(
            state,
            dispatch,
            defenseRemainingSeconds,
            standAloneDefenseRemainingSeconds,
            noEscapeDefenseRemainingSeconds,
          )}
    </GameShell>
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
  defenseRemainingSeconds: number,
  standAloneDefenseRemainingSeconds: number,
  noEscapeDefenseRemainingSeconds: number,
) {
  const viewerRound = getViewerRoundState(state);

  if (state.round.phase === GAME_PHASES.JUDGE_PICK) {
    return <PlayerJudgeDecidingScreen state={state} />;
  }

  if (isWaitingPhaseForPlayer(state.round.phase)) {
    return <PlayerJudgeDecidingScreen state={state} />;
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
          roundNumber={state.round.roundNumber}
          judgeName={getPlayerName(state, state.round.judgeId)}
          score={getViewerPlayer(state).score}
          started={state.defenseStartedAtMs !== null}
          remainingSeconds={defenseRemainingSeconds}
          onStart={() => dispatch({ type: "START_DEFENSE", startedAtMs: Date.now() })}
          onComplete={() => dispatch({ type: "COMPLETE_DEFENSE" })}
        />
      );
    case GAME_PHASES.CALL_FOLD:
      return <CallFoldScreen state={state} onDecision={(decision) => dispatch({ type: "LOCK_CALL_FOLD", decision })} />;
    case GAME_PHASES.STAND_ALONE:
      if (state.round.standAlonePlayerId !== state.viewerId) {
        return <PlayerJudgeDecidingScreen state={state} />;
      }

      return <StandAloneRevealScreen state={state} onFaceTwist={() => dispatch({ type: "FACE_STAND_ALONE_TWIST" })} />;
    case GAME_PHASES.STAND_ALONE_DEFENSE:
      if (state.round.standAlonePlayerId !== state.viewerId) {
        return <PlayerJudgeDecidingScreen state={state} />;
      }

      return (
        <StandAloneDefenseScreen
          state={state}
          remainingSeconds={standAloneDefenseRemainingSeconds}
          onComplete={() => dispatch({ type: "COMPLETE_STAND_ALONE_DEFENSE" })}
        />
      );
    case GAME_PHASES.COWARD_ROUND:
      return <CowardRoundScreen state={state} onStartNoEscape={() => dispatch({ type: "START_NO_ESCAPE" })} />;
    case GAME_PHASES.NO_ESCAPE_DEFENSE:
      if (state.round.noEscapePlayerId !== state.viewerId) {
        return <PlayerJudgeDecidingScreen state={state} />;
      }

      return (
        <NoEscapeDefenseScreen
          state={state}
          remainingSeconds={noEscapeDefenseRemainingSeconds}
          onComplete={() => dispatch({ type: "COMPLETE_NO_ESCAPE_DEFENSE" })}
        />
      );
    case GAME_PHASES.ROUND_RESULT:
      return <RoundResultScreen state={state} onReset={(flow) => dispatch({ type: "RESET", flow })} />;
    default:
      return <PlayerWaitingForJudge state={state} selectedResponseId={viewerRound.selectedResponseId} />;
  }
}

function renderJudgeScreen(
  state: ReturnType<typeof createM01DemoState>,
  dispatch: Dispatch<Parameters<typeof m01DemoReducer>[1]>,
  defenseRemainingSeconds: number,
  standAloneDefenseRemainingSeconds: number,
  noEscapeDefenseRemainingSeconds: number,
) {
  switch (state.round.phase) {
    case GAME_PHASES.RESPONSE_SELECTION:
      return <JudgeWaitingResponsesScreen state={state} />;
    case GAME_PHASES.DEFENSE:
      return <JudgeWatchingDefenseScreen state={state} remainingSeconds={defenseRemainingSeconds} />;
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
    case GAME_PHASES.STAND_ALONE:
      return <StandAloneJudgeRevealScreen state={state} />;
    case GAME_PHASES.STAND_ALONE_DEFENSE:
      return <StandAloneJudgeDefenseScreen state={state} remainingSeconds={standAloneDefenseRemainingSeconds} />;
    case GAME_PHASES.COWARD_ROUND:
      return <JudgeCowardRoundScreen state={state} />;
    case GAME_PHASES.NO_ESCAPE_DEFENSE:
      return <NoEscapeJudgeDefenseScreen state={state} remainingSeconds={noEscapeDefenseRemainingSeconds} />;
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

function PlayerJudgeDecidingScreen({ state }: { state: ReturnType<typeof createM01DemoState> }) {
  const judgeName = getPlayerName(state, state.round.judgeId);
  const response = getSelectedResponse(state, state.viewerId);
  const score = getViewerPlayer(state).score;

  return (
    <div className="judge-deciding-state" aria-live="polite">
      <GameHeader roundNumber={state.round.roundNumber} judgeName={judgeName} score={score} />

      <section className="judge-deciding-copy" aria-labelledby="judge-deciding-title">
        <h1 id="judge-deciding-title">
          Judge is <span>deciding</span>
        </h1>
        <span className="red-rule" aria-hidden="true" />
        <p>{judgeName} is choosing who survived this best.</p>
        <p className="judge-deciding-subcopy">Hold tight.</p>
      </section>

      <article className="judge-deciding-card" aria-label={`Selected response: ${response.text}`}>
        <span className="judge-deciding-card-icon" aria-hidden="true">●●●</span>
        <strong>{response.text}</strong>
      </article>

      <div className="judge-waiting-indicator" aria-label={`Waiting for ${judgeName}`}>
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </div>
      <p className="judge-waiting-label">Waiting for {judgeName}...</p>
    </div>
  );
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
