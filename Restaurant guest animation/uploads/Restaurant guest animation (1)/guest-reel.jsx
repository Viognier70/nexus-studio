// guest-reel.jsx — "GUEST_01" restaurant patron animation reel (Modernist).
// Continuous composition: one tree, all choreography keyed to authored T / CUES.

const { CompositionStage, useComposition, Captions, Easing, interpolate, animate } = window;
const { useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakRadio } = window;

const INK = '#201e1d';
const FAR = '#8f8a89';
const ACCENT = '#ec3013';
const GROUND = '#f3f2f2';
const LINE = '#d5d2d1';
const HEAD_F = 'Archivo, system-ui, sans-serif';

const MOTION = {
  enter: (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeOutCubic }),
  pop: (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeOutBack }),
  drift: (kfs) => interpolate(kfs.map((k) => k[0]), kfs.map((k) => k[1]), Easing.easeInOutSine),
};

const win = (T, a, b, f = 0.3) => MOTION.enter(0, 1, a, a + f)(T) * (1 - MOTION.enter(0, 1, b, b + f)(T));
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

const POSE_KEYS = ['lean', 'head', 'hipDrop', 'mouth'];
const LIMB_KEYS = ['armFar', 'armNear', 'legFar', 'legNear'];
function blend(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const o = {};
  POSE_KEYS.forEach((key) => { o[key] = lerp(a[key] || 0, b[key] || 0, k); });
  LIMB_KEYS.forEach((key) => {
    o[key] = [lerp(a[key][0], b[key][0], k), lerp(a[key][1], b[key][1], k)];
  });
  return o;
}

/* ---------- poses (angles in degrees; positive swings forward, +x) ---------- */

const IDLE = { lean: 1, head: 0, hipDrop: 0, mouth: 0, armFar: [5, -9], armNear: [-4, -11], legFar: [3, -4], legNear: [-3, -3] };

function idlePose(T) {
  const b = Math.sin(T * 1.7);
  return Object.assign({}, IDLE, { hipDrop: 1.6 + 1.6 * b, head: 1.6 * Math.sin(T * 1.1), lean: 1 + 0.6 * b });
}

function walkPose(ph, amp) {
  const s = Math.sin(2 * Math.PI * ph);
  const kn = (o) => -10 - 30 * Math.max(0, Math.sin(2 * Math.PI * (ph + o) + 1.15));
  return {
    lean: 5.5,
    head: -2.5 + 1.6 * s,
    hipDrop: 4 * Math.abs(s),
    mouth: 0,
    legNear: [26 * amp * s, kn(0)],
    legFar: [-26 * amp * s, kn(0.5)],
    armNear: [-26 * amp * s, -20 - 12 * Math.max(0, s)],
    armFar: [26 * amp * s, -20 - 12 * Math.max(0, -s)],
  };
}

const SIT = { lean: 3, head: -1, hipDrop: 47, mouth: 0, armFar: [70, -56], armNear: [66, -52], legFar: [84, -86], legNear: [88, -90] };
const SIT_MENU = Object.assign({}, SIT, { lean: 6, head: 6, armFar: [64, -74], armNear: [58, -70] });

function sitHail(T) {
  const w = Math.sin((T) * 9);
  return Object.assign({}, SIT, { lean: 1, head: -4, armNear: [128, -28 - 16 * w], armFar: [58, -60] });
}
function sitWait(T) {
  const tap = Math.max(0, Math.sin(T * 9));
  return Object.assign({}, SIT, {
    lean: -5, head: -7,
    armFar: [94, -122], armNear: [98, -126],
    legNear: [88, -90 + 11 * tap], legFar: [84, -86],
  });
}
function sitEat(T) {
  const c = Math.sin(T * 3.1);
  return Object.assign({}, SIT, {
    lean: 7, head: 4 + 3 * c,
    armNear: [78, -118 - 16 * c], armFar: [60, -62],
    mouth: clamp01(0.5 + 0.5 * Math.sin(T * 3.1 - 0.9)),
  });
}

/* ---------- the figure ---------- */

function Guest({ pose, x, y, scale, showRig, variant }) {
  const p = pose;
  const dot = (cx, cy) => (showRig ? <circle cx={cx} cy={cy} r={5} fill={ACCENT} /> : null);

  const Arm = ({ a, fill }) => (
    <g transform={`translate(0,-96) rotate(${-a[0]})`}>
      <rect x={-9} y={0} width={18} height={48} fill={fill} />
      <g transform={`translate(0,48) rotate(${-a[1]})`}>
        <rect x={-8} y={0} width={16} height={44} fill={fill} />
        <rect x={-9} y={44} width={18} height={15} fill={fill} />
        {dot(0, 0)}
      </g>
      {dot(0, 0)}
    </g>
  );
  const Leg = ({ a, fill }) => (
    <g transform={`rotate(${-a[0]})`}>
      <rect x={-11} y={0} width={22} height={60} fill={fill} />
      <g transform={`translate(0,60) rotate(${-a[1]})`}>
        <rect x={-10} y={0} width={20} height={62} fill={fill} />
        <rect x={-9} y={62} width={34} height={12} fill={fill} />
        {dot(0, 0)}
      </g>
      {dot(0, 0)}
    </g>
  );

  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <g transform={`translate(0,${-122 + p.hipDrop}) rotate(${-p.lean})`}>
        <Leg a={p.legFar} fill={FAR} />
        <Arm a={p.armFar} fill={FAR} />
        <rect x={-31} y={-112} width={62} height={112} fill={INK} />
        <rect x={-34} y={-112} width={68} height={15} fill={ACCENT} />
        <Leg a={p.legNear} fill={INK} />
        <g transform={`translate(0,-112) rotate(${-p.head})`}>
          <rect x={-11} y={-16} width={22} height={18} fill={INK} />
          <rect x={-27} y={-70} width={54} height={58} fill={GROUND} stroke={INK} strokeWidth={4} />
          {variant === 'Cap' ? (
            <g>
              <rect x={-29} y={-78} width={58} height={18} fill={ACCENT} />
              <rect x={27} y={-66} width={26} height={7} fill={ACCENT} />
            </g>
          ) : variant === 'Bun' ? (
            <g>
              <rect x={-29} y={-76} width={58} height={16} fill={INK} />
              <circle cx={-36} cy={-58} r={17} fill={INK} />
            </g>
          ) : (
            <rect x={-29} y={-76} width={58} height={16} fill={INK} />
          )}
          <rect x={7} y={-48} width={8} height={10} fill={INK} />
          <rect x={4} y={-30} width={14} height={2 + p.mouth * 9} fill={INK} />
          {dot(0, 0)}
        </g>
        <Arm a={p.armNear} fill={INK} />
        {showRig && <rect x={-1} y={-112} width={2} height={112} fill={ACCENT} />}
        {dot(0, 0)}
      </g>
      {showRig && <rect x={-90} y={-2} width={220} height={2} fill={ACCENT} opacity={0.55} />}
    </g>
  );
}

/* ---------- room ---------- */

const FLOOR = 820;

function Room({ T, C, opacity }) {
  const lampSway = Math.sin(T * 0.6) * 1.6;
  const cols = [];
  for (let x = -480; x <= 2880; x += 160) cols.push(x);
  return (
    <g opacity={opacity}>
      {cols.map((x) => <rect key={x} x={x} y={0} width={2} height={FLOOR} fill={LINE} />)}
      <rect x={-600} y={300} width={3200} height={2} fill={LINE} />
      <rect x={-600} y={FLOOR} width={3200} height={4} fill={INK} />
      {/* doorway */}
      <rect x={150} y={250} width={250} height={570} fill={GROUND} stroke={INK} strokeWidth={5} />
      <rect x={150} y={250} width={250} height={16} fill={INK} />
      <rect x={355} y={520} width={12} height={40} fill={ACCENT} />
      {/* wall pieces */}
      <rect x={620} y={300} width={116} height={116} fill={ACCENT} />
      <rect x={780} y={300} width={116} height={116} fill="none" stroke={INK} strokeWidth={4} />
      {/* background table */}
      <rect x={520} y={655} width={250} height={11} fill={FAR} />
      <rect x={556} y={666} width={9} height={154} fill={FAR} />
      <rect x={726} y={666} width={9} height={154} fill={FAR} />
      {/* lamp */}
      <g transform={`rotate(${lampSway} 1360 0)`}>
        <rect x={1358} y={0} width={4} height={470} fill={INK} />
        <polygon points="1300,530 1420,530 1400,470 1320,470" fill={INK} />
      </g>
      {/* chair */}
      <rect x={940} y={540} width={17} height={172} fill={INK} />
      <rect x={950} y={700} width={172} height={13} fill={INK} />
      <rect x={958} y={713} width={10} height={107} fill={INK} />
      <rect x={1104} y={713} width={10} height={107} fill={INK} />
      {/* table */}
      <rect x={1170} y={625} width={392} height={16} fill={INK} />
      <rect x={1195} y={641} width={12} height={179} fill={INK} />
      <rect x={1508} y={641} width={12} height={179} fill={INK} />
    </g>
  );
}

/* ---------- props on the table ---------- */

function Props({ T, C }) {
  const menuOp = win(T, C.Order + 0.15, C.Order + 2.5, 0.35);
  const menuLift = MOTION.pop(70, 0, C.Order + 0.15, C.Order + 0.9)(T);
  const plateOp = win(T, C.Serve + 0.35, C.Leave + 0.9, 0.3);
  const plateSlide = MOTION.pop(560, 0, C.Serve + 0.35, C.Serve + 1.35)(T);
  const food = 1 - MOTION.enter(0, 1, C.Serve + 1.6, C.Leave - 0.4)(T);
  const coinOp = win(T, C.Leave + 0.25, C.Sheet - 0.6, 0.25);

  return (
    <g>
      <g opacity={menuOp} transform={`translate(1150,${600 + menuLift}) rotate(-14)`}>
        <rect x={-62} y={-76} width={124} height={152} fill={GROUND} stroke={INK} strokeWidth={5} />
        <rect x={-62} y={-76} width={124} height={22} fill={ACCENT} />
        {[-38, -20, -2, 16, 34, 52].map((y) => (
          <rect key={y} x={-46} y={y} width={92} height={4} fill={INK} opacity={0.55} />
        ))}
      </g>
      <g opacity={plateOp} transform={`translate(${plateSlide},0)`}>
        <ellipse cx={1290} cy={618} rx={62} ry={15} fill={GROUND} stroke={INK} strokeWidth={5} />
        <g opacity={food}>
          <rect x={1268} y={598} width={44} height={16} fill={ACCENT} />
          <rect x={1276} y={588} width={28} height={12} fill={INK} />
        </g>
      </g>
      <g opacity={coinOp}>
        {[0, 1, 2].map((i) => {
          const r = MOTION.pop(-40, 0, C.Leave + 0.25 + i * 0.12, C.Leave + 0.95 + i * 0.12)(T);
          return <rect key={i} x={1400 + i * 34} y={r + 601 + i * 0} width={26} height={26} fill={ACCENT} />;
        })}
      </g>
    </g>
  );
}

/* ---------- sprite-sheet contact grid ---------- */

const SHEET = [
  { id: '01', label: 'IDLE', pose: (T) => idlePose(T) },
  { id: '02', label: 'WALK', pose: (T) => walkPose(T * 1.35, 1) },
  { id: '03', label: 'SIT DOWN', pose: (T) => blend(idlePose(T), SIT, clamp01(0.5 + 0.5 * Math.sin(T * 1.6))) },
  { id: '04', label: 'READ MENU', pose: () => SIT_MENU },
  { id: '05', label: 'HAIL', pose: (T) => sitHail(T) },
  { id: '06', label: 'IMPATIENT', pose: (T) => sitWait(T) },
  { id: '07', label: 'EAT', pose: (T) => sitEat(T) },
  { id: '08', label: 'EXIT', pose: (T) => walkPose(T * 1.7, 1.15) },
];

function Sheet({ T, C, opacity, showRig, variant }) {
  const x0 = 120, y0 = 176, cw = 420, ch = 388;
  return (
    <g opacity={opacity}>
      <rect x={x0} y={y0} width={cw * 4} height={4} fill={INK} />
      <rect x={x0} y={y0 + ch} width={cw * 4} height={2} fill={INK} />
      <rect x={x0} y={y0 + ch * 2} width={cw * 4} height={4} fill={INK} />
      {[1, 2, 3].map((i) => (
        <rect key={i} x={x0 + cw * i} y={y0} width={2} height={ch * 2} fill={INK} opacity={0.35} />
      ))}
      {SHEET.map((cell, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const at = C.Sheet - 0.15 + i * 0.12;
        const op = MOTION.enter(0, 1, at, at + 0.4)(T);
        const rise = MOTION.pop(46, 0, at, at + 0.7)(T);
        const cx = x0 + col * cw, cy = y0 + row * ch;
        return (
          <g key={cell.id} opacity={op} transform={`translate(0,${rise})`}>
            <text x={cx + 22} y={cy + 42} fill={ACCENT} fontFamily={HEAD_F} fontWeight={800} fontSize={22} letterSpacing="0.14em">{cell.id}</text>
            <text x={cx + 68} y={cy + 42} fill={INK} fontFamily={HEAD_F} fontWeight={800} fontSize={22} letterSpacing="0.14em">{cell.label}</text>
            <rect x={cx + 22} y={cy + ch - 46} width={cw - 66} height={2} fill={INK} opacity={0.35} />
            <Guest pose={cell.pose(T)} x={cx + cw * 0.45} y={cy + ch - 46} scale={0.82} showRig={showRig} variant={variant} />
          </g>
        );
      })}
    </g>
  );
}

/* ---------- HUD ---------- */

const Kicker = ({ children, style }) => (
  <div style={Object.assign({
    font: `800 20px ${HEAD_F}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: INK,
  }, style)}>{children}</div>
);

function Bar({ label, value, danger }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
        <Kicker style={{ fontSize: 17 }}>{label}</Kicker>
        <div style={{ font: `800 17px ${HEAD_F}`, color: danger ? ACCENT : INK, letterSpacing: '0.08em' }}>
          {Math.round(value * 100)}%
        </div>
      </div>
      <div style={{ width: 300, height: 20, border: `3px solid ${INK}`, padding: 3, display: 'flex' }}>
        <div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: danger ? ACCENT : INK }} />
      </div>
    </div>
  );
}

const SECTIONS = ['Title', 'Arrive', 'Seat', 'Order', 'Wait', 'Serve', 'Leave', 'Sheet'];
function sectionIndex(T, C) {
  let n = 1;
  SECTIONS.forEach((name, i) => { if (T >= C[name] - 0.001) n = i + 1; });
  return n;
}

/* ---------- the piece ---------- */

function Piece({ tw }) {
  const { T, CUES: C, authoredTotal: TOTAL } = useComposition();
  const showRig = tw.showRig, showHud = tw.showHud, variant = tw.variant;

  const gx = MOTION.drift([
    [0, 262], [C.Arrive + 0.35, 262], [C.Seat - 0.15, 1010],
    [C.Leave + 1.0, 1010], [C.Sheet - 0.2, 2620],
  ]);
  const speed = Math.abs(gx(T + 0.05) - gx(T - 0.05)) / 0.1;
  const walkAmt = clamp01(speed / 150);
  const ph = gx(T) / 150;

  const sitAmt = win(T, C.Seat + 0.05, C.Leave + 0.45, 0.75);
  let pose = blend(idlePose(T), walkPose(ph, Math.min(1.25, 0.85 + speed / 400)), walkAmt);
  pose = blend(pose, SIT, sitAmt);
  pose = blend(pose, SIT_MENU, win(T, C.Order + 0.2, C.Order + 2.3, 0.5));
  pose = blend(pose, sitHail(T), win(T, C.Order + 2.7, C.Order + 4.0, 0.35));
  pose = blend(pose, sitWait(T), win(T, C.Wait + 0.2, C.Serve + 0.1, 0.6));
  pose = blend(pose, sitEat(T), win(T, C.Serve + 1.1, C.Leave - 0.3, 0.55));

  // camera
  const camX = MOTION.drift([
    [0, 900], [C.Arrive, 900], [C.Seat - 0.2, 1120], [C.Order, 1150],
    [C.Wait, 1170], [C.Serve, 1230], [C.Leave, 1200], [C.Sheet - 0.3, 1420], [TOTAL - 0.6, 900],
  ])(T);
  const camY = MOTION.drift([
    [0, 545], [C.Arrive, 555], [C.Seat, 600], [C.Order, 585],
    [C.Wait, 585], [C.Serve, 610], [C.Leave, 600], [C.Sheet - 0.3, 560], [TOTAL - 0.6, 545],
  ])(T);
  const camZ = MOTION.drift([
    [0, 0.98], [C.Arrive + 0.4, 1.02], [C.Seat + 0.6, 1.3], [C.Order + 1.2, 1.5],
    [C.Wait + 1.5, 1.62], [C.Serve + 1.2, 1.42], [C.Leave + 0.6, 1.05], [C.Sheet - 0.3, 1.0], [TOTAL - 0.6, 0.98],
  ])(T);

  const roomOp = MOTION.drift([[0, 1], [C.Sheet - 0.55, 1], [C.Sheet - 0.1, 0], [TOTAL - 0.95, 0], [TOTAL - 0.5, 1]])(T);
  const sheetOp = MOTION.drift([[0, 0], [C.Sheet - 0.55, 0], [C.Sheet - 0.1, 1], [TOTAL - 0.95, 1], [TOTAL - 0.5, 0]])(T);

  const plateX = MOTION.drift([[0, 0], [2.15, 0], [3.05, -1000], [TOTAL - 0.75, -1000], [TOTAL, 0]])(T);

  const patience = MOTION.drift([
    [0, 1], [C.Order, 1], [C.Order + 0.8, 0.9], [C.Serve, 0.17],
    [C.Serve + 1.4, 0.52], [C.Leave, 0.9],
  ])(T);
  const satisfaction = MOTION.drift([[0, 0], [C.Serve, 0], [C.Serve + 0.6, 0.06], [C.Leave, 0.88], [TOTAL, 0.94]])(T);
  const hudOp = win(T, C.Order - 0.5, C.Sheet - 0.7, 0.4);
  const tipOp = win(T, C.Leave + 0.5, C.Sheet - 0.6, 0.25);
  const tipRise = MOTION.pop(28, 0, C.Leave + 0.5, C.Leave + 1.2)(T);

  return (
    <div style={{ position: 'absolute', inset: 0, background: GROUND, overflow: 'hidden' }}
         data-screen-label={`GUEST REEL t=${T.toFixed(1)}s`}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" style={{ display: 'block' }}>
        <g transform={`translate(${960 - camX * camZ},${540 - camY * camZ}) scale(${camZ})`}>
          <g opacity={roomOp}>
            <Room T={T} C={C} opacity={1} />
            <Props T={T} C={C} />
            <Guest pose={pose} x={gx(T)} y={FLOOR} scale={1.6} showRig={showRig} variant={variant} />
          </g>
        </g>
        <Sheet T={T} C={C} opacity={sheetOp} showRig={showRig} variant={variant} />
      </svg>

      {/* frame furniture */}
      <div style={{ position: 'absolute', left: 80, right: 80, top: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 12, borderBottom: `4px solid ${INK}` }}>
        <Kicker>Guest_01 — Restaurant patron</Kicker>
        <Kicker style={{ color: ACCENT }}>{`Side view · T+${T.toFixed(1)}s`}</Kicker>
      </div>
      <div style={{ position: 'absolute', left: 80, right: 80, bottom: 56, height: 4, background: INK }} />
      <div style={{ position: 'absolute', right: 80, bottom: 74, font: `800 20px ${HEAD_F}`, letterSpacing: '0.16em', color: INK }}>
        {`${String(sectionIndex(T, C)).padStart(2, '0')} / 08`}
      </div>

      {showHud && (
        <div style={{ position: 'absolute', right: 80, top: 150, display: 'flex', flexDirection: 'column', gap: 26, opacity: hudOp, alignItems: 'flex-start' }}>
          <Bar label="Patience" value={patience} danger={patience < 0.36} />
          {satisfaction > 0.02 && <Bar label="Satisfaction" value={satisfaction} />}
        </div>
      )}
      <div style={{ position: 'absolute', right: 80, top: 400, opacity: tipOp, transform: `translateY(${tipRise}px)`, font: `800 62px ${HEAD_F}`, color: ACCENT, letterSpacing: '-0.02em' }}>
        + TIP $6
      </div>

      <Captions
        style={{ left: 84, right: 'auto', bottom: 74, textAlign: 'left', font: `800 30px ${HEAD_F}`, color: INK, letterSpacing: '0.14em', textTransform: 'uppercase', textShadow: 'none' }}
        items={[
          { at: 0.1, text: 'Idle · doorway', until: 2.1 },
          { at: 3.35, text: 'Walk cycle' },
          { at: 8.15, text: 'Sit down · 0.7s transition' },
          { at: 12.25, text: 'Read menu' },
          { at: 14.8, text: 'Hail waiter' },
          { at: 16.75, text: 'Impatient · patience drains' },
          { at: 21.6, text: 'Eat loop' },
          { at: 25.9, text: 'Pay · tip' },
          { at: 27.4, text: 'Exit walk', until: 29.7 },
          { at: 30.3, text: '8 states · sprite sheet', until: 34.1 },
        ]}
      />

      {/* title plate — also the loop seam */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 880, background: ACCENT, transform: `translateX(${plateX}px)`, padding: '0 72px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
        <div style={{ font: `800 200px ${HEAD_F}`, color: GROUND, letterSpacing: '-0.04em', lineHeight: 0.86 }}>GUEST</div>
        <div style={{ height: 5, background: GROUND, width: 300 }} />
        <div style={{ font: `800 26px ${HEAD_F}`, color: GROUND, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Animation set · 8 loops</div>
      </div>
    </div>
  );
}

function GuestReel() {
  const [tw, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GROUND }}>
      <CompositionStage width={1920} height={1080} bg={GROUND}
                        scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        <Piece tw={tw} />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Reel" />
        <TweakToggle label="Game HUD" value={tw.showHud} onChange={(v) => setTweak('showHud', v)} />
        <TweakToggle label="Rig overlay" value={tw.showRig} onChange={(v) => setTweak('showRig', v)} />
        <TweakRadio label="Guest" value={tw.variant} options={['Scarf', 'Cap', 'Bun']} onChange={(v) => setTweak('variant', v)} />
        <TweakSection label="Editing" />
        <TweakToggle label="Motion editor" value={tw.motionEditor} onChange={(v) => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </div>
  );
}

window.GuestReel = GuestReel;
