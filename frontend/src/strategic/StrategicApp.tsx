import type { PlayerRegistration } from './types';
import { useBusiness } from './business/BusinessContext';
import { ServiceCamera } from './camera/ServiceCamera';
import { SoundDirector } from './ui/sound/SoundDirector';
import { LevelBar } from './ui/LevelBar';
import { VillageNotice } from './ui/VillageNotice';
import { QueuePanel } from './ui/service/QueuePanel';
import { ServiceTabs } from './ui/service/ServiceTabs';
import { TillBar } from './ui/service/TillBar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BusinessProvider } from './business/BusinessContext';
import { NameEntryOverlay } from './business/NameEntryOverlay';
import { MentorPanel } from './ui/MentorPanel';
import { CameraProvider, useCamera } from './camera/CameraContext';
import { useDesktopControls } from './camera/useDesktopControls';
import { useTouchControls } from './camera/useTouchControls';
import type { Landmark } from './content/world';
import { LANDMARK_BY_ID } from './content/world';
import { AgencyOfferPanel } from './scenario/AgencyOfferPanel';
import { EveningAccountPanel } from './scenario/EveningAccountPanel';
import { OpeningPanel } from './scenario/OpeningPanel';
import { ScenarioOverlay } from './scenario/ScenarioOverlay';
import { DayActionBar } from './scenario/DayActionBar';
import { EveningBar } from './scenario/EveningBar';
import { IncidentCard } from './scenario/IncidentPanel';
import { ClosedBox } from './economy/ClosedBox';
import { RivalBand } from './ui/host/RivalBand';
import { NoBusinessBox } from './economy/NoBusinessBox';
import { MaltidensHusDialog } from './knowledge/ui/MaltidensHusDialog';
import { BankDialog } from './economy/BankDialog';
import { NewspaperDialog, useNewspaper } from './economy/NewspaperDialog';
import { SaveProvider, useSave } from './save/SaveContext';
import { SaveMenu } from './save/SaveMenu';
import { RoomGrade } from './ui/RoomGrade';
import { DayBadge } from './ui/DayBadge';
import { StrategicScene } from './scene/StrategicScene';
import { DollhouseFrame } from './ui/DollhouseFrame';
import { harnessParams } from './testHarness/urlParams';
import { SimulationProvider, useSimDispatch, useSimState } from './simulation/SimulationProvider';
import { AboutPanel } from './ui/AboutPanel';
import { RulesPanel } from './ui/RulesPanel';
import { StatusButton } from './ui/StatusButton';
import { FocusMode } from './ui/FocusMode';
import { KnowledgeFoundationLayer, openCredits } from './knowledge/ui/KnowledgeFoundation';
import { PrepHint } from './ui/service/PrepHint';
import { ControlsHint } from './ui/ControlsHint';
import { DevPanel } from './ui/DevPanel';
import { EventsPanel } from './ui/service/EventsPanel';
import { primeStreamAudio } from './ui/streamArrivalCue';
import { SpeedToggle } from './ui/SpeedToggle';
import { TopRightMenu } from './ui/TopRightMenu';
import { SelectionChrome } from './ui/SelectionChrome';
import { VerifyBadge } from './ui/VerifyBadge';
import { ViewLabel } from './ui/ViewLabel';
import { detectWebGL, WebGLFallback } from '../webgl/WebGLFallback';
import { devToggles } from '../lib/devToggles';
import './strategic.css';
import { ServiceClock } from './ui/service/ServiceClock';
import { CashCounter } from './ui/CashCounter';
import { MorningBuyScreen } from './business/MorningBuyScreen';
import { useLanguage } from '../content/language';
import { RoomNotices } from './ui/service/RoomNotices';
import { CameraButtons } from './ui/CameraButtons';
import { RoomCameraBounds } from './camera/RoomCameraBounds';
import { HudBottom } from './ui/service/HudBottom';
import { MoodMeter } from './ui/host/MoodMeter';

interface StrategicAppProps {
  // ORDER 267 — introduktionen börjar (ORDER 300: efter registreringen).
  startIntroduction?: boolean;
  // ORDER 300 §4 — "Nytt spel" på startrutan: registreringen (namn och
  // samtycke) och sedan första morgonen.
  onNewGame?: (player: PlayerRegistration) => void;
  player?: PlayerRegistration;
}

export function StrategicApp({ startIntroduction = false, onNewGame, player }: StrategicAppProps = {}) {
  const [webglOk] = useState<boolean>(() => detectWebGL());
  // ORDER 273 — språkbytet (menyn) ritar om hela gränssnittet: roten ritas
  // om när språket byts, och alla komponenter under läser `strings` på nytt.
  // Ingen nyckel (remount), så speltillståndet och scenen står kvar.
  useLanguage();
  if (!webglOk) {
    return <WebGLFallback onRestart={() => window.location.reload()} />;
  }
  return (
    <BusinessProvider>
      <CameraProvider>
        <SimulationProvider seed={harnessParams.seed ?? undefined} startIntroduction={startIntroduction} player={player}>
          <SaveProvider>
            <StrategicShell />
            <NameEntryOverlay onNewGame={onNewGame} />
            <SaveMenu />
          </SaveProvider>
        </SimulationProvider>
      </CameraProvider>
    </BusinessProvider>
  );
}

function StrategicShell() {
  const hostRef = useRef<HTMLDivElement>(null);
  // ORDER 289 — morgonen visas först när krogen har ett namn.
  const { hasName } = useBusiness();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  // ORDER 264 — Måltidens hus öppnas från morgonens rad.
  const [houseOpen, setHouseOpen] = useState(false);
  // ORDER 280 — morgonens inköp (Designs M1).
  const [buyOpen, setBuyOpen] = useState(false);
  // ORDER 265 — banken öppnas från morgonens rad.
  const [bankOpen, setBankOpen] = useState(false);
  // ORDER 267 — söndagstidningen.
  const newspaper = useNewspaper();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // ORDER 043 B.1 dev readout — the last key the shortcut handler
  // processed. Renders in DevPanel (dev-only) so the Vision Owner can
  // verify a keypress actually reached the handler without opening
  // browser dev tools.
  const [lastKey, setLastKey] = useState('');
  // ORDER 053 Del D — dev-only scale-reference toggle (G).
  const [showScaleRef, setShowScaleRef] = useState(false);
  const { focusOn, jumpToPreset, atLevel4 } = useCamera();
  const simDispatch = useSimDispatch();
  // ORDER 293 — provspel av händelserna: #playtest=1&rocket=<id> köar raketen
  // när dörrarna öppnar, en gång per kväll.
  const simForRocket = useSimState();
  const queuedRocketDay = useRef(-1);
  useEffect(() => {
    const id = harnessParams.rocket;
    if (!id || !simForRocket.day.doorsOpenedThisService || queuedRocketDay.current === simForRocket.day.dayNumber) return;
    queuedRocketDay.current = simForRocket.day.dayNumber;
    simDispatch({ type: 'QUEUE_INCIDENT', incidentId: id });
  }, [simForRocket.day.doorsOpenedThisService, simForRocket.day.dayNumber, simDispatch]);
  const save = useSave();

  const getHost = useCallback(() => hostRef.current, []);
  useDesktopControls({
    enabled: true,
    targetElement: getHost,
    onJumpPreset: jumpToPreset
  });
  useTouchControls({ enabled: true, targetElement: getHost });

  // ORDER 048 §8 — install the audio-unlock listeners at mount so the
  // first real user gesture (any click, key, or touch) resumes the
  // AudioContext. Without this the stream arrival cue is silent for
  // the entire session because browsers keep the context suspended
  // until an actual gesture. Idempotent — safe to call every render.
  useEffect(() => {
    primeStreamAudio();
  }, []);

  // Dev shortcuts alongside the camera-preset digit keys 1–4:
  //   5 — trigger the walk-in-of-five scenario now (bypasses the 30-s
  //       auto-trigger; useful for one-and-done playtest)
  //   R — reset the simulation only (scenario, guests, tick counter,
  //       seatedIds). Explicitly scoped to simDispatch — this handler
  //       does not touch BusinessContext, and there is no other code
  //       path in the app that can null `business.name` once set (the
  //       only mutator, BusinessContext.setName, filters empty inputs).
  //       If a full reset including the business name is ever needed,
  //       browser reload (Cmd+R / Ctrl+R) is the intended path.
  //
  //   ORDER 043 B.1 gate shortcuts — no numeric HUD, no on-screen
  //   readout; the room itself is the reading. Cycle the capital
  //   through [1.0, 0.7, 0.4, 0.15, 0.0] to see the phenomenon respond.
  //   Bindings moved off letter mnemonics (s/e/c) 2026-08-08 after
  //   `e` collided with camera yaw-rotate; the punctuation triplet
  //   , . / has no overlap with camera (q/e/1-4/Esc) or sim shortcuts
  //   (5/r) and reads as an obvious dev keybind — no player would
  //   press comma expecting a game effect.
  //     , — social capital cycle (watch the queue grow / shrink)
  //     . — economic capital cycle (watch tables empty, walk-aways rise)
  //     / — ecological capital cycle (watch the delivery van cadence)
  //   These get removed at B.3 when the wager UI + scenario-driven
  //   capital movement replace them.
  //
  // Modifier keys are ignored so that Cmd+R / Ctrl+R (browser reload)
  // and any future keyboard chords aren't hijacked by the dev handler.
  // Ignored when an <input> or <textarea> has focus (name-entry etc.)
  // so typing a business name doesn't accidentally trigger scenarios.
  useEffect(() => {
    const cycleSteps = [1.0, 0.7, 0.4, 0.15, 0.0];
    const cyclePosition: Record<'economic' | 'social' | 'ecological', number> = {
      economic: 0, social: 0, ecological: 0
    };
    // ORDER 050 §3 (2026-08-10) — economic now dispatches SET_CASH
    // (SEK) rather than SET_CAPITAL (0..1). The cycle step maps to
    // 0..2× starting cash so keyboard sweeps still visibly move the
    // arrivals/walk-away curves.
    const CASH_CYCLE_SEK = [240_000, 168_000, 96_000, 36_000, 0];
    const cycle = (cap: 'economic' | 'social' | 'ecological') => {
      cyclePosition[cap] = (cyclePosition[cap] + 1) % cycleSteps.length;
      if (cap === 'economic') {
        simDispatch({
          type: 'SET_CASH',
          valueSek: CASH_CYCLE_SEK[cyclePosition[cap]]
        });
      } else {
        simDispatch({
          type: 'SET_CAPITAL',
          capital: cap,
          value: cycleSteps[cyclePosition[cap]]
        });
      }
    };
    const onKey = (event: KeyboardEvent) => {
      // ORDER 047 §8 — Shift+C forces a service collapse (DEV only).
      // Handled BEFORE the meta/ctrl/alt guard so Shift stays allowed;
      // other modifier chords still short-circuit. Guarded by
      // import.meta.env.DEV so it never ships in a prod build (Vite
      // tree-shakes the branch away).
      if (
        import.meta.env.DEV &&
        event.shiftKey &&
        (event.key === 'C' || event.key === 'c')
      ) {
        const t = event.target as HTMLElement | null;
        if (t?.tagName !== 'INPUT' && t?.tagName !== 'TEXTAREA') {
          setLastKey('Shift+C');
          simDispatch({ type: 'FORCE_COLLAPSE' });
          event.preventDefault();
          return;
        }
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Record every reachable keypress for the DevPanel readout so
      // the Vision Owner can see whether a key even reached the
      // handler — separate from whether it hit a binding.
      setLastKey(event.key);
      if (event.key === '5') simDispatch({ type: 'TRIGGER_SCENARIO' });
      if (event.key === 'r' || event.key === 'R') simDispatch({ type: 'RESET' });
      if (event.key === ',') cycle('social');
      if (event.key === '.') cycle('economic');
      if (event.key === '/') cycle('ecological');
      // ORDER 053 Del D — G toggles the scale reference. Guarded by
      // import.meta.env.DEV so it never fires in production.
      if (
        import.meta.env.DEV &&
        (event.key === 'g' || event.key === 'G')
      ) {
        setShowScaleRef((v) => !v);
      }
      // ORDER 056 Del A — J toggles the season dev override so 21 Jun
      // and 25 Sep sun paths can be compared in the browser. Default
      // is autumn (25 Sep); the toggle flips summer/autumn.
      // ORDER 303 G — flyttad från H, som nu är fokusläget.
      if (
        import.meta.env.DEV &&
        (event.key === 'j' || event.key === 'J')
      ) {
        devToggles.toggleSeason();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [simDispatch]);

  const handleSelect = useCallback(
    (landmark: Landmark) => {
      setSelectedId(landmark.id);
      focusOn({ x: landmark.position[0], z: landmark.position[1] });
    },
    [focusOn]
  );

  const selected = selectedId ? LANDMARK_BY_ID[selectedId] ?? null : null;

  return (
    <div className="gb-root">
      <RoomGrade />
      <div ref={hostRef} className="gb-canvas-host">
        {/*
          TEMPORÄR växel (Vision Owner-begäran 2026-08-15): två villkor,
          inte ett globalt läge — dockskåpet ersätter 3D-scenen ENDAST i
          nivå 4 (din verksamhet). Nivåerna 1–3 (byn, kvarteret, ditt
          kvarter) förblir 3D enligt SD-003 §3. Dockskåpet lever på
          verksamhets-lagret, inte över hela världen.

          Villkor:
            harnessParams.dollhouse && atLevel4  → DollhouseFrame (ingen
                                                    3D, ingen kamera-input)
            annars                                → StrategicScene (3D som
                                                    vanligt)

          `atLevel4` från CameraContext flippas vid distance-tröskeln
          `restaurantRoofFadeMid − restaurantRoofFadeHalf` (28 m —
          myBusiness-preset:et landar där). Keyboard 1/2/3 (nivå 1–3) tar
          spelaren ut ur nivå 4 → StrategicScene monteras om och 3D är
          tillbaka; 4 (nivå 4) tar in i dockskåpet igen. Ingen permanent
          koppling; food truck-ordern (SD-003 §8 följdorder 3) landar
          den riktiga inflätningen.
        */}
        {harnessParams.dollhouse && atLevel4 ? (
          <DollhouseFrame />
        ) : (
          <StrategicScene
            onSelect={handleSelect}
            selectedId={selectedId}
            showScaleRef={showScaleRef}
          />
        )}
      </div>
      <ViewLabel />
      <VerifyBadge />
      {/* ORDER 280 — Designs K1: dagen till vänster, klockan i mitten,
          kassan och krediterna, farten och menyn till höger. Kontot
          (PlayerPanel) står inte längre i raden; kassan är rutan. */}
      <div className="gb-topleft">
        <DayBadge />
        {/* ORDER 296 — bandet i byn under klockan och kvällskassan, lika brett som de två. */}
        <div className="nx-hud-stack">
          <div className="nx-hud-row">
            <ServiceClock />
            {/* ORDER 290 — Designs serviceläget: kvällskassan bredvid klockan. */}
            <TillBar />
          </div>
          <RivalBand />
          {/* ORDER 300 §6 — vad spelaren kan göra före dörröppningen. */}
          <PrepHint />
        </div>
        {/* ORDER 299b — Stämningen i rummet till höger om kassan (Designs D1 §5);
            bredvid kolumnen, så att bandet under klockan och kassan inte blir bredare. */}
        <MoodMeter />
      </div>
      {/* ORDER 288 — fyra nivåer med egna knappar och tangenter (byn och
          tillbaka med V som i ORDER 290), och byns aviseringar. */}
      <div className="nx-hud-tools">
        {/* ORDER 299 — kamerans knappar (vrid, zooma, återställ). */}
        <CameraButtons />
        {/* ORDER 303 F — statusläget (S). */}
        <StatusButton />
        <LevelBar />
      </div>
      <VillageNotice />
      {/* ORDER 290 — Designs serviceläget: panelerna som tre flikar nere till vänster. */}
      <ServiceTabs />
      {/* ORDER 292 — kön vid dörren och vågorna under servicen. */}
      <QueuePanel />
      <div className="gb-topright">
        <CashCounter />
        <SpeedToggle />
        <TopRightMenu onOpenAbout={() => setAboutOpen(true)} onOpenRules={() => setRulesOpen(true)} onOpenCredits={openCredits} onOpenSave={save.openMenu} />
      </div>
      {/* ORDER 300 §6 — den separata knappen Tillbaka är borttagen; nivåraden och Esc (Krogen) räcker. */}
      <ControlsHint />
      <SelectionChrome
        landmark={selected}
        onClose={() => setSelectedId(null)}
      />
      <ScenarioOverlay />
      {/* ORDER 280 — händelserna i högerkanten (Designs H1), med Back your knowledge. */}
      <EventsPanel mode="back" />
      <DayActionBar
        onOpenHouse={() => setHouseOpen(true)}
        onOpenBank={() => setBankOpen(true)}
        onOpenNewspaper={newspaper.available ? newspaper.openAgain : undefined}
        onOpenBuy={() => setBuyOpen(true)}
        hidden={buyOpen}
        // ORDER 289 — morgonen visas först när krogen har ett namn (utanför
        // introduktionen, där namnet frågas efteråt).
        waitForName={!hasName}
      />
      {/* ORDER 280 — morgonens inköp (Designs M1). */}
      <MorningBuyScreen open={buyOpen} onClose={() => setBuyOpen(false)} />
      <NoBusinessBox hidden={houseOpen || bankOpen} onOpenHouse={() => setHouseOpen(true)} onOpenBank={() => setBankOpen(true)} />
      <BankDialog open={bankOpen} onClose={() => setBankOpen(false)} />
      {/* ORDER 296 — krogen har stängt: säsongen är slut. */}
      <ClosedBox />
      <NewspaperDialog
        open={newspaper.open}
        onClose={newspaper.close}
        onOpenBank={() => {
          newspaper.close();
          setBankOpen(true);
        }}
      />
      <EveningBar />
      {/* ORDER 290 — ljudet (Web Audio), efter vad som händer i simuleringen. */}
      <SoundDirector />
      {/* ORDER 290 — kameran till krogen när servicen och raketen börjar. */}
      <ServiceCamera />
      <IncidentCard />
      {/* ORDER 299 — svarens händelser som notiser i rummets fria del. */}
      <RoomNotices />
      <RoomCameraBounds />
      <HudBottom />
      <MaltidensHusDialog open={houseOpen} onClose={() => setHouseOpen(false)} />
      {/* ORDER 271 — mentorn (M1/M2) inne i .gb-root, så att banken, huset och tidningen ligger över den. */}
      <MentorPanel />
      {/*
        ORDER 090 §6 — panels flow inside two PanelColumns instead of
        each picking its own `position: absolute; top: N` value. See
        ui/PanelColumn.tsx for the anchor/flow contract and
        scene/__tests__/panelLayout.smoke.test.tsx for the
        no-overlap regression across 1280×720, 1920×1080, 2560×1440.

        Left column: TeamPanel above the InvestmentPanel + ScaleDownPanel
        pair (row wrapper keeps the "grow-forward / retreat" side-by-side
        design from ORDER 049 §5.3 intact when TeamPanel grows).

        Right column: single stack, period-mutually-exclusive children.
        MorningActivityPanel shows during morning; EventStream +
        Instruments + RoomCardPanel show during service. They never
        render at the same time.
      */}
      {/* ORDER 291 punkt 8 — laget, investeringen och skala ner visas i
          morgonens Rummet och personalen (DayActionBar, RoomAndStaff). */}
      {/* ORDER 290 — högerkolumnen är tom i v1: mätarna ligger i fliken Rummet
          (ServiceTabs); InstrumentsPanel och RoomCardPanel visas inte (ORDER
          270, ORDER 112). */}
      {/* ORDER 290 — lagret och mise en place ligger i fliken Lagret (ServiceTabs). */}
      <AgencyOfferPanel />
      <OpeningPanel />
      <EveningAccountPanel />
      <DevPanel lastKey={lastKey} />
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
      {/* ORDER 303 G — fokusläget (under 14 m eller H). */}
      <FocusMode />
      {/* ORDER 300 §5 — regelkortet första morgonen och sidan i menyn. */}
      <RulesPanel open={rulesOpen} onClose={() => setRulesOpen(false)} />
      {/* ORDER 301 — Kunskapsgrunden i Måltidsbiblioteket och eftertexterna. */}
      <KnowledgeFoundationLayer />
    </div>
  );
}
