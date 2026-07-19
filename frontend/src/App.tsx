import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from 'react';
import { MobileControls } from './controls/MobileControls';
import { useIsTouch } from './controls/useIsTouch';
import {
  GameDispatchContext,
  GameStateContext,
  initialState,
  reducer
} from './state/gameState';
import { ambience } from './audio/AmbienceEngine';
import { strings } from './content/strings.sv';
import { Scene, type LookDelta, type MoveVector } from './scene/Scene';
import { BusStage } from './stages/BusStage';
import { EndStage } from './stages/EndStage';
import { TitleStage } from './stages/TitleStage';
import { Dialogue } from './ui/Dialogue';
import { Hud } from './ui/Hud';
import { PauseMenu } from './ui/PauseMenu';
import { detectWebGL, WebGLFallback } from './webgl/WebGLFallback';

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isTouch = useIsTouch();
  const [webglOk] = useState<boolean>(() => detectWebGL());
  const moveRef = useRef<MoveVector>({ x: 0, y: 0 });
  const lookRef = useRef<LookDelta>({ dx: 0, dy: 0 });
  const [nearNpc, setNearNpc] = useState(false);
  const [nearTable, setNearTable] = useState(false);

  useEffect(() => {
    const start = () => {
      ambience.start(state.muted).catch(() => {
        // Autoplay may still be denied on some browsers; ignore.
      });
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      window.removeEventListener('touchstart', start);
    };
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
    window.addEventListener('touchstart', start);
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      window.removeEventListener('touchstart', start);
    };
  }, [state.muted]);

  useEffect(() => {
    ambience.setMuted(state.muted);
  }, [state.muted]);

  useEffect(() => {
    return () => ambience.stop();
  }, []);

  useEffect(() => {
    if (isTouch) return;
    const shouldRelease =
      state.dialogueOpen || state.paused || state.stage === 'end';
    if (shouldRelease && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [state.dialogueOpen, state.paused, state.stage, isTouch]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (state.stage === 'play' && !state.dialogueOpen) {
          dispatch({ type: 'TOGGLE_PAUSE' });
        }
        return;
      }
      if (event.key === 'e' || event.key === 'E') {
        if (
          state.stage !== 'play' ||
          state.dialogueOpen ||
          state.paused
        ) {
          return;
        }
        if (nearNpc && !state.hasSpokenToApplicant) {
          dispatch({ type: 'OPEN_DIALOGUE' });
        } else if (nearTable && state.hasSpokenToApplicant) {
          dispatch({ type: 'END_DEMO' });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    state.stage,
    state.dialogueOpen,
    state.paused,
    state.hasSpokenToApplicant,
    nearNpc,
    nearTable
  ]);

  const contextPromptLabel = useMemo(() => {
    if (state.stage !== 'play' || state.dialogueOpen || state.paused) {
      return null;
    }
    if (nearNpc && !state.hasSpokenToApplicant) return strings.prompts.talkTo;
    if (nearTable && state.hasSpokenToApplicant) return strings.prompts.register;
    return null;
  }, [
    state.stage,
    state.dialogueOpen,
    state.paused,
    state.hasSpokenToApplicant,
    nearNpc,
    nearTable
  ]);

  const onInteractMobile = useCallback(() => {
    if (
      state.stage !== 'play' ||
      state.dialogueOpen ||
      state.paused
    ) {
      return;
    }
    if (nearNpc && !state.hasSpokenToApplicant) {
      dispatch({ type: 'OPEN_DIALOGUE' });
    } else if (nearTable && state.hasSpokenToApplicant) {
      dispatch({ type: 'END_DEMO' });
    }
  }, [
    state.stage,
    state.dialogueOpen,
    state.paused,
    state.hasSpokenToApplicant,
    nearNpc,
    nearTable
  ]);

  if (!webglOk) {
    return (
      <WebGLFallback onRestart={() => window.location.reload()} />
    );
  }

  const scenePaused =
    state.paused || state.dialogueOpen || state.stage === 'end';
  const showMobileControls =
    isTouch &&
    state.stage === 'play' &&
    !state.paused &&
    !state.dialogueOpen;

  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        <div className={`app ${isTouch ? 'touch' : 'desktop'}`}>
          {state.stage === 'title' && (
            <TitleStage onDone={() => dispatch({ type: 'START_BUS' })} />
          )}
          {state.stage === 'bus' && (
            <BusStage onDone={() => dispatch({ type: 'START_PLAY' })} />
          )}
          {(state.stage === 'play' || state.stage === 'end') && (
            <>
              <Scene
                isTouch={isTouch}
                paused={scenePaused}
                hasSpokenToApplicant={state.hasSpokenToApplicant}
                onNearNpc={setNearNpc}
                onNearTable={setNearTable}
                moveRef={moveRef}
                lookRef={lookRef}
              />
              <Hud
                objective={
                  state.stage === 'play' && !state.paused
                    ? state.objective
                    : null
                }
                contextPromptLabel={contextPromptLabel}
                muted={state.muted}
                onToggleMute={() => dispatch({ type: 'TOGGLE_MUTE' })}
                onOpenPause={() => dispatch({ type: 'TOGGLE_PAUSE' })}
                isTouch={isTouch}
              />
              {showMobileControls && (
                <MobileControls
                  moveRef={moveRef}
                  lookRef={lookRef}
                  onInteract={onInteractMobile}
                  showInteract={!!contextPromptLabel}
                  interactLabel={contextPromptLabel ?? ''}
                />
              )}
              {state.dialogueOpen && (
                <Dialogue
                  onClose={(choice) =>
                    dispatch({ type: 'CLOSE_DIALOGUE', choice })
                  }
                />
              )}
              {state.paused && state.stage === 'play' && (
                <PauseMenu
                  isTouch={isTouch}
                  muted={state.muted}
                  onResume={() => dispatch({ type: 'TOGGLE_PAUSE' })}
                  onRestart={() => dispatch({ type: 'RESET' })}
                  onToggleMute={() => dispatch({ type: 'TOGGLE_MUTE' })}
                />
              )}
              {state.stage === 'end' && (
                <EndStage
                  onContinue={() => dispatch({ type: 'DISMISS_END' })}
                  onRestart={() => dispatch({ type: 'RESET' })}
                />
              )}
            </>
          )}
        </div>
      </GameDispatchContext.Provider>
    </GameStateContext.Provider>
  );
}
