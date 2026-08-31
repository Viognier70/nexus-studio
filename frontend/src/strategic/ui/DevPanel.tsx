// ORDER 043 B.1 dev-only visible readout.
//
// Renders capital values and the last key the sim-shortcut handler
// processed, so the Vision Owner can verify (a) the value the S/E/C
// keys actually set and (b) that the keypress reached the handler at
// all — without opening the browser dev tools.
//
// Wrapped in `import.meta.env.DEV` so Vite strips this at production
// build time; no numeric HUD ships to a player build.
//
// Layout: bottom-left corner, small monospace strip. Opposite the
// ScenarioOverlay (bottom-centre) so they never overlap.
//
// Removed at ORDER 043 B.3 alongside the S/E/C dev shortcuts, when
// the wager UI + scenario-driven capital movement replace the manual
// cycle keys.

import { useEffect, useRef, useState } from 'react';
import { useCamera } from '../camera/CameraContext';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { economicReadingNormalised } from '../simulation/cashReading';
import { useSimState } from '../simulation/SimulationProvider';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { businessHasSeats } from '../business/businessClass';
import { businessRoomRef } from '../scene/interiorSharedState';
import { fpsMeter } from '../../lib/fpsMeter';
import { pixelSampler } from '../../lib/pixelSampler';
import { harnessParams } from '../testHarness/urlParams';

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: 8,
  left: 8,
  padding: '6px 10px',
  background: 'rgba(20, 14, 10, 0.82)',
  color: '#f5f0e0',
  border: '1px solid #7a6a4a',
  borderRadius: 3,
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 11,
  lineHeight: 1.5,
  letterSpacing: 0.2,
  pointerEvents: 'none',
  zIndex: 45,
  whiteSpace: 'pre'
};

interface Props {
  lastKey: string;
}

export function DevPanel({ lastKey }: Props) {
  if (!import.meta.env.DEV) return null;
  const sim = useSimState();
  // Vision Owner 2026-08-15 — seat-diagnos next to the waiting
  // readout. Same reason the camera distance got its own suffix in
  // ORDER 090 §5: when the room reports "waiting=N" and nothing
  // appears to be happening, the answer is usually "capacity is
  // already full" or "the flat-seat list drifted from the reducer's
  // capacity." Making both visible on the same strip skips a console
  // dive. `layout.seats.length` is the runtime echo of TOTAL_SEATS —
  // if it disagrees with policies.capacity, a `!` suffix flags the
  // drift so the mismatch cannot be silently missed.
  // ORDER 113 fel 1 uppföljning — passera businessClass så foodtruck
  // får `null` tillbaka (ingen matsal). Utan detta returnerade hooken
  // restaurangens 16-stols-interior även för foodtruck och DRIFT-flaggan
  // sköt permanent falskt larm eftersom layoutSeats=16 vs capacity=9.
  const layout = usePlayerBusinessInterior(sim.businessClass);
  // ORDER 090 §5 (finding 3) — camera distance polled on the same
  // 250 ms cadence as FPS. Interior scene (guests, staff, tables)
  // is culled outside restaurantInteriorFade [mid−half, mid+half],
  // i.e. 35–75 m at current constants. Playtest 2026-08-14 reported
  // "waiting=5 but no guests visible" — the camera was at the
  // village preset (900 m), far outside the fade band, so nothing
  // interior renders. Making the distance visible directly on the
  // dev strip means "why is the room empty?" is answered without
  // opening the console.
  const camera = useCamera();
  const c = sim.capitals.values;
  const econReading = economicReadingNormalised(sim);
  const d = sim.day;
  // ORDER 055 Del F — pull FPS from the shared meter every 250 ms so
  // the readout ticks visibly without triggering a re-render on every
  // frame. The FpsProbe inside Canvas writes to the meter at ~2 Hz.
  const [fps, setFps] = useState(0);
  // ORDER 061 point 3 — pixel sample readout at screen centre. Same
  // 250 ms poll cadence as FPS so both readouts stay in sync.
  const [rgb, setRgb] = useState<{ r: number; g: number; b: number }>({ r: 0, g: 0, b: 0 });
  const [camDist, setCamDist] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setFps(fpsMeter.fps);
      setRgb({ r: pixelSampler.r, g: pixelSampler.g, b: pixelSampler.b });
      setCamDist(camera.actualRef.current.distance);
    }, 250);
    return () => window.clearInterval(id);
  }, [camera]);
  // Service progress readout: "5:23 / 10 min" when a service is
  // running, "-" otherwise. Player-facing text never shows numbers
  // (§9), but the dev strip does — it's the only surface where a
  // countdown belongs.
  const serviceReadout =
    d.currentServiceLengthMinutes === null
      ? '-'
      : (() => {
          const elapsed = sim.simTime - d.periodStartAt;
          const totalSec = d.currentServiceLengthMinutes * 60;
          const rem = Math.max(0, totalSec - elapsed);
          const m = Math.floor(rem / 60);
          const s = Math.floor(rem % 60);
          return `${m}:${s.toString().padStart(2, '0')} / ${d.currentServiceLengthMinutes}min`;
        })();
  // Live interior counts. `waiting=` on the weather line is the
  // *forecast* (waitingAtOpening) — the queue-length prediction fed
  // by reputation × weather at doors-open. That number is stable
  // across a service. What actually matters when the room reads as
  // empty is the LIVE queue, live seated count, and the capacity
  // ceiling that stops seating even when guests are queued.
  // ORDER 115 §3 DoD 5 — "queue= och seated= i DevPanel motsvarar
  // antalet renderade figurer". Före ORDER 115 räknade queue endast
  // waitingIds och seated endast seatedIds → i foodtruck-läge visade
  // raden noll medan 4 gäster syntes i ordering/paying/eating-state.
  //
  // För foodtruck omdefinieras raden så den matcher vad
  // FoodtruckScene faktiskt renderar:
  //   * queue = alla vid vagnen (waiting + arriving + ordering + paying)
  //     = "på gatan framför luckan, i kön eller vid disken"
  //   * seated = alla vid uteplatsen (eating)
  //     = "sitter/står vid ståborden och äter"
  // Övriga verksamheter (restaurant, värdshus) behåller den gamla
  // avläsningen: queue=waitingIds, seated=seatedIds.
  const isFoodtruck = sim.businessClass === 'foodtrucken';
  const queueLive = isFoodtruck
    ? sim.guests.filter((g) =>
        g.state === 'waiting' || g.state === 'arriving' ||
        g.state === 'ordering' || g.state === 'serving' || g.state === 'paying'
      ).length
    : sim.waitingIds.length;
  const seatedLive = isFoodtruck
    ? sim.guests.filter((g) => g.state === 'eating').length
    : sim.seatedIds.length;
  // ORDER 147 — breakdown av gäster som sitter, per underskikt.
  // `seated=N/cap` visar SEATEDIDS.LENGTH (verklig upptagenhet). Den är
  // teknisk-korrekt sedan ORDER 097, men etiketten "seated" är lätt att
  // sammanblanda med gäst-tillståndet `state='seated'` (som är transient
  // — 4 sim-sek innan → ordering). En observatör som såg `stateSeated=0`
  // i konsollen och `seated=16/16` i panelen kunde felaktigt tro att
  // panelen ljög. Breakdown (S:seated O:ordering D:dining P:paying)
  // visar underskiktet så samma observatör ser att S=0 är gäster som
  // hunnit vidare, inte gäster som saknas. Se ORDER 146 rapport.
  //
  // Foodtruck lämnas oförändrad: dess seatedLive räknar `state='eating'`
  // (uteplatsen), inte seatedIds. Underskiktet skulle bara duplicera
  // signalen — foodtruckens gäster har inte fyra sub-tillstånd att bryta
  // ner.
  const seatBreakdown = isFoodtruck
    ? ''
    : (() => {
        let s = 0, o = 0, d = 0, p = 0;
        for (const g of sim.guests) {
          if (g.state === 'seated') s++;
          else if (g.state === 'ordering') o++;
          else if (g.state === 'dining') d++;
          else if (g.state === 'paying') p++;
        }
        return ` (S:${s} O:${o} D:${d} P:${p})`;
      })();
  const capacity = sim.policies.capacity;
  // ORDER 157 §2 — provspelet 2026-08-31: ölkrogen visade
  // `seated=0/20!layout=16`. `capacityFor()` säger 20 (rätt per
  // businessClass.ts) medan `interiorLayout.seats.length` fortfarande
  // är 16 (restaurantsspecifik). ORDER 150 monterade rummets faktiska
  // kapacitet i `businessRoomRef.current.capacity` (20 för ölkrogen,
  // 16 för kvarterskrogen); vi läser därifrån när klassen matchar och
  // faller tillbaka på layout.seats.length för äldre kod / klasser
  // vars scen ännu inte skriver refen. Följdverkan: drift-varningen
  // (!layout=X) triggar bara på ÄKTA drift — kontraktets kapacitet ≠
  // policies.capacity — inte längre på restaurantsspecifik shape.
  const roomChan = businessRoomRef.current;
  const roomChanCapacity =
    roomChan?.businessClass === sim.businessClass ? roomChan.capacity : null;
  const layoutSeats = roomChanCapacity ?? layout?.seats.length ?? 0;
  // ORDER 114 §5 DoD 8 — `scene=` räknar ALLA scen-relevanta figurer
  // (inklusive leaving/declined som är på väg ut). queue+seated
  // motsvarar vad SPELAREN läser som "aktiva gäster"; scene motsvarar
  // exakt antalet [data-figure]-noder som renderas.
  // ORDER 115 rev 2 — 'serving' är 2.5-sek överlämningsfasen mellan
  // ordering och paying; den ska räknas i scen-siffran precis som
  // paying gör, annars droppar sceneLive under serving-fönstret även
  // om FoodtruckScene renderar figuren.
  const SCENE_RELEVANT_STATES = new Set(['arriving', 'waiting', 'ordering', 'serving', 'paying', 'eating', 'leaving', 'declined']);
  const sceneLive = sim.guests.filter((g) => SCENE_RELEVANT_STATES.has(g.state)).length;
  // ORDER 113 fel 1 uppföljning — DRIFT-check gate:ad på verksamhet.
  // För foodtruck (`hasSeats=false`) är layout==null ett förväntat
  // tillstånd, inte drift. Layout-seats-vs-capacity-jämförelsen är en
  // restaurangs- / värdshusspecifik sanity-check: fysiska stolar i
  // scenen ska matcha policies.capacity. Verksamheter utan matsal
  // mäter kapacitet som kö-längd (se `seatsFree` i businessClass.ts),
  // en dimension som layoutSeats inte försöker representera. Utan
  // denna gate loggade DevPanel `layout.seats=16 (DRIFT)` permanent
  // för foodtruck där capacity=9 — falsklarm som förblindade riktiga
  // drift-signaler.
  const hasSeats = businessHasSeats(sim.businessClass);
  const seatDrift = hasSeats && layout != null && layoutSeats !== capacity;

  // ORDER 045 weather + world-factor line. Kept compact so the dev
  // panel stays a two-liner most of the time and grows to three
  // only on services where the outer world reports in.
  const weather = d.weather
    ? `${d.weather.tempC}°C  ${d.weather.windMS}m/s  ${d.weather.precipitation}  waiting=${d.waitingAtOpening}`
    : 'no weather (out of service)';
  const factors = d.worldFactors.length > 0
    ? '  factors=' + d.worldFactors.map((f) => f.kind).join(',')
    : '';
  // Seat-diagnos suffix (see comment on `layout` above). Always
  // present — even out-of-service, queueLive/seatedLive are the
  // authoritative "is anyone in the room right now" readout.
  // ORDER 157 §2 — drift-suffixet kallas nu `!room=X` när det kommer
  // från businessRoom-kontraktet (post-scenmount), och `!layout=X` när
  // det fortfarande är interiorLayout-fallbacken (pre-mount eller
  // klass utan scen). Etiketten pekar på källan som satt talet, så
  // observatören ser var driften ligger utan att gissa.
  const driftLabel = roomChanCapacity != null ? 'room' : 'layout';
  const seatStr = ` queue=${queueLive} scene=${sceneLive} seated=${seatedLive}/${capacity}${
    seatDrift ? `!${driftLabel}=${layoutSeats}` : ''
  }${seatBreakdown}`;

  // Log on-change when the live queue is non-empty. Vision Owner
  // 2026-08-15: "waiting=4, ingen sitter" → the console needs to
  // show at which tuple (queue, seated, capacity, layoutSeats) the
  // room stops seating. Fires only in DEV, ratelimited by tuple
  // change (identity, not time), so a stable state doesn't spam.
  const lastLoggedRef = useRef<string>('');
  useEffect(() => {
    if (queueLive === 0) return;
    // ORDER 147 — inkludera breakdown i konsol-logg också så samma
    // underskikt syns där som i DevPanel-strängen. Nyckeln utökas
    // också: annars log:as raden inte om bara sub-tillstånden ändras
    // (t.ex. gäster går från seated → ordering utan att seatedLive
    // förändras). Att fånga sub-övergångarna är hela poängen med
    // breakdown — så log:a när något underskikt rör sig.
    const key = `${queueLive}|${seatedLive}|${capacity}|${layoutSeats}|${seatBreakdown}`;
    if (key === lastLoggedRef.current) return;
    lastLoggedRef.current = key;
    // eslint-disable-next-line no-console
    console.info(
      '[interior] queue=%d seated=%d/%d layout.seats=%d%s%s',
      queueLive, seatedLive, capacity, layoutSeats,
      seatDrift ? '  (DRIFT)' : '',
      seatBreakdown
    );
  }, [queueLive, seatedLive, capacity, layoutSeats, seatDrift, seatBreakdown]);
  // ORDER 056 Del A — label "strat" so the strategic FPS is
  // distinguishable from the first-person view's separate overlay.
  const fpsStr = fps > 0 ? `${fps.toString().padStart(3, ' ')}fps(strat)` : ' - fps(strat)';
  // ORDER 090 §5 (finding 3) — interior visibility uses
  // `visibility = 1 − smoothstep(mid−half, mid+half, dist)`; the
  // group's `visible = visibility > 0.02`. So the interior is fully
  // visible below `mid − half`, fades through the band, and is
  // fully culled at/above `mid + half`. A `*` suffix on the readout
  // flags "camera is close enough that the interior renders at all"
  // — no suffix = camera is past the fade band's far edge and
  // seated guests / staff / tables are silently gone regardless of
  // sim state. The band bounds are printed alongside for context.
  const interiorMin = GRAY_BOX_CAMERA.restaurantInteriorFadeMid - GRAY_BOX_CAMERA.restaurantInteriorFadeHalf;
  const interiorMax = GRAY_BOX_CAMERA.restaurantInteriorFadeMid + GRAY_BOX_CAMERA.restaurantInteriorFadeHalf;
  const interiorRenders = camDist < interiorMax;
  const camStr = `cam=${camDist.toFixed(0).padStart(3, ' ')}m${interiorRenders ? '*' : ' '}[${interiorMin}-${interiorMax}]`;
  const line1 = `DEV  ${fpsStr}  ${camStr}  day=${d.dayNumber} ${d.period.padEnd(9)}  service=${serviceReadout.padEnd(14)}  scenarios=${d.scenariosFiredThisService}/${d.scenariosPlanned}`;
  const cashK = Math.round(sim.cash / 1000);
  // ORDER 102 — R1 kunskapskapital dev-readout. Läses under `capitals`-
  // raden så det syns bredvid soc/eco/rep. Ingen siffra visas i spelar-
  // UI (R3 §1.4 / EDD §7); detta är enbart dev-diagnos, samma pattern
  // som queue=/seated= i ORDER 097.
  const kc = sim.knowledgeCredits;
  const creditsStr = `credits=E${kc.episteme.toFixed(2)} T${kc.techne.toFixed(2)} P${kc.phronesis.toFixed(2)}`;
  const line2 = `     cash=${cashK.toString().padStart(4, ' ')}k  econR=${econReading.toFixed(2)}  soc=${c.social.toFixed(2)}  eco=${c.ecological.toFixed(2)}  rep=${sim.reputation.toFixed(2)}  ${creditsStr}  key=${lastKey || '-'}`;
  const line3 = `     ${weather}${factors}${seatStr}`;
  // ORDER 061 point 3 — post-tone-map pixel at screen centre.
  // Vision Owner aims the crosshair at a roof face; this reads the
  // sRGB value being displayed. R170 G120 B100 → math is right and
  // atmosphere/fog is muting saturation; <R100 → shadow or normal
  // still wrong.
  const line4 = `     pixel(centre) R=${rgb.r.toString().padStart(3, ' ')} G=${rgb.g.toString().padStart(3, ' ')} B=${rgb.b.toString().padStart(3, ' ')}`;
  // ORDER 081 — playtest mode hides the aiming reticle and the
  // pixel-probe line. The day/period/cash lines stay because they
  // are useful in a debrief; the diagnostic aim + colour readout
  // add noise to a "does it feel good" assessment.
  const hideDiagnostic = harnessParams.playtest;
  const panelText = hideDiagnostic
    ? `${line1}\n${line2}\n${line3}`
    : `${line1}\n${line2}\n${line3}\n${line4}`;
  return (
    <>
      <div style={PANEL_STYLE}>{panelText}</div>
      {!hideDiagnostic && <CenterCrosshair />}
    </>
  );
}

// ORDER 061 point 3 — 12 px crosshair centred on the viewport so the
// Vision Owner sees exactly where the pixel sample lands. Pointer-
// events off — never interferes with camera drag.
const CROSS_H_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 'calc(50% - 6px)',
  top: 'calc(50% - 1px)',
  width: 12,
  height: 2,
  background: 'rgba(255, 240, 100, 0.85)',
  pointerEvents: 'none',
  zIndex: 46
};
const CROSS_V_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 'calc(50% - 1px)',
  top: 'calc(50% - 6px)',
  width: 2,
  height: 12,
  background: 'rgba(255, 240, 100, 0.85)',
  pointerEvents: 'none',
  zIndex: 46
};
function CenterCrosshair() {
  return (
    <>
      <div style={CROSS_H_STYLE} />
      <div style={CROSS_V_STYLE} />
    </>
  );
}
